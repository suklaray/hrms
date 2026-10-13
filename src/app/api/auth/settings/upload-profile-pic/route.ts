import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.SETTINGS_PROFILE]);
  if (error) return error;

  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookie.parse(cookieHeader);
  const token = cookies.token || cookies.employeeToken || req.cookies.get("token")?.value || req.cookies.get("employeeToken")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  try {
    const formData = await req.formData();
    const file = formData.get("profilePic") as File | null;
    if (!file || typeof file === "string" || !file.name) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: { id: true, empid: true, email: true, role: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const fileName = `${Date.now()}-${file.name}`;
    const finalPath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    await fs.promises.writeFile(finalPath, Buffer.from(bytes));

    const imageUrl = `/uploads/${fileName}`;

    await prisma.users.update({ where: { id: user.id }, data: { profile_photo: imageUrl } });

    try {
      await prisma.employees.updateMany({ where: { email: user.email }, data: { profile_photo: imageUrl } });
    } catch {}

    return NextResponse.json({ message: "Profile photo uploaded successfully" }, { status: 200 });
  } catch (error) {
    console.error("Database update error:", error);
    return NextResponse.json({ error: "Failed to update profile photo" }, { status: 500 });
  }
}
