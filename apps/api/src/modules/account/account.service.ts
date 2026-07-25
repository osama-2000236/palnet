import {
  type AccountExportEnvelope,
  type AuthSession,
  ErrorCode,
  type RestoreAccountBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

import { isWithinRestoreGrace } from "./account-retention";

type PendingDeletionSnapshot = {
  email: string;
  profile: {
    handle: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    avatarUrl: string | null;
  } | null;
};

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async delete(userId: string): Promise<void> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }

    const userWithSnapshot = user as typeof user & {
      pendingDeletionSnapshot?: PendingDeletionSnapshot | null;
    };
    const snapshot: PendingDeletionSnapshot = userWithSnapshot.pendingDeletionSnapshot ?? {
      email: user.email,
      profile: user.profile
        ? {
            handle: user.profile.handle,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            headline: user.profile.headline,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
    };

    await this.prisma.$transaction(async (tx) => {
      await (tx.user.update as unknown as (args: unknown) => Promise<unknown>)({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.local`,
          deletedAt: now,
          pendingDeletionSnapshot: snapshot,
        },
      });
      if (user.profile) {
        await tx.profile.update({
          where: { userId },
          data: {
            handle: `deleted_${userId}`,
            firstName: "",
            lastName: "",
            headline: null,
            avatarUrl: null,
          },
        });
      }
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  async export(userId: string): Promise<AccountExportEnvelope> {
    const [
      profile,
      posts,
      comments,
      reactions,
      reposts,
      chatRoomMembers,
      messages,
      notifications,
      blockedUsers,
      reports,
    ] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.post.findMany({ where: { authorId: userId } }),
      this.prisma.comment.findMany({ where: { authorId: userId } }),
      this.prisma.reaction.findMany({ where: { userId } }),
      this.prisma.repost.findMany({ where: { userId } }),
      this.prisma.chatRoomMember.findMany({ where: { userId } }),
      this.prisma.message.findMany({ where: { authorId: userId } }),
      this.prisma.notification.findMany({
        where: { OR: [{ recipientId: userId }, { actorId: userId }] },
      }),
      // Outbound blocks only. Including rows where this user is the *blocked*
      // party would hand them the identity of everyone who blocked them, which
      // is the one thing blocking has to keep private -- every other surface
      // (feed, search, messaging, suggestions) hides the block silently and
      // symmetrically. "Who blocked me" is the blocker's data, not theirs.
      this.prisma.blockedUser.findMany({ where: { blockerId: userId } }),
      this.prisma.report.findMany({ where: { reporterId: userId } }),
    ]);

    return JSON.parse(
      JSON.stringify({
        exportedAt: new Date().toISOString(),
        userId,
        profile,
        posts,
        comments,
        reactions,
        reposts,
        chatRoomMembers,
        messages,
        notifications,
        blockedUsers,
        reports,
      }),
    ) as AccountExportEnvelope;
  }

  async restore(body: RestoreAccountBody): Promise<AuthSession> {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: { not: null },
        pendingDeletionSnapshot: { path: ["email"], equals: body.email },
      } as never,
      include: { profile: true },
    });
    if (!user?.deletedAt) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Deleted account not found.", 404);
    }
    if (!isWithinRestoreGrace(user.deletedAt, new Date())) {
      throw new DomainException(
        ErrorCode.ACCOUNT_DELETED,
        "Account deletion grace period has expired.",
        403,
      );
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      throw new DomainException(ErrorCode.AUTH_UNAUTHORIZED, "Invalid email or password.", 401);
    }

    const snapshot =
      (user as typeof user & { pendingDeletionSnapshot?: PendingDeletionSnapshot | null })
        .pendingDeletionSnapshot ?? null;
    if (!snapshot) {
      throw new DomainException(ErrorCode.CONFLICT, "Account restore snapshot is missing.", 409);
    }

    const restored = await this.prisma.$transaction(async (tx) => {
      const nextUser = await (
        tx.user.update as unknown as (args: unknown) => Promise<{
          id: string;
          email: string;
          role: "USER" | "COMPANY_ADMIN" | "MODERATOR" | "ADMIN";
          locale: string;
        }>
      )({
        where: { id: user.id },
        data: {
          email: snapshot.email,
          deletedAt: null,
          pendingDeletionSnapshot: null,
        },
      });
      if (snapshot.profile && user.profile) {
        await tx.profile.update({
          where: { userId: user.id },
          data: snapshot.profile,
        });
      }
      return nextUser;
    });

    return this.auth.issueSession(restored, body.deviceId);
  }
}
