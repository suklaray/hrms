import fs from 'fs';
import path from 'path';

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_SIZE = 5 * 1024 * 1024;

export function validateResumeFile(file) {
  const mimetype = file.mimetype || file.type || '';
  const size = file.size || 0;
  const name = (file.originalFilename || file.name || '').toLowerCase();

  if (size > MAX_SIZE) return { valid: false, error: 'File size exceeds 5MB limit.' };
  if (size === 0) return { valid: false, error: 'File is empty.' };

  const ext = path.extname(name);
  const validMime = SUPPORTED_TYPES.includes(mimetype);
  const validExt = ['.pdf', '.doc', '.docx', '.txt'].includes(ext);

  if (!validMime && !validExt) {
    return { valid: false, error: 'Unsupported file type. Allowed: PDF, DOC, DOCX, TXT.' };
  }
  return { valid: true };
}

async function extractFromPDF(buffer) {
  const { PDFParse } = await import('pdf-parse');

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    return (result.text || '').trim();
  } catch (error) {
    console.error('PDF extraction error:', error);

    throw new Error(
      `PDF text extraction failed: ${error.message}`
    );
  } finally {
    await parser.destroy();
  }
}

async function extractFromDOCX(buffer) {
  const mammoth = await import('mammoth');
  const result = await (mammoth.default || mammoth).extractRawText({ buffer });
  return (result.value || '').trim();
}

async function extractFromDOC(filePath) {
  try {
    const mammoth = await import('mammoth');
    const result = await (mammoth.default || mammoth).extractRawText({ path: filePath });
    const text = (result.value || '').trim();
    if (text.length > 50) return text;
  } catch { /* fall through */ }

  const raw = fs.readFileSync(filePath, 'latin1');
  const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim();
  return printable.length > 50 ? printable : '';
}

export async function extractResumeText(file) {
  const mimetype = file.mimetype || file.type || '';
  const name = (file.originalFilename || file.name || '').toLowerCase();
  const ext = path.extname(name);
  const filePath = file.filepath || file.path;
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf' || ext === '.pdf') return extractFromPDF(buffer);

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) return extractFromDOCX(buffer);

  if (mimetype === 'application/msword' || ext === '.doc') return extractFromDOC(filePath);

  if (mimetype === 'text/plain' || ext === '.txt') return buffer.toString('utf8').trim();

  return '';
}
