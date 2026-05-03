import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

loadRootEnvLocal();

const prisma = new PrismaClient();

// Dev/CI seed. Do NOT run in production.
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production DB.");
  }

  const skills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "NestJS",
    "Next.js",
    "React Native",
    "Python",
    "Java",
    "Go",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "AWS",
    "Product Management",
    "UX Design",
    "Arabic",
    "English",
  ];

  for (const name of skills) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  const passwordHash = await bcrypt.hash("Password123", 12);
  const demoUser = await upsertSeedUser({
    email: "demo@baydar.ps",
    passwordHash,
    locale: "ar-PS",
    handle: "demo",
    firstName: "ديمو",
    lastName: "المستخدم",
    headline: "مهندس برمجيات في رام الله",
    location: "Ramallah",
  });

  await upsertSeedUser({
    email: "a11y@baydar.test",
    passwordHash,
    locale: "ar-PS",
    handle: "a11y-test",
    firstName: "A11y",
    lastName: "Test",
    headline: "Accessibility smoke profile",
    location: "Ramallah",
  });

  const ownerUser = await upsertSeedUser({
    email: "owner@baydar.ps",
    passwordHash,
    role: "COMPANY_ADMIN",
    locale: "en",
    handle: "owner-baydar",
    firstName: "Owner",
    lastName: "Baydar",
    headline: "Hiring manager",
    location: "Ramallah",
  });

  const company = await prisma.company.upsert({
    where: { slug: "baydar" },
    update: {
      name: "Baydar",
      tagline: "Palestine-first professional network",
      about: "Baydar is building the Arabic-first professional graph for Palestine.",
      city: "Ramallah",
      country: "PS",
      website: "https://baydar.ps",
      industry: "Technology",
      sizeBucket: "11-50",
      verified: true,
    },
    create: {
      slug: "baydar",
      name: "Baydar",
      tagline: "Palestine-first professional network",
      about: "Baydar is building the Arabic-first professional graph for Palestine.",
      city: "Ramallah",
      country: "PS",
      website: "https://baydar.ps",
      industry: "Technology",
      sizeBucket: "11-50",
      verified: true,
    },
  });

  await prisma.companyMember.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: ownerUser.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      companyId: company.id,
      userId: ownerUser.id,
      role: "OWNER",
    },
  });

  const reviewJob = await upsertJob({
    companyId: company.id,
    postedById: ownerUser.id,
    title: "Senior Backend Engineer",
    description:
      "Own API modules, shape Prisma-backed product surfaces, and ship production-grade NestJS services for Baydar's hiring and social graph features.",
    type: "FULL_TIME",
    locationMode: "REMOTE",
    city: "Ramallah",
    salaryMin: 3000,
    salaryMax: 5000,
    skillsRequired: ["NestJS", "Prisma", "PostgreSQL"],
  });

  await upsertJob({
    companyId: company.id,
    postedById: ownerUser.id,
    title: "Platform Engineer",
    description:
      "Build platform primitives for Baydar, improve deployment pipelines, and help teams ship reliable product changes across web and mobile surfaces.",
    type: "FULL_TIME",
    locationMode: "HYBRID",
    city: "Ramallah",
    salaryMin: 2500,
    salaryMax: 4500,
    skillsRequired: ["TypeScript", "Platform", "CI/CD"],
  });

  await prisma.application.upsert({
    where: {
      jobId_applicantId: {
        jobId: reviewJob.id,
        applicantId: demoUser.id,
      },
    },
    update: {
      status: "SUBMITTED",
      coverLetter: "I can help Baydar ship backend features fast and safely.",
    },
    create: {
      jobId: reviewJob.id,
      applicantId: demoUser.id,
      coverLetter: "I can help Baydar ship backend features fast and safely.",
      status: "SUBMITTED",
    },
  });

  // eslint-disable-next-line no-console
  console.warn(
    `[seed] ready — demo user ${demoUser.email}, owner ${ownerUser.email} (password: Password123)`,
  );
}

async function upsertSeedUser(input: {
  email: string;
  passwordHash: string;
  role?: "USER" | "COMPANY_ADMIN" | "MODERATOR" | "ADMIN";
  locale: string;
  handle: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
}) {
  const profileData = {
    handle: input.handle,
    firstName: input.firstName,
    lastName: input.lastName,
    headline: input.headline,
    country: "PS",
    location: input.location,
  };

  const existingByEmail = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        passwordHash: input.passwordHash,
        role: input.role ?? existingByEmail.role,
        locale: input.locale,
        emailVerified: existingByEmail.emailVerified ?? new Date(),
        profile: existingByEmail.profile ? { update: profileData } : { create: profileData },
      },
    });
  }

  const existingByHandle = await prisma.profile.findUnique({
    where: { handle: input.handle },
  });

  if (existingByHandle) {
    return prisma.user.update({
      where: { id: existingByHandle.userId },
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? "USER",
        locale: input.locale,
        emailVerified: new Date(),
        profile: { update: profileData },
      },
    });
  }

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? "USER",
      locale: input.locale,
      emailVerified: new Date(),
      profile: { create: profileData },
    },
  });
}

async function upsertJob(input: {
  companyId: string;
  postedById: string;
  title: string;
  description: string;
  type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "VOLUNTEER" | "TEMPORARY";
  locationMode: "ONSITE" | "HYBRID" | "REMOTE";
  city: string;
  salaryMin: number;
  salaryMax: number;
  skillsRequired: string[];
}) {
  const data = {
    companyId: input.companyId,
    postedById: input.postedById,
    title: input.title,
    description: input.description,
    type: input.type,
    locationMode: input.locationMode,
    city: input.city,
    country: "PS",
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    salaryCurrency: "ILS",
    skillsRequired: input.skillsRequired,
    isActive: true,
    deletedAt: null,
  };

  const existing = await prisma.job.findFirst({
    where: { companyId: input.companyId, title: input.title },
    select: { id: true },
  });

  if (existing) {
    return prisma.job.update({ where: { id: existing.id }, data });
  }

  return prisma.job.create({ data });
}

function loadRootEnvLocal(): void {
  const path = findRootEnvLocal();
  if (!path) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function findRootEnvLocal(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const envPath = resolve(dir, ".env.local");
    if (existsSync(resolve(dir, "pnpm-workspace.yaml")) && existsSync(envPath)) {
      return envPath;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
  if (!match) return null;

  const key = match[1]!;
  let value = match[2]!.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value.replace(/\\n/g, "\n")];
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
