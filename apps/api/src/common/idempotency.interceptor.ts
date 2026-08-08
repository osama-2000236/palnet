import { Prisma } from "@baydar/db";
import { ErrorCode } from "@baydar/shared";
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, from, of, switchMap } from "rxjs";

import { PrismaService } from "../modules/prisma/prisma.service";

import { DomainException } from "./domain-exception";

/**
 * Replay protection for the writes a client may retry.
 *
 * A member on 2G sends a post. The request takes 40 seconds, the socket dies at
 * 38, and the outbox retries — so the server sees the same write twice with no
 * way to tell it from two deliberate posts. `Message` already solves this with
 * `@@unique([roomId, authorId, clientMessageId])`, a natural key it happens to
 * have. Posts, applications and work-proof confirmations have none.
 *
 * The header is `Idempotency-Key` and it is OPTIONAL: a client that does not
 * retry does not need one, and requiring it would break every existing caller
 * for a guarantee they never asked for.
 *
 * What is stored is the whole response, not just the key. Answering a replay
 * with 409 is technically correct and useless — the client is asking "did my
 * post save?", and a conflict does not answer that while the saved post does.
 */
export const IDEMPOTENT_KEY = "baydar:idempotent";

/** Mark a write as replay-safe. Does nothing unless the client sends a key. */
export const Idempotent = (): MethodDecorator => SetMetadata(IDEMPOTENT_KEY, true);

const HEADER = "idempotency-key";
const TTL_MS = 48 * 60 * 60 * 1000;
/** Long enough for a UUID, short enough that the column is not a payload. */
const MAX_KEY_LENGTH = 200;

interface StoredResponse {
  route: string;
  statusCode: number;
  responseBody: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handled) return next.handle();

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method: string;
      route?: { path?: string };
      url: string;
      user?: { id?: string };
    }>();

    const raw = request.headers[HEADER];
    const key = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    const userId = request.user?.id;
    if (!key || !userId) return next.handle();

    if (key.length > MAX_KEY_LENGTH) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Idempotency-Key is too long.",
        HttpStatus.BAD_REQUEST,
        { maxLength: MAX_KEY_LENGTH },
      );
    }

    // The route pattern, not the URL: `/jobs/:id/apply` rather than
    // `/jobs/abc/apply`, so a key is scoped to the operation and not to one
    // job. The raw URL is the fallback when Express has not attached a route.
    const route = `${request.method} ${request.route?.path ?? request.url}`;

    const response = context.switchToHttp().getResponse<{ status?(code: number): unknown }>();

    return from(this.replay(userId, key, route)).pipe(
      switchMap((stored) => {
        if (stored) {
          // Restore the original status too, not just the body. A create that
          // answered 201 the first time must answer 201 on the replay, or a
          // client that branches on it treats its own retry as something new.
          response.status?.(stored.statusCode);
          return of(stored.responseBody);
        }
        return next
          .handle()
          .pipe(
            switchMap((body) =>
              from(this.remember(userId, key, route, context, body)).pipe(
                switchMap(() => of(body)),
              ),
            ),
          );
      }),
    );
  }

  /** The stored response for this key, or null when it is the first use. */
  private async replay(userId: string, key: string, route: string): Promise<StoredResponse | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!record) return null;

    // Expired but not yet swept. Treated as absent so the write runs again,
    // which is the honest reading: past the TTL nobody promised a replay.
    if (record.expiresAt.getTime() <= Date.now()) return null;

    if (record.route !== route) {
      // A key reused across operations is a client bug, and answering it with
      // the other route's body would hand back data for a different request.
      throw new DomainException(
        ErrorCode.CONFLICT,
        "This Idempotency-Key was already used for a different request.",
        HttpStatus.CONFLICT,
        { usedFor: record.route },
      );
    }

    return {
      route: record.route,
      statusCode: record.statusCode,
      responseBody: record.responseBody,
    };
  }

  /**
   * Store the response so the next replay returns it.
   *
   * Only successful responses are stored. A 4xx is a write that did not happen,
   * and pinning it for 48 hours would mean a client that fixed its request
   * still got the old error back.
   *
   * A unique-constraint violation here is two retries racing, not an error:
   * one of them won, the row exists, and both callers already have a correct
   * response in hand.
   */
  private async remember(
    userId: string,
    key: string,
    route: string,
    context: ExecutionContext,
    body: unknown,
  ): Promise<void> {
    const statusCode =
      context.switchToHttp().getResponse<{ statusCode?: number }>().statusCode ?? 200;
    if (statusCode >= 300) return;

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          userId,
          key,
          route,
          statusCode,
          responseBody: (body ?? null) as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }
  }
}
