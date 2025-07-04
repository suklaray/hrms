import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateRandomPassword() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

function nextSuffix(usedSuffixes) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';

  for (const letter of letters) {
    if (!usedSuffixes.has(letter)) {
      return letter;
    }
  }

  // All single letters are used, find z1, z2, z3...
  let zCount = 1;
  while (usedSuffixes.has(`z${zCount}`)) {
    zCount++;
  }
  return `z${zCount}`;
}

async function main() {
  const prefix = process.env.SUPERADMIN_PREFIX || 'superadmin_';
  const now = new Date();
  const datePart = now.toISOString().split('T')[0].replace(/-/g, '');

  const existingAdmins = await prisma.users.findMany({
    where: {
      email: {
        startsWith: prefix + datePart,
      },
    },
    select: {
      email: true,
    },
  });

  const usedSuffixes = new Set();
  for (const admin of existingAdmins) {
    const match = admin.email.match(process.env.SUPERADMIN_EMAIL_REGEX);
    if (match && match[1]) {
      usedSuffixes.add(match[1]);
    }
  }

  const suffix = nextSuffix(usedSuffixes);
  const superAdminEmail = `${prefix}${datePart}${suffix}@example.com`;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || generateRandomPassword();
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  await prisma.users.create({
    data: {
      name: 'Super Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superadmin',
      empid: `SUPER${Math.floor(1000 + Math.random() * 9000)}`,
    },
  });

  console.log(`Super Admin created`);
  console.log(`Email: ${superAdminEmail}`);
  console.log(`Password: ${superAdminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
