import { NextRequest, NextResponse } from "next/server";
import AWS from "aws-sdk";

// Check if AWS credentials are available
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

const textract = hasAWSCredentials 
  ? new AWS.Textract({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    })
  : null;

const extractAadharNumber = (text: string) => {
  const aadharRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  const matches = text.match(aadharRegex);
  return matches ? matches[0].replace(/\s/g, '') : null;
};

const extractPANNumber = (text: string) => {
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
  const matches = text.match(panRegex);
  return matches ? matches[0] : null;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string) || '';
    
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // If Textract is not available, return empty result
    if (!textract) {
      return NextResponse.json({
        extractedNumber: null,
        docType,
        message: "Document analysis service not available. Please enter details manually."
      }, { status: 200 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const params: AWS.Textract.AnalyzeDocumentRequest = {
      Document: { Bytes: buffer },
      FeatureTypes: ["FORMS"],
    };

    try {
      const data: any = await textract.analyzeDocument(params).promise();

      const extractedText = (data.Blocks || [])
        .filter((b: any) => b.BlockType === "LINE")
        .map((b: any) => b.Text)
        .join(" ");

      let extractedNumber: string | null = null;
      
      if (docType === 'aadhar') {
        extractedNumber = extractAadharNumber(extractedText);
      } else if (docType === 'pan') {
        extractedNumber = extractPANNumber(extractedText);
      }

      return NextResponse.json({
        extractedNumber,
        docType,
      }, { status: 200 });

    } catch (textractError) {
      console.error("Textract error:", textractError);
      return NextResponse.json({
        extractedNumber: null,
        docType,
        message: "Document analysis failed. Please enter details manually."
      }, { status: 200 });
    }

  } catch (err) {
    console.error("Processing failed:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
