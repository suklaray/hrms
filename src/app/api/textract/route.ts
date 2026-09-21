import { NextRequest, NextResponse } from "next/server";
import AWS from "aws-sdk";

// AWS Textract config
const textract = new AWS.Textract({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(req: NextRequest) {
  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.error("AWS credentials not configured");
    return NextResponse.json({ error: "Document processing service not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("document") as File | null;
    
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const params: AWS.Textract.AnalyzeDocumentRequest = {
      Document: { Bytes: buffer },
      FeatureTypes: ["FORMS"],
    };

    const data = await textract.analyzeDocument(params).promise();
    
    const extractedText = (data.Blocks || [])
      .filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text)
      .join("\n");

    return NextResponse.json({
      extractedText,
      success: true
    }, { status: 200 });

  } catch (err: any) {
    console.error("Processing failed:", err);
    
    // Handle specific AWS errors
    if (err.code === 'InvalidSignatureException' || err.code === 'SignatureDoesNotMatch') {
      return NextResponse.json({ error: "AWS authentication failed. Please check credentials." }, { status: 500 });
    }
    if (err.code === 'TokenRefreshRequired' || err.message?.includes('security token')) {
      return NextResponse.json({ error: "AWS security token expired. Please refresh credentials." }, { status: 500 });
    }
    if (err.code === 'AccessDenied') {
      return NextResponse.json({ error: "AWS access denied. Please check permissions." }, { status: 500 });
    }
    
    return NextResponse.json({ error: err.message || "Document processing failed" }, { status: 500 });
  }
}
