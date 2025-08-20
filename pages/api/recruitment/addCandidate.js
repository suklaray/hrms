import formidable from "formidable";
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
      maxFileSize: 10 * 1024 * 1024
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return res.status(400).json({ error: "Form parsing error: " + err.message });
      }

      try {
        const { name, email, interviewDate, contact_number } = fields;
        const file = files.cv;

        if (!name || !email || !interviewDate || !contact_number) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const existingEmail = await prisma.candidates.findFirst({
          where: { email: Array.isArray(email) ? email[0] : email }
        });

        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }

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

        let resumeData = null;
        let resumeFilename = null;
        let resumeMimetype = null;

        if (file) {
          const fileArray = Array.isArray(file) ? file : [file];
          const fileObj = fileArray[0];
          
          resumeData = fs.readFileSync(fileObj.filepath);
          resumeFilename = fileObj.originalFilename || fileObj.newFilename;
          resumeMimetype = fileObj.mimetype;
        }

        await prisma.candidates.create({
          data: {
            candidate_id: candidateId,
            name: Array.isArray(name) ? name[0] : name,
            email: Array.isArray(email) ? email[0] : email,
            contact_number: Array.isArray(contact_number) ? contact_number[0] : contact_number,
            interview_date: new Date(Array.isArray(interviewDate) ? interviewDate[0] : interviewDate),
            resume_data: resumeData,
            resume_filename: resumeFilename,
            resume_mimetype: resumeMimetype,
            form_link: null,
            status: "Pending"
          }
        });

        res.status(200).json({ message: "Candidate added successfully", candidateId });
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