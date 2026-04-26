import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Dev-only seed. Do NOT run in production. CI uses a separate deterministic seed.
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed production DB.");
  }

  // Minimal skills catalogue — extend as the product grows.
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

  // One demo user so dev sign-in is one click away.
  // Must use bcrypt to match AuthService.login.
  const passwordHash = await bcrypt.hash("Password123", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@baydar.ps" },
    update: {},
    create: {
      email: "demo@baydar.ps",
      passwordHash,
      locale: "ar-PS",
      emailVerified: new Date(),
      profile: {
        create: {
          handle: "demo",
          firstName: "ديمو",
          lastName: "المستخدم",
          headline: "مهندس برمجيات في رام الله",
          country: "PS",
          location: "Ramallah",
        },
      },
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@baydar.ps" },
    update: { role: "COMPANY_ADMIN" },
    create: {
      email: "owner@baydar.ps",
      passwordHash,
      role: "COMPANY_ADMIN",
      locale: "en",
      emailVerified: new Date(),
      profile: {
        create: {
          handle: "owner-baydar",
          firstName: "Owner",
          lastName: "Baydar",
          headline: "Hiring manager",
          country: "PS",
          location: "Ramallah",
        },
      },
    },
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

  const _applyJob = await upsertJob(prisma, {
    companyId: company.id,
    postedById: ownerUser.id,
    title: "Platform Engineer",
    description:
      "Build platform primitives for Baydar, improve deployment pipelines, and help teams ship reliable product changes across web and mobile surfaces.",
    type: "FULL_TIME",
    locationMode: "HYBRID",
    city: "Ramallah",
    country: "PS",
    salaryMin: 2500,
    salaryMax: 4500,
    salaryCurrency: "ILS",
    skillsRequired: ["TypeScript", "Platform", "CI/CD"],
  });

  const reviewJob = await upsertJob(prisma, {
    companyId: company.id,
    postedById: ownerUser.id,
    title: "Senior Backend Engineer",
    description:
      "Own API modules, shape Prisma-backed product surfaces, and ship production-grade NestJS services for Baydar's hiring and social graph features.",
    type: "FULL_TIME",
    locationMode: "REMOTE",
    city: "Ramallah",
    country: "PS",
    salaryMin: 3000,
    salaryMax: 5000,
    salaryCurrency: "ILS",
    skillsRequired: ["NestJS", "Prisma", "PostgreSQL"],
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
  console.warn(`[seed] ready — demo user ${demoUser.email} (password: Password123)`);
}

async function upsertJob(
  prismaClient: PrismaClient,
  input: {
    companyId: string;
    postedById: string;
    title: string;
    description: string;
    type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "VOLUNTEER" | "TEMPORARY";
    locationMode: "ONSITE" | "HYBRID" | "REMOTE";
    city: string;
    country: string;
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    skillsRequired: string[];
  },
) {
  const existing = await prismaClient.job.findFirst({
    where: { companyId: input.companyId, title: input.title, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    return prismaClient.job.update({
      where: { id: existing.id },
      data: {
        postedById: input.postedById,
        description: input.description,
        type: input.type,
        locationMode: input.locationMode,
        city: input.city,
        country: input.country,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        salaryCurrency: input.salaryCurrency,
        skillsRequired: input.skillsRequired,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  return prismaClient.job.create({
    data: input,
  });
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
