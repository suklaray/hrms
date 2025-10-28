import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !["admin", "hr", "superadmin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { empid, verificationStatus } = req.body;

    if (!empid || typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: empid },
      data: { verified: verificationStatus ? 'verified' : 'not_verified' },
    });

    // Don't refresh JWT token - admin/HR should keep their own session
    // Only the employee being verified will get updated verification status on next login

    res.status(200).json({
      message: `Employee ${verificationStatus ? 'verified' : 'unverified'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}