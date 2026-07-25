import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";

import { DomainException } from "../../common/domain-exception";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

import { AccountService } from "./account.service";

type PrismaStub = {
  user: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  profile: { findUnique: jest.Mock; update: jest.Mock };
  refreshToken: { updateMany: jest.Mock };
  post: { findMany: jest.Mock };
  comment: { findMany: jest.Mock };
  reaction: { findMany: jest.Mock };
  repost: { findMany: jest.Mock };
  chatRoomMember: { findMany: jest.Mock };
  message: { findMany: jest.Mock };
  notification: { findMany: jest.Mock };
  blockedUser: { findMany: jest.Mock };
  report: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  const prisma: PrismaStub = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    profile: { findUnique: jest.fn(), update: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    post: { findMany: jest.fn() },
    comment: { findMany: jest.fn() },
    reaction: { findMany: jest.fn() },
    repost: { findMany: jest.fn() },
    chatRoomMember: { findMany: jest.fn() },
    message: { findMany: jest.fn() },
    notification: { findMany: jest.fn() },
    blockedUser: { findMany: jest.fn() },
    report: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return arg({ user: prisma.user, profile: prisma.profile, refreshToken: prisma.refreshToken });
    }
    return Promise.all(arg as Array<Promise<unknown>>);
  });
  return prisma;
}

describe("AccountService", () => {
  let prisma: PrismaStub;
  let service: AccountService;
  const auth = { issueSession: jest.fn() };

  beforeEach(async () => {
    prisma = buildPrisma();
    auth.issueSession.mockClear();
    auth.issueSession.mockResolvedValue({ user: { id: "u1" }, tokens: {} });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    service = moduleRef.get(AccountService);
  });

  it("soft-deletes, snapshots PII, anonymizes profile, and revokes refresh tokens", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "person@example.com",
      pendingDeletionSnapshot: null,
      profile: {
        handle: "person",
        firstName: "Person",
        lastName: "One",
        headline: "Engineer",
        avatarUrl: "https://cdn.example/a.png",
      },
    });
    prisma.user.update.mockResolvedValue({});
    prisma.profile.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({});

    await service.delete("u1");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({
        email: "deleted_u1@deleted.local",
        deletedAt: expect.any(Date),
        pendingDeletionSnapshot: {
          email: "person@example.com",
          profile: {
            handle: "person",
            firstName: "Person",
            lastName: "One",
            headline: "Engineer",
            avatarUrl: "https://cdn.example/a.png",
          },
        },
      }),
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: {
        handle: "deleted_u1",
        firstName: "",
        lastName: "",
        headline: null,
        avatarUrl: null,
      },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("restores fields within grace and issues a new session", async () => {
    const passwordHash = await bcrypt.hash("Password1", 4);
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "deleted_u1@deleted.local",
      passwordHash,
      role: "USER",
      locale: "ar-PS",
      deletedAt: new Date(),
      profile: { id: "p1" },
      pendingDeletionSnapshot: {
        email: "person@example.com",
        profile: {
          handle: "person",
          firstName: "Person",
          lastName: "One",
          headline: "Engineer",
          avatarUrl: null,
        },
      },
    });
    prisma.user.update.mockResolvedValue({
      id: "u1",
      email: "person@example.com",
      role: "USER",
      locale: "ar-PS",
    });
    prisma.profile.update.mockResolvedValue({});

    await service.restore({
      email: "person@example.com",
      password: "Password1",
      deviceId: "device-1",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        email: "person@example.com",
        deletedAt: null,
        pendingDeletionSnapshot: null,
      },
    });
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: {
        handle: "person",
        firstName: "Person",
        lastName: "One",
        headline: "Engineer",
        avatarUrl: null,
      },
    });
    expect(auth.issueSession).toHaveBeenCalledWith(
      { id: "u1", email: "person@example.com", role: "USER", locale: "ar-PS" },
      "device-1",
    );
  });

  // docs/api-contract.md promises the envelope carries "profile, posts,
  // comments, reactions, reposts, chat-room memberships, messages,
  // notifications, blocks, and reports". Only the controller's envelope shape
  // was ever asserted, never what the service actually reads -- which is how
  // the export came to hand the user every block filed *against* them.
  it("exports every documented section and only outbound blocks", async () => {
    for (const model of [
      "post",
      "comment",
      "reaction",
      "repost",
      "chatRoomMember",
      "message",
      "notification",
      "blockedUser",
      "report",
    ] as const) {
      prisma[model].findMany.mockResolvedValue([]);
    }
    prisma.profile.findUnique.mockResolvedValue({ handle: "me" });

    const envelope = await service.export("u1");

    expect(Object.keys(envelope).sort()).toEqual(
      [
        "blockedUsers",
        "chatRoomMembers",
        "comments",
        "exportedAt",
        "messages",
        "notifications",
        "posts",
        "profile",
        "reactions",
        "reports",
        "reposts",
        "userId",
      ].sort(),
    );
    expect(prisma.blockedUser.findMany).toHaveBeenCalledWith({ where: { blockerId: "u1" } });
  });

  it("rejects restore after the grace window", async () => {
    const passwordHash = await bcrypt.hash("Password1", 4);
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      passwordHash,
      deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      pendingDeletionSnapshot: { email: "person@example.com", profile: null },
    });

    const call = service.restore({
      email: "person@example.com",
      password: "Password1",
      deviceId: "device-1",
    });

    await expect(call).rejects.toBeInstanceOf(DomainException);
    await expect(call).rejects.toMatchObject({ code: ErrorCode.ACCOUNT_DELETED });
    expect(auth.issueSession).not.toHaveBeenCalled();
  });
});
