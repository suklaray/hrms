import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { DecodedToken } from "@/lib/jwtTypes";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};



  try {
    const { token } = cookie.parse(req.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { empid: (decoded.empid || decoded.id) as string },
      select: { empid: true, password: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { empid: user.empid },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}



