import formidable from "formidable";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

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

      // Check if the email already exists in the database
      const [existingEmail] = await db.query(
        `SELECT * FROM candidates WHERE email = ?`,
        [email[0]]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Save the file
      const filename = path.basename(file[0].filepath);
      const filePath = `/uploads/cv/${filename}`;

      // Generate new candidate_id: YYYYMMDD000001
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // Query to get count of existing candidates today
      const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM candidates WHERE candidate_id LIKE ?`,
        [`${datePrefix}%`]
      );

      const serial = rows[0].count + 1;
      const serialStr = String(serial).padStart(6, '0');
      const candidateId = `${datePrefix}${serialStr}`;

      const formLink = null; // Placeholder, updated later

      // Insert the candidate record into the database
      await db.query(
        `INSERT INTO candidates (candidate_id, name, email, contact_number, interview_date, resume, form_link, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [candidateId, name[0], email[0], contact_number[0], interviewDate[0], filePath, formLink, "Pending"]
      );

      res.status(200).json({ message: "Candidate added successfully", candidateId });
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
