import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

try {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db").replace(/\\/g, "/");
  console.log('[Prisma] Initializing database at:', dbPath);
  
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  
  prisma = globalForPrisma.prisma ||
    new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
} catch (error) {
  console.error('[Prisma] Critical Initialization Error:', error);
  // Fallback to standard client (might fail if missing URL, but better than a total crash)
  prisma = globalForPrisma.prisma || new PrismaClient();
}

export { prisma };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
