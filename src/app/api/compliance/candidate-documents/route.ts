import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  try {
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const token = cookies.token;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess =
      (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS)) ||
      (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW));
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { email } = query;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Reconnect to database if connection is lost
    await prisma.$connect();
    
    // Get employee documents using email
    const employee = await prisma.employees.findUnique({
      where: { email },
      select: {
        aadhar_card: true,
        pan_card: true,
        bank_details: true,
        experience_certificate: true,
        resume: true,
        education_certificates: true
      }
    });

    // Return empty object if employee not found (candidate might not be in employees table yet)
    if (!employee) {
      return NextResponse.json({
        aadhar_card: null,
        pan_card: null,
        bank_details: null,
        experience_certificate: null,
        resume: null,
        education_certificates: null
      }, { status: 200 });
    }

    return NextResponse.json(employee, { status: 200 });

  } catch (err) {
    console.error('Error fetching candidate documents:', err);
    
    // If it's a connection error, try to reconnect
    if (err.code === 'P1017') {
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        return NextResponse.json({ 
          message: 'Database connection lost. Please try again.',
          aadhar_card: null,
          pan_card: null,
          bank_details: null,
          experience_certificate: null,
          resume: null
        }, { status: 500 });
      } catch (reconnectErr) {
        console.error('Failed to reconnect:', reconnectErr);
      }
    }
    
    return NextResponse.json({ 
      message: 'Internal server error',
      aadhar_card: null,
      pan_card: null,
      bank_details: null,
      experience_certificate: null,
      resume: null,
      education_certificates: null
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

