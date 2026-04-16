import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

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
  const passwordHash = hashPassword("Password123");
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@palnet.ps" },
    update: {},
    create: {
      email: "demo@palnet.ps",
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

  // eslint-disable-next-line no-console
  console.warn(`[seed] ready — demo user ${demoUser.email}`);
}

// NOTE: real auth uses bcrypt; this seed uses scrypt to avoid a runtime dep.
// The password is OVERWRITTEN via the register flow in tests. Do not reuse.
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
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
