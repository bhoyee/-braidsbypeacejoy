import "server-only";
import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads / Passenger worker lifetimes so the
// shared-hosting MySQL connection limit isn't exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
