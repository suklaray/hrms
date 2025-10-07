import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: { email: true }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const employee = await prisma.employees.findFirst({
      where: { email: user.email },
      select: {
        aadhar_card: true,
        pan_card: true,
        resume: true,
        profile_photo: true,
        education_certificates: true,
      }
    });

    const requiredDocs = [
      employee?.aadhar_card,
      employee?.pan_card, 
      employee?.resume,
      employee?.profile_photo,
      employee?.education_certificates
    ];

    const submittedCount = requiredDocs.filter(doc => doc && doc.trim() !== '').length;
    const submitted = submittedCount >= 4;

    res.status(200).json({ submitted });
  } catch (error) {
    console.error("Error checking document status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
