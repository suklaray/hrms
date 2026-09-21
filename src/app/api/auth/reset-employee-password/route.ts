import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ 
      message: "Password reset successfully", 
      newPassword 
    }, { status: 200 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}

