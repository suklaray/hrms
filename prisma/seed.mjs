import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate secure random password (8 characters)
function generateRandomPassword() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

// Generate empid like: SUPERADMIN4567
function generateEmpId(name) {
  const cleanName = name.replace(/\s+/g, '').toUpperCase().slice(0, 5);
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `SUPER${cleanName}${randomDigits}`;
}

// Get next available unique suffix (a, b, ..., z1, z2, ...)
function nextSuffix(usedSuffixes) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (const letter of letters) {
    if (!usedSuffixes.has(letter)) return letter;
  }

  let zCount = 1;
  while (usedSuffixes.has(`z${zCount}`)) zCount++;
  return `z${zCount}`;
}

async function main() {
  const name = 'Super Admin';
  const prefix = process.env.SUPERADMIN_PREFIX || 'superadmin_';
  const domain = process.env.SUPERADMIN_DOMAIN || 'example.com';

  const now = new Date();
  const datePart = now.toISOString().split('T')[0].replace(/-/g, '');

  // Fetch existing superadmins for today's date prefix
  const existingAdmins = await prisma.users.findMany({
    where: {
      email: {
        startsWith: `${prefix}${datePart}`,
      },
    },
    select: { email: true },
  });

  // Extract used suffixes from existing emails
  const usedSuffixes = new Set();
  const emailRegex = new RegExp(`^${prefix}${datePart}([a-z0-9]+)@${domain.replace('.', '\\.')}$`);

  for (const admin of existingAdmins) {
    const match = admin.email.match(emailRegex);
    if (match && match[1]) {
      usedSuffixes.add(match[1]);
    }
  }

  const suffix = nextSuffix(usedSuffixes);
  const email = `${prefix}${datePart}${suffix}@${domain}`;
  const password = generateRandomPassword();
  const hashedPassword = await bcrypt.hash(password, 10);
  const empid = generateEmpId(name);

  // Create new superadmin
  await prisma.users.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'superadmin',
      empid,
    },
  });

  console.log('Super Admin Created');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('EmpID:', empid);
}

main()
  .catch((e) => {
    console.error('Error creating Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
