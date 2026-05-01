import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const prisma = new PrismaClient();
const password = "Password123";

interface Args {
  runId: string;
  users: number;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create load-test fixtures in production.");
  }

  const { runId, users } = parseArgs(process.argv.slice(2));
  const passwordHash = await bcrypt.hash(password, 12);
  const companySlug = `${runId}-baydar-labs`.toLowerCase();

  const peer = await prisma.user.upsert({
    where: { email: `qa+${runId}.peer@baydar.test` },
    update: peerUserData(passwordHash, runId),
    create: {
      email: `qa+${runId}.peer@baydar.test`,
      passwordHash,
      locale: "ar-PS",
      emailVerified: new Date(),
      profile: {
        create: peerProfileData(runId),
      },
    },
    include: { profile: { select: { id: true } } },
  });
  if (peer.profile) {
    await ensureExperience(peer.profile.id, "Engineering Lead", "Baydar Labs", runId);
    await ensureSkills(peer.profile.id);
  }

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: companyData(runId),
    create: {
      slug: companySlug,
      ...companyData(runId),
    },
  });

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: peer.id } },
    update: { role: "OWNER" },
    create: { companyId: company.id, userId: peer.id, role: "OWNER" },
  });

  const job = await upsertLoadJob(company.id, peer.id, runId);
  const rows = ["email,password,peerUserId,jobId"];

  for (let i = 0; i < users; i += 1) {
    const email = `qa+${runId}.${String(i).padStart(4, "0")}@baydar.test`;
    const handle = handleFor(runId, i);
    const user = await prisma.user.upsert({
      where: { email },
      update: loadUserData(passwordHash, runId, i, handle),
      create: {
        email,
        passwordHash,
        locale: "ar-PS",
        emailVerified: new Date(),
        profile: {
          create: loadProfileData(runId, i, handle),
        },
      },
      include: { profile: { select: { id: true } } },
    });
    if (user.profile) {
      await ensureExperience(user.profile.id, "Full Stack Engineer", "Baydar Load Labs", runId);
      await ensureSkills(user.profile.id);
    }

    await prisma.connection.upsert({
      where: { requesterId_receiverId: { requesterId: user.id, receiverId: peer.id } },
      update: { status: "ACCEPTED", respondedAt: new Date(), message: `load ${runId}` },
      create: {
        requesterId: user.id,
        receiverId: peer.id,
        status: "ACCEPTED",
        respondedAt: new Date(),
        message: `load ${runId}`,
      },
    });

    await ensureDm(user.id, peer.id, runId);
    await ensurePost(user.id, runId, i);
    rows.push([email, password, peer.id, job.id].join(","));
  }

  const artifactDir = join(workspaceRoot(), ".artifacts", "load");
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(join(artifactDir, "users.csv"), `${rows.join("\n")}\n`);
  writeFileSync(
    join(artifactDir, "last-run.json"),
    `${JSON.stringify({ runId, users, peerUserId: peer.id, jobId: job.id }, null, 2)}\n`,
  );

  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify(
      {
        runId,
        users,
        usersCsv: ".artifacts/load/users.csv",
        peerEmail: `qa+${runId}.peer@baydar.test`,
        password,
        jobId: job.id,
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
  const usersRaw = args.find((arg) => arg.startsWith("--users="))?.slice("--users=".length);
  const users = Number.parseInt(usersRaw ?? "120", 10);
  if (!runId || !/^qa-[a-z0-9-]{4,24}$/.test(runId) || !Number.isFinite(users)) {
    throw new Error(
      "Usage: pnpm --filter @baydar/db qa:load-fixture -- --run-id=qa-<id> --users=120",
    );
  }
  return { runId, users: Math.min(Math.max(users, 1), 1_000) };
}

function workspaceRoot(): string {
  let current = process.cwd();
  let parent = dirname(current);
  while (parent !== current) {
    const manifestPath = join(current, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { name?: string };
      if (manifest.name === "baydar") return current;
    }
    current = parent;
    parent = dirname(current);
  }
  const manifestPath = join(current, "package.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { name?: string };
    if (manifest.name === "baydar") return current;
  }
  return process.cwd();
}

function handleFor(runId: string, index: number): string {
  const raw = `${runId}-${String(index).padStart(4, "0")}`.toLowerCase();
  return raw.slice(0, 30).replace(/-$/, "0");
}

function peerProfileData(runId: string) {
  return {
    handle: `${runId}-peer`.slice(0, 30),
    firstName: "ليان",
    lastName: "الخطيب",
    headline: "Engineering Lead at Baydar Labs",
    about: `Load-test peer account for ${runId}.`,
    location: "Ramallah",
    country: "PS",
  };
}

function peerUserData(passwordHash: string, runId: string) {
  return {
    passwordHash,
    locale: "ar-PS",
    isActive: true,
    deletedAt: null,
    profile: {
      upsert: {
        create: peerProfileData(runId),
        update: peerProfileData(runId),
      },
    },
  };
}

function loadProfileData(runId: string, index: number, handle: string) {
  return {
    handle,
    firstName: "مستخدم",
    lastName: `تحميل ${index}`,
    headline: "Full Stack Engineer",
    about: `Disposable local load-test profile for ${runId}.`,
    location: "Ramallah",
    country: "PS",
  };
}

function loadUserData(passwordHash: string, runId: string, index: number, handle: string) {
  return {
    passwordHash,
    locale: "ar-PS",
    isActive: true,
    deletedAt: null,
    profile: {
      upsert: {
        create: loadProfileData(runId, index, handle),
        update: loadProfileData(runId, index, handle),
      },
    },
  };
}

function companyData(runId: string) {
  return {
    name: `Baydar Load Labs ${runId}`,
    tagline: "Local load-test company",
    about: `Local high-load fixture company for ${runId}.`,
    industry: "Software",
    sizeBucket: "51-200",
    country: "PS",
    city: "Ramallah",
    verified: true,
  };
}

async function upsertLoadJob(companyId: string, postedById: string, runId: string) {
  const title = `Full Stack Engineer ${runId}`;
  const existing = await prisma.job.findFirst({
    where: { companyId, title, deletedAt: null },
    select: { id: true },
  });
  const data = {
    companyId,
    postedById,
    title,
    description:
      "Build Arabic-first professional networking experiences across React Native, Node.js, and PostgreSQL.",
    type: "FULL_TIME" as const,
    locationMode: "HYBRID" as const,
    city: "Ramallah",
    country: "PS",
    salaryMin: 3500,
    salaryMax: 5500,
    salaryCurrency: "USD",
    skillsRequired: ["React Native", "Node.js", "PostgreSQL"],
    isActive: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deletedAt: null,
  };
  return existing
    ? prisma.job.update({ where: { id: existing.id }, data })
    : prisma.job.create({ data });
}

async function ensureDm(userId: string, peerId: string, runId: string): Promise<void> {
  const room = await prisma.chatRoom.findFirst({
    where: {
      isGroup: false,
      AND: [{ members: { some: { userId } } }, { members: { some: { userId: peerId } } }],
    },
    select: { id: true },
  });
  if (room) return;
  await prisma.chatRoom.create({
    data: {
      isGroup: false,
      members: {
        create: [{ userId }, { userId: peerId }],
      },
      messages: {
        create: {
          authorId: peerId,
          body: `جاهز لاختبار الرسائل ${runId}`,
          clientMessageId: `fixture-${runId}-${userId}`,
        },
      },
    },
  });
}

async function ensurePost(userId: string, runId: string, index: number): Promise<void> {
  const body = `منشور اختبار تحميل محلي ${runId} #${index}`;
  const exists = await prisma.post.findFirst({
    where: { authorId: userId, body },
    select: { id: true },
  });
  if (exists) return;
  await prisma.post.create({
    data: {
      authorId: userId,
      body,
      language: "ar",
    },
  });
}

async function ensureExperience(
  profileId: string,
  title: string,
  companyName: string,
  runId: string,
): Promise<void> {
  const exists = await prisma.experience.findFirst({
    where: { profileId, title, companyName },
    select: { id: true },
  });
  if (exists) return;
  await prisma.experience.create({
    data: {
      profileId,
      title,
      companyName,
      location: "Ramallah",
      locationMode: "HYBRID",
      startDate: new Date("2022-01-01T00:00:00.000Z"),
      description: `Professional background fixture for ${runId}.`,
    },
  });
}

async function ensureSkills(profileId: string): Promise<void> {
  for (const name of ["React", "Node.js", "PostgreSQL"]) {
    const skill = await prisma.skill.upsert({
      where: { slug: slugForSkill(name) },
      update: { name },
      create: { name, slug: slugForSkill(name) },
    });
    await prisma.profileSkill.upsert({
      where: { profileId_skillId: { profileId, skillId: skill.id } },
      update: {},
      create: { profileId, skillId: skill.id },
    });
  }
}

function slugForSkill(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
