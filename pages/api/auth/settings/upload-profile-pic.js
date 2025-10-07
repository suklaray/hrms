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

    try {
      // Find user by empid from token
      const user = await prisma.users.findUnique({ 
        where: { empid: decoded.empid },
        select: { id: true, empid: true, email: true, role: true }
      });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const fileName = `${Date.now()}-${file.originalFilename}`;
      const finalPath = path.join(form.uploadDir, fileName);

      fs.renameSync(file.filepath, finalPath);

      const imageUrl = `/uploads/${fileName}`;
      
      // Update profile photo in users table
      await prisma.users.update({
        where: { id: user.id },
        data: {
          profile_photo: imageUrl
        },
      });

      // For regular employees, also update in employees table if record exists
      if (user.role === 'employee') {
        try {
          await prisma.employees.updateMany({
            where: { email: user.email },
            data: { profile_photo: imageUrl }
          });
        } catch (employeeUpdateError) {
          console.log("Employee record not found or update failed:", employeeUpdateError);
          // This is not critical for admin users
        }
      }
      
      return res.status(200).json({ message: "Profile photo uploaded successfully" });
    } catch (error) {
      console.error("Database update error:", error);
      return res.status(500).json({ error: "Failed to update profile photo" });
    }
  });
}
