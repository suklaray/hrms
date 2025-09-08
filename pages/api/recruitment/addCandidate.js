import { formidable } from "formidable";
import fs from "fs";
import path from "path";
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
        const interviewTime = getValue(fields.interviewTime);
        const contact_number = getValue(fields.contact_number);

        if (!name || !email || !interviewDate || !interviewTime || !contact_number) {
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

        // Find the highest candidate ID for today's date
        const lastCandidate = await prisma.candidates.findFirst({
          where: {
            candidate_id: {
              startsWith: datePrefix
            }
          },
          orderBy: {
            candidate_id: 'desc'
          }
        });

        let nextSerial = 1;
        if (lastCandidate) {
          // Extract the serial number from the last candidate ID
          const lastSerial = parseInt(lastCandidate.candidate_id.slice(-6));
          nextSerial = lastSerial + 1;
        }

        const serialStr = String(nextSerial).padStart(6, "0");
        const candidateId = `${datePrefix}${serialStr}`;

        // Double-check for uniqueness
        const existingId = await prisma.candidates.findFirst({
          where: { candidate_id: candidateId }
        });
        
        if (existingId) {
          return res.status(500).json({ error: "ID generation conflict. Please try again." });
        }

        // Process CV file
        let resumePath = null;

        const file = files.cv?.[0] || files.cv;
        if (file) {
          // Validate file type
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are allowed" });
          }

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const fileName = `${Date.now()}-${file.originalFilename}`;
          const finalPath = path.join(uploadsDir, fileName);
          
          // Move file to uploads directory
          fs.copyFileSync(file.filepath, finalPath);
          fs.unlinkSync(file.filepath);
          resumePath = `/uploads/${fileName}`;
        }

        // Create candidate record
        await prisma.candidates.create({
          data: {
            candidate_id: candidateId,
            name: name,
            email: email,
            contact_number: contact_number,
            interview_date: new Date(interviewDate),
            interview_timing: interviewTime,
            resume: resumePath,
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