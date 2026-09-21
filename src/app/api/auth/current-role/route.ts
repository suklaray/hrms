import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const cookies = parse(req.headers.get('cookie') || "");
  const token = cookies.token;
  const user = token ? getUserFromToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentUser = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { role: true, status: true }
    });

    if (!currentUser || currentUser.status !== "Active") {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
    }

    return NextResponse.json({ role: currentUser.role }, { status: 200 });
  } catch (error) {
    console.error("Error fetching current role:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}

