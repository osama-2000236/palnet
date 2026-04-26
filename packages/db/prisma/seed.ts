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

  // eslint-disable-next-line no-console
  console.warn(`[seed] ready — demo user ${demoUser.email} (password: Password123)`);
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
