import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import AWS from "aws-sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Final upload directory
const uploadDir = path.join(process.cwd(), 'public/uploads');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
 
// AWS Textract config
const textract = new AWS.Textract({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    filename: (name, ext, part) => `${Date.now()}-${part.originalFilename}`,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      const file = files.document?.[0] || files.document;
      const filePath = file.filepath;
      const buffer = fs.readFileSync(filePath);

      const params = {
        Document: { Bytes: buffer },
        FeatureTypes: ["FORMS"],
      };

      textract.analyzeDocument(params, (error, data) => {
  if (error) {
    console.error("Textract error:", error);
    return res.status(500).json({ error: "Textract failed" });
  }

  const extractedText = (data.Blocks || [])
    .filter((b) => b.BlockType === "LINE")
    .map((b) => b.Text)
    .join("\n");

    return res.status(200).json({
      extractedText: extractedText,
      filePath: filePath, 
    });
  });

    } catch (err) {
      console.error("Processing failed:", err);
      res.status(500).json({ error: "Processing failed" });
    }
  });
}
