import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate setup token
    const { setupToken, email, password, name } = req.body;
    
    if (!setupToken || setupToken !== process.env.SUPER_ADMIN_SETUP_TOKEN) {
      return res.status(401).json({ message: 'Invalid setup token' });
    }

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.users.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperAdmin) {
      return res.status(409).json({ message: 'SUPER_ADMIN already exists' });
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create SUPER_ADMIN user
    const superAdmin = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'superadmin',
        verified: 'verified',
        form_submitted: true,
        empid: 'SUPER_ADMIN_001'
      },
      select: {
        empid: true,
        email: true,
        name: true,
        role: true,
        verified: true,
        created_at: true
      }
    });

    return res.status(201).json({
      message: 'SUPER_ADMIN created successfully',
      user: superAdmin
    });

  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}