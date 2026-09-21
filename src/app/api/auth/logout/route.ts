import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { destroySession } from "@/lib/authMiddleware";

async function performLogout(req: NextRequest) {
  // Extract user ID from token to destroy session
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
    const token = cookies.token || req.cookies.get("token")?.value;
    
    if (token) {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      const userType = decoded.role === 'employee' ? 'employee' : 'admin';
      destroySession(decoded.id, userType);
    }
  } catch (e: any) {
    console.error('Error destroying session:', e?.message);
  }

  const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });

  response.headers.set("Set-Cookie", cookie.serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  }));

  return response;
}

export async function GET(req: NextRequest) {
  return performLogout(req);
}

export async function POST(req: NextRequest) {
  return performLogout(req);
}
