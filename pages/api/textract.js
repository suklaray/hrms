import { formidable } from "formidable";
import fs from "fs";
import AWS from "aws-sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.error("AWS credentials not configured");
    return res.status(500).json({ error: "Document processing service not configured" });
  }

  const form = formidable({
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      const file = files.document?.[0] || files.document;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Read file buffer directly from formidable
      const buffer = fs.readFileSync(file.filepath);

      const params = {
        Document: { Bytes: buffer },
        FeatureTypes: ["FORMS"],
      };

      // Use promise-based approach instead of callback
      const data = await textract.analyzeDocument(params).promise();
      
      const extractedText = (data.Blocks || [])
        .filter((b) => b.BlockType === "LINE")
        .map((b) => b.Text)
        .join("\n");

      return res.status(200).json({
        extractedText: extractedText,
        success: true
      });

    } catch (err) {
      console.error("Processing failed:", err);
      
      // Handle specific AWS errors
      if (err.code === 'InvalidSignatureException' || err.code === 'SignatureDoesNotMatch') {
        return res.status(500).json({ error: "AWS authentication failed. Please check credentials." });
      }
      if (err.code === 'TokenRefreshRequired' || err.message?.includes('security token')) {
        return res.status(500).json({ error: "AWS security token expired. Please refresh credentials." });
      }
      if (err.code === 'AccessDenied') {
        return res.status(500).json({ error: "AWS access denied. Please check permissions." });
      }
      
      res.status(500).json({ error: err.message || "Document processing failed" });
    }
  });
}