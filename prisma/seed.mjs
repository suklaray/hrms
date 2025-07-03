//import prisma from '../lib/prisma';
//import bcrypt from 'bcryptjs';
//import { PrismaClient } from '@prisma/client';
//const prisma = new PrismaClient();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(" SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD missing in .env.local");
  }

  // Check if Super Admin already exists
  const existing = await prisma.users.findUnique({
    where: { email: superAdminEmail }
  });

  if (existing) {
    console.log("Super Admin already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  await prisma.users.create({
    data: {
      name: 'Super Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superadmin',
      empid: `SUPER${Math.floor(1000 + Math.random() * 9000)}`
    }
  });

  console.log(`Super Admin seeded: ${superAdminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
