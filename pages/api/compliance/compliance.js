// pages/api/compliance/compliance.js
import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method Not Allowed" });

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('=== COMPLIANCE API DEBUG ===');
    console.log('Decoded token:', { empid: decoded.empid, role: decoded.role });
    
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    console.log('Current user from DB:', currentUser);

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define role-based filtering
    let roleFilter = [];
    if (currentUser.role === 'hr') {
      roleFilter = ['employee'];
    } else if (currentUser.role === 'admin') {
      roleFilter = ['hr', 'employee'];
    } else if (currentUser.role === 'superadmin') {
      roleFilter = ['admin', 'hr', 'employee'];
    }

    console.log('Role filter applied:', roleFilter);

    const users = await prisma.users.findMany({
      where: {
        status: { not: "Inactive" },
        role: { in: roleFilter }
      }
    });

    console.log('Users found:', users.length);
    console.log('User roles found:', users.map(u => ({ empid: u.empid, role: u.role })));

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
        employee_type: u.employee_type,
        duration_months: u.duration_months,
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

    console.log('Final result count:', result.length);
    console.log('Final result roles:', result.map(r => ({ empid: r.empid, role: r.role })));

    return res.status(200).json(result);
  } catch (err) {
    console.error("Compliance API error:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error" });
  }
}
