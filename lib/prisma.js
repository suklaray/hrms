import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

const prisma = globalForPrisma.prisma;

// Ensure connection on first use
if (process.env.NODE_ENV === 'production') {
  prisma.$connect().catch((err) => {
    console.error('Failed to connect to database:', err);
  });
}

// Handle cleanup on process termination
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;