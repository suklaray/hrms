// pages/api/compliance/compliance.js
import { verifyHRToken } from "@/lib/auth-hr";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method Not Allowed" });

  const user = await verifyHRToken(req);
  if (!user)
    return res.status(401).json({ message: "Unauthorized" });

  try {
    const users = await prisma.users.findMany({
      where: {
        status: { not: "Inactive" } // Exclude inactive employees
      }
    });
    const employees = await prisma.employees.findMany({
      include: {
        bank_details: true,
      },
    });

    const requiredFields = ["aadhar_card", "pan_card", "resume"];
    const optionalFields = ["experience_certificate"];

    const result = users.map((u) => {
      const emp = employees.find(
        (e) => e.email?.toLowerCase() === u.email?.toLowerCase()
      );

      const missing = [];
      const optionalMissing = [];

      // If no employee record found
      if (!emp) {
        missing.push(...requiredFields, "checkbook_document");
      } else {
        // Check required documents
        requiredFields.forEach((field) => {
          if (!emp[field] || emp[field].trim() === "") {
            missing.push(field);
          }
        });

        // Check optional documents
        optionalFields.forEach((field) => {
          if (!emp[field] || emp[field].trim() === "") {
            optionalMissing.push(field);
          }
        });

        // Check bank checkbook document
        const hasCheckbook = emp.bank_details?.some(
          (b) => b.checkbook_document && b.checkbook_document.trim() !== ""
        );
        if (!hasCheckbook) {
          missing.push("checkbook_document");
        }
      }

      // Determine status
      let status = "Compliant";
      if (missing.length > 0) status = "Non-compliant";

      return {
        empid: u.empid,
        name: u.name,
        email: u.email,
        position: u.position || "—",
        role: u.role,
        status,
        lastUpdated:
          emp?.created_at?.toISOString().split("T")[0] || "—",
        // Include all document fields from employee record
        resume: emp?.resume,
        profile_photo: emp?.profile_photo,
        aadhar_card: emp?.aadhar_card,
        pan_card: emp?.pan_card,
        bank_details: emp?.bank_details?.[0]?.checkbook_document,
        education_certificates: emp?.education_certificates,
        experience_certificate: emp?.experience_certificate,
        documents: [
          {
            type: "Aadhar Card",
            status: emp?.aadhar_card?.trim() ? "Uploaded" : "Missing",
          },
          {
            type: "PAN Card",
            status: emp?.pan_card?.trim() ? "Uploaded" : "Missing",
          },
          {
            type: "Resume",
            status: emp?.resume?.trim() ? "Uploaded" : "Missing",
          },
          {
            type: "Bank Checkbook",
            status:
              emp?.bank_details?.some(
                (b) => b.checkbook_document?.trim()
              )
                ? "Uploaded"
                : "Missing",
          },
          {
            type: "Experience Certificate",
            status: emp?.experience_certificate?.trim()
              ? "Uploaded"
              : "Optional / Missing",
          },
        ],
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Compliance API error:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error" });
  }
}
