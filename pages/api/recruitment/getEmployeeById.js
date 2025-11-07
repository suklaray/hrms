// pages/api/recruitment/getEmployeeById.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Candidate ID is required" });
    }

    try {
      // Fetch from candidate_details table instead of employees
      const candidateDetails = await prisma.candidate_details.findFirst({
        where: {
          candidate_id: id,
        },
        include: {
          addresses: true,
          bank_details: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      if (!candidateDetails) {
        return res.status(404).json({ error: "Candidate details not found" });
      }

      // Transform to match existing frontend structure
      const transformedData = {
        empid: candidateDetails.id,
        candidate_id: candidateDetails.candidate_id,
        name: candidateDetails.name,
        email: candidateDetails.email,
        contact_no: candidateDetails.contact_no,
        gender: candidateDetails.gender,
        dob: candidateDetails.dob,
        highest_qualification: candidateDetails.highest_qualification,
        aadhar_number: candidateDetails.aadhar_number,
        pan_number: candidateDetails.pan_number,
        aadhar_card: candidateDetails.aadhar_card,
        pan_card: candidateDetails.pan_card,
        education_certificates: candidateDetails.education_certificates,
        resume: candidateDetails.resume,
        experience_certificate: candidateDetails.experience_certificate,
        profile_photo: candidateDetails.profile_photo,
        created_at: candidateDetails.created_at,
      };

      return res.status(200).json(transformedData);
    } catch (error) {
      console.error("Error fetching candidate details:", error);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
