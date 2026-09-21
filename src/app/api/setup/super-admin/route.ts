import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { ensureSuperAdminRole } from '@/lib/rbac';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  try {
    // Validate setup token
    const { setupToken, email, password, name } = body;
    
    if (!setupToken || setupToken !== process.env.SUPER_ADMIN_SETUP_TOKEN) {
      return NextResponse.json({ message: 'Invalid setup token' }, { status: 401 });
    }

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Email, password, and name are required' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.users.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperAdmin) {
      return NextResponse.json({ message: 'SUPER_ADMIN already exists' }, { status: 409 });
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Ensure Super Admin role exists in roles table with all permissions from permissions table
    const superAdminRole = await ensureSuperAdminRole(prisma);

    // Create SUPER_ADMIN user
    const superAdmin = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'superadmin',
        roleId: superAdminRole.id,
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

    return NextResponse.json({
      message: 'SUPER_ADMIN created successfully',
      user: superAdmin
    }, { status: 201 });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

