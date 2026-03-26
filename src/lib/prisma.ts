import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Absolute path to avoid resolution issues
const dbPath = path.resolve(process.cwd(), "prisma/dev.db").replace(/\\/g, "/");

const adapter = new PrismaBetterSqlite3({ url: dbPath });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
