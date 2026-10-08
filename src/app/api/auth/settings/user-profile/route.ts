import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const imageTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        role: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let profilePic = user.profile_photo;

    if (!profilePic) {
      const employeeById = await prisma.employees.findFirst({
        where: { main_employee_id: user.empid },
        select: { profile_photo: true },
      });
      profilePic = employeeById?.profile_photo;

      if (!profilePic) {
        const employeeByEmail = await prisma.employees.findFirst({
          where: { email: user.email },
          select: { profile_photo: true },
        });
        profilePic = employeeByEmail?.profile_photo;
      }
    }

    if (req.nextUrl.searchParams.get("photo") === "1") {
      if (!profilePic?.startsWith("/uploads/")) {
        return NextResponse.json({ error: "Profile photo not found" }, { status: 404 });
      }

      const fileName = profilePic.slice("/uploads/".length);
      if (!fileName || path.basename(fileName) !== fileName) {
        return NextResponse.json({ error: "Invalid profile photo path" }, { status: 400 });
      }

      const contentType = imageTypes[path.extname(fileName).toLowerCase()];
      if (!contentType) {
        return NextResponse.json({ error: "Unsupported profile photo type" }, { status: 415 });
      }

      const uploadDirectory = path.resolve(process.cwd(), "public", "uploads");
      const filePath = path.resolve(uploadDirectory, fileName);
      if (!filePath.startsWith(`${uploadDirectory}${path.sep}`)) {
        return NextResponse.json({ error: "Invalid profile photo path" }, { status: 400 });
      }

      const image = await fs.readFile(filePath);
      return new NextResponse(image, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json({
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: profilePic?.startsWith("/uploads/")
        ? "/api/auth/settings/user-profile?photo=1"
        : profilePic || null,
    }, { status: 200 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Profile photo file not found" }, { status: 404 });
    }
    console.error("Database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
