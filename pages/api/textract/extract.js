import { formidable } from "formidable";
import fs from "fs";
import path from "path";
import AWS from "aws-sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const textract = new AWS.Textract({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const extractAadharNumber = (text) => {
  const aadharRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  const matches = text.match(aadharRegex);
  return matches ? matches[0].replace(/\s/g, '') : null;
};

const extractPANNumber = (text) => {
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
  const matches = text.match(panRegex);
  return matches ? matches[0] : null;
};

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
      const file = files.file?.[0] || files.file;
      const docType = fields.docType?.[0] || fields.docType;
      
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const buffer = fs.readFileSync(file.filepath);

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
          .join(" ");

        let extractedNumber = null;
        
        if (docType === 'aadhar') {
          extractedNumber = extractAadharNumber(extractedText);
        } else if (docType === 'pan') {
          extractedNumber = extractPANNumber(extractedText);
        }

        // Clean up uploaded file
        fs.unlinkSync(file.filepath);

        return res.status(200).json({
          extractedNumber,
          docType,
        });
      });

    } catch (err) {
      console.error("Processing failed:", err);
      res.status(500).json({ error: "Processing failed" });
    }
  });
}