import {
  ErrorCode,
  NotificationType,
  type ConnectionListItem,
  type PersonSuggestion,
  type RespondConnectionBody,
  type SendConnectionBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type Direction = "OUTGOING" | "INCOMING";
type ConnStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "BLOCKED";

interface ConnectionWithUsers {
  id: string;
  requesterId: string;
  receiverId: string;
  status: ConnStatus;
  message: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  requester: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    } | null;
  };
  receiver: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ────────────────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────────────────

  async send(requesterId: string, body: SendConnectionBody) {
    if (body.receiverId === requesterId) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Cannot connect to yourself.",
        400,
      );
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: body.receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Recipient not found.",
        404,
      );
    }

    const existing = await this.findExistingBetween(
      requesterId,
      body.receiverId,
    );
    if (existing) {
      // Allow re-send only if the prior row is WITHDRAWN or DECLINED.
      if (
        existing.status === "PENDING" ||
        existing.status === "ACCEPTED" ||
        existing.status === "BLOCKED"
      ) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "A connection already exists between these users.",
          409,
        );
      }
      const updated = await this.prisma.connection.update({
        where: { id: existing.id },
        data: {
          requesterId,
          receiverId: body.receiverId,
          status: "PENDING",
          message: body.message ?? null,
          respondedAt: null,
        },
      });
      void this.notifications.notify({
        type: NotificationType.CONNECTION_REQUEST,
        recipientId: body.receiverId,
        actorId: requesterId,
        connectionId: updated.id,
        dedupe: true,
      });
      return updated;
    }

    const created = await this.prisma.connection.create({
      data: {
        requesterId,
        receiverId: body.receiverId,
        status: "PENDING",
        message: body.message ?? null,
      },
    });
    void this.notifications.notify({
      type: NotificationType.CONNECTION_REQUEST,
      recipientId: body.receiverId,
      actorId: requesterId,
      connectionId: created.id,
    });
    return created;
  }

  async respond(
    viewerId: string,
    connectionId: string,
    body: RespondConnectionBody,
  ) {
    const row = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!row) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Connection not found.",
        404,
      );
    }
    if (row.receiverId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only the recipient can respond to this request.",
        403,
      );
    }
    if (row.status !== "PENDING") {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Connection is not pending.",
        409,
      );
    }
    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: body.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });
    if (body.action === "ACCEPT") {
      void this.notifications.notify({
        type: NotificationType.CONNECTION_ACCEPTED,
        recipientId: row.requesterId,
        actorId: viewerId,
        connectionId: row.id,
      });
    }
    return updated;
  }

  async withdraw(viewerId: string, connectionId: string) {
    const row = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!row) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Connection not found.",
        404,
      );
    }
    if (row.requesterId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only the sender can withdraw this request.",
        403,
      );
    }
    if (row.status !== "PENDING") {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Connection is not pending.",
        409,
      );
    }
    return this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: "WITHDRAWN", respondedAt: new Date() },
    });
  }

  async remove(viewerId: string, connectionId: string) {
    const row = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!row) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Connection not found.",
        404,
      );
    }
    if (row.requesterId !== viewerId && row.receiverId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You are not a party to this connection.",
        403,
      );
    }
    if (row.status !== "ACCEPTED") {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Only accepted connections can be removed.",
        409,
      );
    }
    await this.prisma.connection.delete({ where: { id: connectionId } });
  }

  // ────────────────────────────────────────────────────────────────────
  // Reads
  // ────────────────────────────────────────────────────────────────────

  async listMine(
    viewerId: string,
    filter: "ACCEPTED" | "INCOMING" | "OUTGOING",
  ): Promise<ConnectionListItem[]> {
    const where =
      filter === "ACCEPTED"
        ? {
            status: "ACCEPTED" as const,
            OR: [{ requesterId: viewerId }, { receiverId: viewerId }],
          }
        : filter === "INCOMING"
          ? { status: "PENDING" as const, receiverId: viewerId }
          : { status: "PENDING" as const, requesterId: viewerId };

    const rows = (await this.prisma.connection.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        requester: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                headline: true,
                avatarUrl: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                headline: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      take: 100,
    })) as unknown as ConnectionWithUsers[];

    return rows.map((row) => this.toListItem(row, viewerId));
  }

  /**
   * "People you may know" — pragmatic v1 suggestion feed.
   *
   * Rule of thumb: return profiles the viewer has **no existing connection row
   * with** (any status — pending, accepted, withdrawn, declined, blocked).
   * That keeps the list clean without a dedicated "dismissed" table. We order
   * by most recent profile activity so new joiners surface first.
   *
   * A real recommendation pass (shared-connection counts, location match,
   * co-workers) lives behind this same endpoint — upgrade the query without
   * changing the wire shape.
   */
  async suggestions(
    viewerId: string,
    limit: number,
  ): Promise<PersonSuggestion[]> {
    // 1. All user ids the viewer already has *any* connection row with.
    const existing = await this.prisma.connection.findMany({
      where: {
        OR: [{ requesterId: viewerId }, { receiverId: viewerId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    const excluded = new Set<string>([viewerId]);
    for (const row of existing) {
      excluded.add(row.requesterId);
      excluded.add(row.receiverId);
    }

    // 2. Pull candidate profiles — must have completed onboarding (exists on
    //    Profile), user still active, deletedAt null.
    const rows = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: Array.from(excluded) },
        user: { isActive: true, deletedAt: null },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: Math.max(1, Math.min(limit, 20)),
      select: {
        userId: true,
        handle: true,
        firstName: true,
        lastName: true,
        headline: true,
        avatarUrl: true,
      },
    });

    return rows.map((p) => ({
      user: {
        userId: p.userId,
        handle: p.handle,
        firstName: p.firstName,
        lastName: p.lastName,
        headline: p.headline ?? null,
        avatarUrl: p.avatarUrl ?? null,
      },
      reasonCode: "SUGGESTED" as const,
      reasonCount: null,
    }));
  }

  async counts(viewerId: string) {
    const [accepted, incoming, outgoing] = await Promise.all([
      this.prisma.connection.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: viewerId }, { receiverId: viewerId }],
        },
      }),
      this.prisma.connection.count({
        where: { status: "PENDING", receiverId: viewerId },
      }),
      this.prisma.connection.count({
        where: { status: "PENDING", requesterId: viewerId },
      }),
    ]);
    return { accepted, incoming, outgoing };
  }

  async findExistingBetween(a: string, b: string) {
    return this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: a, receiverId: b },
          { requesterId: b, receiverId: a },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Mapping
  // ────────────────────────────────────────────────────────────────────

  private toListItem(
    row: ConnectionWithUsers,
    viewerId: string,
  ): ConnectionListItem {
    const isOutgoing = row.requesterId === viewerId;
    const other = isOutgoing ? row.receiver : row.requester;
    const direction: Direction = isOutgoing ? "OUTGOING" : "INCOMING";
    const profile = other.profile;
    return {
      connectionId: row.id,
      status: row.status,
      direction,
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
      message: row.message,
      user: {
        userId: other.id,
        handle: profile?.handle ?? other.id,
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        headline: profile?.headline ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      },
    };
  }
}
