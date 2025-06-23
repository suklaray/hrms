import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import AWS from "aws-sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "/uploads/tmp-uploads");

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const textract = new AWS.Textract({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    filename: (name, ext, part, form) => part.originalFilename,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "File upload failed" });

    try {
      const file = files.document?.[0] || files.document;
      const filePath = file.filepath;
      const buffer = fs.readFileSync(filePath);

      const params = {
        Document: { Bytes: buffer },
        FeatureTypes: ["FORMS"],
      };

      textract.analyzeDocument(params, (error, data) => {
        // Delete the uploaded file after processing
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("File deletion error:", unlinkErr);
        });

        if (error) {
          console.error("Textract error:", error);
          return res.status(500).json({ error: "Textract failed" });
        }

        const lines = (data.Blocks || [])
          .filter((b) => b.BlockType === "LINE")
          .map((b) => b.Text)
          .join("\n");

        res.status(200).json({ extractedText: lines });
      });
    } catch (err) {
      console.error("Processing failed:", err);
      res.status(500).json({ error: "Processing failed" });
    }
  });
}
