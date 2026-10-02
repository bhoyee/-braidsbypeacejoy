import "server-only";
import { PrismaClient } from "@prisma/client";

// Prisma's query engine starts one worker thread per CPU core. Shared hosting
// (CloudLinux) caps threads per account, and the engine then crashes with
// "PANIC: timer has gone away". Two workers are plenty for this site. The engine
// starts on the first query, so setting this here (before any query) is enough.
process.env.TOKIO_WORKER_THREADS ??= "2";

// Reuse one client across hot reloads / Passenger worker lifetimes so the
// shared-hosting MySQL connection limit isn't exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
