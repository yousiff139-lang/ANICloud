import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

try {
  // Standard Prisma initialization for SQLite or other databases
  // In production, DATABASE_URL should be set. If not, Prisma defaults to schema.prisma value.
  console.log('[Prisma] Initializing standard PrismaClient...');
  
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: ["error", "warn"],
  });
} catch (error) {
  console.error('[Prisma] Critical Initialization Error:', error);
  prisma = globalForPrisma.prisma || new PrismaClient();
}

export { prisma };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
