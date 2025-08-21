import { formidable } from "formidable";
import fs from "fs";
import prisma from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const form = formidable({ 
      multiples: false, 
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB limit
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return res.status(400).json({ error: "Form parsing error: " + err.message });
      }

      try {
        // Extract field values (formidable returns arrays)
        const getValue = (field) => Array.isArray(field) ? field[0] : field;
        
        const name = getValue(fields.name);
        const email = getValue(fields.email);
        const interviewDate = getValue(fields.interviewDate);
        const contact_number = getValue(fields.contact_number);

        if (!name || !email || !interviewDate || !contact_number) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate contact number (10 digits)
        if (!/^\d{10}$/.test(contact_number)) {
          return res.status(400).json({ error: "Contact number must be exactly 10 digits" });
        }

        // Check if email already exists
        const existingEmail = await prisma.candidates.findFirst({
          where: { email: email }
        });

        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }

        // Generate candidate ID
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const datePrefix = `${year}${month}${day}`;

        const count = await prisma.candidates.count({
          where: {
            candidate_id: {
              startsWith: datePrefix
            }
          }
        });

        const serialStr = String(count + 1).padStart(6, "0");
        const candidateId = `${datePrefix}${serialStr}`;

        // Process CV file
        let resumeData = null;
        let resumeFilename = null;
        let resumeMimetype = null;

        const file = files.cv?.[0] || files.cv;
        if (file) {
          // Validate file type
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are allowed" });
          }

          resumeData = fs.readFileSync(file.filepath);
          resumeFilename = file.originalFilename;
          resumeMimetype = file.mimetype;
        }

        // Create candidate record
        await prisma.candidates.create({
          data: {
            candidate_id: candidateId,
            name: name,
            email: email,
            contact_number: contact_number,
            interview_date: new Date(interviewDate),
            resume_data: resumeData,
            resume_filename: resumeFilename,
            resume_mimetype: resumeMimetype,
            form_link: null,
            status: "Pending"
          }
        });

        res.status(200).json({ 
          message: "Candidate added successfully", 
          candidateId: candidateId 
        });

      } catch (err) {
        console.error("DB insert error:", err);
        res.status(500).json({ error: "Database error: " + err.message });
      }
    });
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
}