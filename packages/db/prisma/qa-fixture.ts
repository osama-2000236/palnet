import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const prisma = new PrismaClient();

interface Args {
  runId: string;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create QA fixtures in production.");
  }

  const { runId } = parseArgs(process.argv.slice(2));
  const passwordHash = await bcrypt.hash("Password123", 12);
  const peerEmail = `qa+${runId}.peer@baydar.test`;
  const adminEmail = `qa+${runId}.admin@baydar.test`;
  const companySlug = `${runId}-baydar-labs`.toLowerCase();

  const peer = await prisma.user.upsert({
    where: { email: peerEmail },
    update: {
      passwordHash,
      locale: "ar-PS",
      isActive: true,
      deletedAt: null,
      profile: {
        upsert: {
          create: {
            handle: `${runId}-peer`.slice(0, 30),
            firstName: "ليان",
            lastName: "الخطيب",
            headline: "Engineering Lead at Baydar Labs",
            about: `QA peer account for ${runId}.`,
            location: "Ramallah",
            country: "PS",
          },
          update: {
            firstName: "ليان",
            lastName: "الخطيب",
            headline: "Engineering Lead at Baydar Labs",
            about: `QA peer account for ${runId}.`,
            location: "Ramallah",
            country: "PS",
          },
        },
      },
    },
    create: {
      email: peerEmail,
      passwordHash,
      locale: "ar-PS",
      emailVerified: new Date(),
      profile: {
        create: {
          handle: `${runId}-peer`.slice(0, 30),
          firstName: "ليان",
          lastName: "الخطيب",
          headline: "Engineering Lead at Baydar Labs",
          about: `QA peer account for ${runId}.`,
          location: "Ramallah",
          country: "PS",
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: "ADMIN",
      locale: "en",
      emailVerified: new Date(),
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      locale: "en",
      emailVerified: new Date(),
    },
  });

  const peerProfile = await prisma.profile.findUniqueOrThrow({ where: { userId: peer.id } });
  const existingExperience = await prisma.experience.findFirst({
    where: { profileId: peerProfile.id, title: "Engineering Lead" },
    select: { id: true },
  });
  if (existingExperience) {
    await prisma.experience.update({
      where: { id: existingExperience.id },
      data: { companyName: "Baydar Labs", startDate: new Date("2024-01-01T00:00:00.000Z") },
    });
  } else {
    await prisma.experience.create({
      data: {
        profileId: peerProfile.id,
        title: "Engineering Lead",
        companyName: "Baydar Labs",
        locationMode: "HYBRID",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
      },
    });
  }

  const moderationBody = `QA moderation target ${runId}`;
  const existingPost = await prisma.post.findFirst({
    where: { authorId: peer.id, body: moderationBody },
    select: { id: true },
  });
  const moderationPost = existingPost
    ? await prisma.post.update({
        where: { id: existingPost.id },
        data: { deletedAt: null },
      })
    : await prisma.post.create({
        data: { authorId: peer.id, body: moderationBody, language: "en" },
      });

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {
      name: `Baydar Labs ${runId}`,
      tagline: "QA fixture company",
      about: `Local QA company fixture for ${runId}.`,
      industry: "Software",
      sizeBucket: "11-50",
      country: "PS",
      city: "Ramallah",
      verified: true,
    },
    create: {
      slug: companySlug,
      name: `Baydar Labs ${runId}`,
      tagline: "QA fixture company",
      about: `Local QA company fixture for ${runId}.`,
      industry: "Software",
      sizeBucket: "11-50",
      country: "PS",
      city: "Ramallah",
      verified: true,
    },
  });

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: peer.id } },
    update: { role: "OWNER" },
    create: { companyId: company.id, userId: peer.id, role: "OWNER" },
  });

  const existingJob = await prisma.job.findFirst({
    where: {
      companyId: company.id,
      title: `Full Stack Engineer ${runId}`,
      deletedAt: null,
    },
    select: { id: true },
  });

  const job = existingJob
    ? await prisma.job.update({
        where: { id: existingJob.id },
        data: {
          postedById: peer.id,
          description:
            "Build Arabic-first professional networking experiences across React Native, Node.js, and PostgreSQL.",
          type: "FULL_TIME",
          locationMode: "HYBRID",
          city: "Ramallah",
          country: "PS",
          salaryMin: 3500,
          salaryMax: 5500,
          salaryCurrency: "USD",
          skillsRequired: ["React Native", "Node.js", "PostgreSQL"],
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deletedAt: null,
        },
      })
    : await prisma.job.create({
        data: {
          companyId: company.id,
          postedById: peer.id,
          title: `Full Stack Engineer ${runId}`,
          description:
            "Build Arabic-first professional networking experiences across React Native, Node.js, and PostgreSQL.",
          type: "FULL_TIME",
          locationMode: "HYBRID",
          city: "Ramallah",
          country: "PS",
          salaryMin: 3500,
          salaryMax: 5500,
          salaryCurrency: "USD",
          skillsRequired: ["React Native", "Node.js", "PostgreSQL"],
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify(
      {
        runId,
        peerEmail,
        peerPassword: "Password123",
        adminEmail,
        adminPassword: "Password123",
        adminId: admin.id,
        moderationPostId: moderationPost.id,
        moderationBody,
        companySlug,
        jobId: job.id,
        jobTitle: job.title,
      },
      null,
      2,
    ),
  );
}

function parseArgs(args: string[]): Args {
  const runIdArg = args.find((arg) => arg.startsWith("--run-id="));
  const runId = runIdArg?.slice("--run-id=".length).trim();
  if (!runId || !/^qa-[a-z0-9-]{4,24}$/.test(runId)) {
    throw new Error("Usage: pnpm --filter @baydar/db qa:fixture -- --run-id=qa-<id>");
  }
  return { runId };
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
