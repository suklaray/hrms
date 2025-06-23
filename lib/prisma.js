import { PrismaClient } from "@/lib/generated/prisma"; // Or use '@prisma/client' if you're not customizing output
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
export default prisma;
