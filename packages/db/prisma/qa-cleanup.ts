import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const prisma = new PrismaClient();

interface Args {
  runId: string;
  confirm: string;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to clean QA fixtures in production.");
  }

  const { runId, confirm } = parseArgs(process.argv.slice(2));
  if (confirm !== runId) {
    throw new Error("Cleanup confirmation must exactly match the run id.");
  }

  const emailPrefix = `qa+${runId}`;
  const companySlug = `${runId}-baydar-labs`.toLowerCase();

  const users = await prisma.user.findMany({
    where: { email: { startsWith: emailPrefix } },
    select: { id: true, email: true },
  });

  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    const reports = await prisma.report.findMany({
      where: { OR: [{ reporterId: { in: userIds } }, { targetUserId: { in: userIds } }] },
      select: { id: true },
    });
    await prisma.moderationAction.deleteMany({
      where: {
        OR: [
          { reportId: { in: reports.map((report) => report.id) } },
          { actorId: { in: userIds } },
          { targetUserId: { in: userIds } },
        ],
      },
    });
    await prisma.notification.deleteMany({
      where: { OR: [{ recipientId: { in: userIds } }, { actorId: { in: userIds } }] },
    });
    await prisma.connection.deleteMany({
      where: { OR: [{ requesterId: { in: userIds } }, { receiverId: { in: userIds } }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.company.deleteMany({ where: { slug: companySlug } });
  await prisma.chatRoom.deleteMany({ where: { members: { none: {} } } });

  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify(
      {
        runId,
        deletedUsers: users.map((user) => user.email),
        deletedCompanySlug: companySlug,
      },
      null,
      2,
    ),
  );
}

function parseArgs(args: string[]): Args {
  const runId =
    args
      .find((arg) => arg.startsWith("--run-id="))
      ?.slice("--run-id=".length)
      .trim() ?? lastRunId();
  const confirm =
    args
      .find((arg) => arg.startsWith("--confirm="))
      ?.slice("--confirm=".length)
      .trim() ?? (args.includes("--last") ? runId : undefined);
  if (!runId || !/^qa-[a-z0-9-]{4,24}$/.test(runId) || !confirm) {
    throw new Error(
      "Usage: pnpm --filter @baydar/db qa:cleanup -- --run-id=qa-<id> --confirm=qa-<id>\n" +
        "   or: pnpm --filter @baydar/db qa:cleanup -- --last   (uses .artifacts/load/last-run.json)",
    );
  }
  return { runId, confirm };
}

// Manual `qa:load-fixture` runs leaked twice this month for the dullest
// reason: nobody remembered the run id, so cleanup was never invoked. The
// fixture already writes the id to disk -- read it back instead of asking a
// human to keep a hex string in their head.
function lastRunId(): string | undefined {
  try {
    const path = join(workspaceRoot(), ".artifacts", "load", "last-run.json");
    return (JSON.parse(readFileSync(path, "utf8")) as { runId?: string }).runId;
  } catch {
    return undefined;
  }
}

function workspaceRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
