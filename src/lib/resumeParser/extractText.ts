//lib/resumeParser/extractText.ts

import fs from "fs";
import path from "path";

const SUPPORTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_OCR_PAGES = 10;

interface ResumeFile {
  mimetype?: string;
  type?: string;
  size?: number;
  originalFilename?: string;
  name?: string;
  filepath?: string;
  path?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateResumeFile(file: ResumeFile): ValidationResult {
  const mimetype = file.mimetype || file.type || "";
  const size = file.size || 0;
  const name = (
    file.originalFilename ||
    file.name ||
    ""
  ).toLowerCase();

  if (size > MAX_SIZE) {
    return {
      valid: false,
      error: "File size exceeds 5MB limit.",
    };
  }

  if (size === 0) {
    return {
      valid: false,
      error: "File is empty.",
    };
  }

  const ext = path.extname(name);

  const validMime = SUPPORTED_TYPES.includes(mimetype);
  const validExt = [".pdf", ".doc", ".docx", ".txt"].includes(ext);

  if (!validMime && !validExt) {
    return {
      valid: false,
      error:
        "Unsupported file type. Allowed: PDF, DOC, DOCX, TXT.",
    };
  }

  return {
    valid: true,
  };
}

async function ocrScannedPDF(buffer: Buffer): Promise<string> {
  let worker: Awaited<
    ReturnType<
      typeof import("tesseract.js").createWorker
    >
  > | null = null;

  let parser: InstanceType<
    (typeof import("pdf-parse"))["PDFParse"]
  > | null = null;

  try {
    const { PDFParse } = await import("pdf-parse");

    // getScreenshot() uses pdf-parse's own bundled @napi-rs/canvas internally
    // — no need to call pdfjs-dist page.render() which crashes Node.js
    parser = new PDFParse({
      data: buffer,
    });

    console.log("Rendering PDF pages to images...");

    const screenshots = await parser.getScreenshot({
      scale: 1.5,
    });

    if (!screenshots?.pages?.length) {
      throw new Error("No pages rendered from PDF.");
    }

    const pages = screenshots.pages.slice(0, MAX_OCR_PAGES);

    console.log(
      `PDF loaded. Total pages: ${screenshots.pages.length}, processing: ${pages.length}`
    );

    const { createWorker } = await import("tesseract.js");

    // createWorker with no args avoids downloading eng.traineddata to a temp path
    // langPath points to tesseract.js bundled data
    worker = await createWorker("eng", 1, {
      logger: () => {},
    });

    const pageTexts: string[] = [];

    for (let i = 0; i < pages.length; i++) {
      console.log(
        `OCR processing page ${i + 1}/${pages.length}`
      );

      try {
        // pages[i].data is Uint8Array PNG — convert to Buffer for Tesseract
        const imgBuffer = Buffer.from(pages[i].data);

        const { data } = await worker.recognize(imgBuffer);

        const text = (data.text || "").trim();

        console.log(
          `Page ${i + 1} OCR completed. Text length: ${text.length}`
        );

        if (text) {
          pageTexts.push(text);
        }
      } catch (pageErr: unknown) {
        const errorMessage =
          pageErr instanceof Error
            ? pageErr.message
            : String(pageErr);

        console.error(
          `Page ${i + 1} OCR failed:`,
          errorMessage
        );
      }
    }

    const finalText = pageTexts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    console.log(
      `Final OCR text length: ${finalText.length}`
    );

    if (!finalText) {
      throw new Error("OCR produced no text.");
    }

    return finalText;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }

    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // ignore
      }
    }
  }
}

export async function extractFromPDF(
  buffer: Buffer
): Promise<string> {
  // Step 1: text-based extraction
  try {
    const { PDFParse } = await import("pdf-parse");

    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    const text = (result.text || "").trim();

    console.log(
      `PDF extracted text length: ${text.length}`
    );

    if (text.length >= 50) {
      console.log("PDF text extracted successfully.");
      return text;
    }
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.error(
      "PDF text extraction failed:",
      errorMessage
    );
  }

  // Step 2: scanned PDF — OCR fallback
  console.log(
    "PDF has no usable text. Switching to OCR."
  );

  try {
    return await ocrScannedPDF(buffer);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.error("OCR failed:", errorMessage);

    throw new Error(
      "Unable to read this resume. Please upload a clearer PDF or a DOCX/TXT version."
    );
  }
}

export async function extractFromDOCX(
  buffer: Buffer
): Promise<string> {
  const mammoth = await import("mammoth");

  const result = await (
    mammoth.default || mammoth
  ).extractRawText({
    buffer,
  });

  return (result.value || "").trim();
}

export async function extractFromDOC(
  filePath: string
): Promise<string> {
  try {
    const mammoth = await import("mammoth");

    const result = await (
      mammoth.default || mammoth
    ).extractRawText({
      path: filePath,
    });

    const text = (result.value || "").trim();

    if (text.length > 50) {
      return text;
    }
  } catch {
    // fall through
  }

  const raw = fs.readFileSync(filePath, "latin1");

  const printable = raw
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s{3,}/g, " ")
    .trim();

  return printable.length > 50 ? printable : "";
}

export async function extractResumeText(
  file: ResumeFile
): Promise<string> {
  const mimetype = file.mimetype || file.type || "";

  const name = (
    file.originalFilename ||
    file.name ||
    ""
  ).toLowerCase();

  const ext = path.extname(name);

  const filePath = file.filepath || file.path;

  if (!filePath) {
    throw new Error("Resume file path is missing.");
  }

  const buffer = fs.readFileSync(filePath);

  if (
    mimetype === "application/pdf" ||
    ext === ".pdf"
  ) {
    return extractFromPDF(buffer);
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".docx"
  ) {
    return extractFromDOCX(buffer);
  }

  if (
    mimetype === "application/msword" ||
    ext === ".doc"
  ) {
    return extractFromDOC(filePath);
  }

  if (
    mimetype === "text/plain" ||
    ext === ".txt"
  ) {
    return buffer.toString("utf8").trim();
  }

  return "";
}
