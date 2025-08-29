import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { empid } = req.query;

    // Check if employee has submitted documents
    const employee = await prisma.employees.findFirst({
      where: { 
        email: user.email 
      },
      select: {
        aadhar_card: true,
        pan_card: true,
        resume: true,
        profile_photo: true,
        education_certificates: true,
        experience_certificate: true,
      }
    });

    // Check if most required documents are submitted
    const requiredDocs = [
      employee?.aadhar_card,
      employee?.pan_card, 
      employee?.resume,
      employee?.profile_photo,
      employee?.education_certificates
    ];

    const submittedCount = requiredDocs.filter(doc => doc && doc.trim() !== '').length;
    const submitted = submittedCount >= 4; // At least 4 out of 5 required docs

    res.status(200).json({ submitted });
  } catch (error) {
    console.error("Error checking document status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}