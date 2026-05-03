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
  const runId = args
    .find((arg) => arg.startsWith("--run-id="))
    ?.slice("--run-id=".length)
    .trim();
  const confirm = args
    .find((arg) => arg.startsWith("--confirm="))
    ?.slice("--confirm=".length)
    .trim();
  if (!runId || !/^qa-[a-z0-9-]{4,24}$/.test(runId) || !confirm) {
    throw new Error(
      "Usage: pnpm --filter @baydar/db qa:cleanup -- --run-id=qa-<id> --confirm=qa-<id>",
    );
  }
  return { runId, confirm };
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
