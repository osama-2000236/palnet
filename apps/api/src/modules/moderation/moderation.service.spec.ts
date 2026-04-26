import { ReportReason } from "@baydar/shared";

import type { PrismaService } from "../prisma/prisma.service";

import { ModerationService } from "./moderation.service";

type PrismaStub = {
  report: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  user: { findUnique: jest.Mock };
  post: { findFirst: jest.Mock };
  comment: { findFirst: jest.Mock };
  message: { findFirst: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    post: { findFirst: jest.fn() },
    comment: { findFirst: jest.fn() },
    message: { findFirst: jest.fn() },
  };
}

const reporter = {
  id: "clvreporter0000000000000001",
  profile: {
    handle: "reporter",
    firstName: "Rana",
    lastName: "Reporter",
    avatarUrl: null,
  },
};

const resolver = {
  id: "clvresolver0000000000000001",
  profile: {
    handle: "mod",
    firstName: "Mona",
    lastName: "Mod",
    avatarUrl: null,
  },
};

function reportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "clvreport00000000000000001",
    reporter,
    reason: ReportReason.SPAM,
    details: "spam link",
    targetUserId: null,
    targetPostId: "clvpost000000000000000001",
    targetCommentId: null,
    targetMessageId: null,
    resolvedAt: null,
    resolvedNote: null,
    resolvedBy: null,
    createdAt: new Date("2026-04-24T10:00:00Z"),
    ...overrides,
  };
}

function postPreview() {
  return {
    id: "clvpost000000000000000001",
    body: "A reported post body",
    author: {
      id: "clvauthor0000000000000001",
      profile: {
        handle: "author",
        firstName: "Ali",
        lastName: "Author",
        avatarUrl: null,
      },
    },
  };
}

describe("ModerationService admin triage", () => {
  let prisma: PrismaStub;
  let service: ModerationService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new ModerationService(prisma as unknown as PrismaService);
  });

  it("lists open reports with reason and target filters", async () => {
    prisma.report.findMany.mockResolvedValue([reportRow()]);
    prisma.post.findFirst.mockResolvedValue(postPreview());

    const out = await service.listReports({
      status: "open",
      reason: ReportReason.SPAM,
      targetKind: "POST",
      after: null,
      limit: 20,
    });

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { resolvedAt: null },
            { reason: ReportReason.SPAM },
            { targetPostId: { not: null } },
          ],
        },
      }),
    );
    expect(out.data[0]).toMatchObject({
      reason: ReportReason.SPAM,
      targetKind: "POST",
      target: {
        state: "available",
        excerpt: "A reported post body",
        author: { handle: "author" },
      },
    });
  });

  it("keeps reports visible when the target is missing", async () => {
    prisma.report.findMany.mockResolvedValue([reportRow()]);
    prisma.post.findFirst.mockResolvedValue(null);

    const out = await service.listReports({
      status: "all",
      after: null,
      limit: 20,
    });

    expect(out.data[0]?.target).toMatchObject({
      state: "unavailable",
      kind: "POST",
      label: "unavailable",
    });
  });

  it("applies audit filters for reporter, resolver, and date ranges", async () => {
    prisma.report.findMany.mockResolvedValue([reportRow({ resolvedBy: resolver })]);
    prisma.post.findFirst.mockResolvedValue(postPreview());

    await service.listReports({
      status: "all",
      reporter: "reporter",
      resolver: "mod",
      createdFrom: "2026-04-01T00:00:00.000Z",
      createdTo: "2026-04-30T23:59:59.999Z",
      resolvedFrom: "2026-04-20T00:00:00.000Z",
      resolvedTo: "2026-04-24T23:59:59.999Z",
      after: null,
      limit: 20,
    });

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            { reporter: { is: expect.objectContaining({ OR: expect.any(Array) }) } },
            { resolvedBy: { is: expect.objectContaining({ OR: expect.any(Array) }) } },
            {
              createdAt: {
                gte: new Date("2026-04-01T00:00:00.000Z"),
                lte: new Date("2026-04-30T23:59:59.999Z"),
              },
            },
            {
              resolvedAt: {
                gte: new Date("2026-04-20T00:00:00.000Z"),
                lte: new Date("2026-04-24T23:59:59.999Z"),
              },
            },
          ]),
        },
      }),
    );
  });

  it("exports filtered reports as CSV", async () => {
    prisma.report.findMany.mockResolvedValue([reportRow()]);
    prisma.post.findFirst.mockResolvedValue(postPreview());

    const csv = await service.exportReportsCsv({
      status: "open",
      reporter: "reporter",
      limit: 100,
    });

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { resolvedAt: null },
            { reporter: { is: expect.objectContaining({ OR: expect.any(Array) }) } },
          ]),
        }),
      }),
    );
    expect(csv).toContain("id,status,reason,targetKind,targetId");
    expect(csv).toContain('"clvreport00000000000000001","open","SPAM"');
  });

  it("stamps resolver audit fields when resolving", async () => {
    prisma.report.findUnique
      .mockResolvedValueOnce({ id: "clvreport00000000000000001", resolvedAt: null })
      .mockResolvedValueOnce(
        reportRow({
          resolvedAt: new Date("2026-04-24T11:00:00Z"),
          resolvedNote: "handled",
          resolvedBy: resolver,
        }),
      );
    prisma.report.update.mockResolvedValue({ id: "clvreport00000000000000001" });
    prisma.post.findFirst.mockResolvedValue(postPreview());

    const out = await service.resolveReport(
      "clvreport00000000000000001",
      "clvresolver0000000000000001",
      { note: "handled" },
    );

    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clvreport00000000000000001" },
        data: expect.objectContaining({
          resolvedById: "clvresolver0000000000000001",
          resolvedNote: "handled",
        }),
      }),
    );
    expect(out.resolvedBy).toMatchObject({ handle: "mod" });
    expect(out.resolvedAt).toBe("2026-04-24T11:00:00.000Z");
  });

  it("is idempotent for already-resolved reports", async () => {
    prisma.report.findUnique
      .mockResolvedValueOnce({
        id: "clvreport00000000000000001",
        resolvedAt: new Date("2026-04-24T11:00:00Z"),
      })
      .mockResolvedValueOnce(
        reportRow({
          resolvedAt: new Date("2026-04-24T11:00:00Z"),
          resolvedBy: resolver,
        }),
      );
    prisma.post.findFirst.mockResolvedValue(postPreview());

    await service.resolveReport("clvreport00000000000000001", resolver.id, {
      note: "again",
    });

    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});
