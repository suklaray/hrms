import formidable from "formidable";
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

  const form = formidable({ multiples: false, keepExtensions: true });

  const uploadDir = path.join(process.cwd(), "public/uploads/cv");
  fs.mkdirSync(uploadDir, { recursive: true });

  form.uploadDir = uploadDir;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(400).json({ error: "Form parsing error" });
    }

    try {
      const { name, email, interviewDate, contact_number } = fields;
      const file = files.cv;

      if (!name || !email || !interviewDate || !contact_number || !file) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existingEmail = await prisma.candidates.findMany({
        where: { email: email[0] }
      });

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const filename = path.basename(file[0].filepath);
      const filePath = `/uploads/cv/${filename}`;

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

      await prisma.candidates.create({
        data: {
          candidate_id: candidateId,
          name: name[0],
          email: email[0],
          contact_number: contact_number[0],
          interview_date: new Date(interviewDate[0]),
          resume: filePath,
          form_link: null,
          status: "Pending"
        }
      });

      res.status(200).json({ message: "Candidate added successfully", candidateId });
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
