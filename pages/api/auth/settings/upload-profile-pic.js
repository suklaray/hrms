// pages/api/auth/settings/upload-profile-pic.js

import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }

  const form = new IncomingForm({
    keepExtensions: true,
    uploadDir: path.join(process.cwd(), "/public/uploads"),
  });

  if (!fs.existsSync(form.uploadDir)) fs.mkdirSync(form.uploadDir, { recursive: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "File upload error" });

    const file = files.profilePic?.[0]; 
    if (!file || !file.filepath) return res.status(400).json({ error: "No file uploaded" });

    const fileName = `${Date.now()}-${file.originalFilename}`;
    const finalPath = path.join(form.uploadDir, fileName);

    fs.renameSync(file.filepath, finalPath); 

    const imageUrl = `/uploads/${fileName}`;

    // Try to update user by email first
    let user = await prisma.users.findUnique({ where: { email: decoded.email } });
    
    if (!user) {
      // If not found by email, try by empid (for employees who might login with empid)
      user = await prisma.users.findUnique({ where: { empid: decoded.email } });
    }
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await prisma.users.update({
      where: { id: user.id },
      data: { profile_photo: imageUrl },
    });

    return res.status(200).json({ message: "Image uploaded", imageUrl });
  });
}
