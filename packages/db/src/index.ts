import { PrismaClient } from "@prisma/client";

// Global singleton — prevents hot-reload from spawning N clients in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// eslint-disable-next-line import/export -- Prisma generates runtime exports that eslint-plugin-import cannot statically enumerate.
export * from "@prisma/client";
