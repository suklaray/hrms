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

// Check if AWS credentials are available
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

const textract = hasAWSCredentials 
  ? new AWS.Textract({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    })
  : null;

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

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    const docType = fields.docType?.[0] || fields.docType;
    
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // If Textract is not available, return empty result
    if (!textract) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(file.filepath);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
      
      return res.status(200).json({
        extractedNumber: null,
        docType,
        message: "Document analysis service not available. Please enter details manually."
      });
    }

    const buffer = fs.readFileSync(file.filepath);

    const params = {
      Document: { Bytes: buffer },
      FeatureTypes: ["FORMS"],
    };

    try {
      const data = await new Promise((resolve, reject) => {
        textract.analyzeDocument(params, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

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
      try {
        fs.unlinkSync(file.filepath);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }

      return res.status(200).json({
        extractedNumber,
        docType,
      });

    } catch (textractError) {
      console.error("Textract error:", textractError);
      
      // Clean up uploaded file on error
      try {
        fs.unlinkSync(file.filepath);
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
      
      return res.status(200).json({
        extractedNumber: null,
        docType,
        message: "Document analysis failed. Please enter details manually."
      });
    }

  } catch (err) {
    console.error("Processing failed:", err);
    return res.status(500).json({ error: "Processing failed" });
  }
}