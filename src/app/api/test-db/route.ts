import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const userCount = await prisma.users.count();
    const testUser = await prisma.users.findFirst({
      where: { email: "superadmin_20250827a@example.com" }
    });
    
    return NextResponse.json({ 
      status: 'DB Connected', 
      userCount,
      testUserExists: !!testUser,
      testUserRole: testUser?.role 
    }, { status: 200 });
  } catch (error) {
    console.error("DB Test Error:", error);
    return NextResponse.json({ 
      status: 'DB Error', 
      error: error.message 
    }, { status: 500 });
  }
}

