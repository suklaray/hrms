import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { destroySession } from "@/lib/authMiddleware";

async function performLogout(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
    const token = cookies.token || req.cookies.get("token")?.value;
    const sessionToken = cookies.sessionToken || req.cookies.get("sessionToken")?.value;

    if (sessionToken) {
      await destroySession(sessionToken);
      await prisma.session.deleteMany({ where: { sessionToken } }).catch(() => undefined);
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { id?: number | string; role?: string };
        if (decoded?.id) {
          await prisma.session.deleteMany({ where: { userId: Number(decoded.id) } }).catch(() => undefined);
        }
      } catch (error) {
        console.error("Error destroying session:", error);
      }
    }
  } catch (error) {
    console.error("Error preparing logout:", error);
  }

  const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("sessionToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  });

  return response;
}

export async function GET(req: NextRequest) {
  return performLogout(req);
}

export async function POST(req: NextRequest) {
  return performLogout(req);
}
