import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  auditedPrisma?: PrismaClient;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

export const prisma = new Proxy(basePrisma, {
  get(_target, property) {
    const activeClient =
      typeof window === "undefined"
        ? globalForPrisma.auditedPrisma ?? basePrisma
        : basePrisma;
    const value = Reflect.get(activeClient, property, activeClient);
    return typeof value === "function" ? value.bind(activeClient) : value;
  },
}) as PrismaClient;

export function installAuditExtension<T>(extend: (client: PrismaClient) => T) {
  if (typeof window !== "undefined" || globalForPrisma.auditedPrisma) return;
  globalForPrisma.auditedPrisma = extend(basePrisma) as PrismaClient;
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

// Ensure connection on first use
if (process.env.NODE_ENV === 'production') {
  basePrisma.$connect().catch((err) => {
    console.error('Failed to connect to database:', err);
  });
}

// Handle cleanup on process termination
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await basePrisma.$disconnect();
  });
}

export { prisma as default };
