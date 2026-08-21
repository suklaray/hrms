import prisma from '@/lib/prisma';

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid record ID.',
    });
  }

  let record;

  try {
    record = await prisma.parsed_resumes.findUnique({
      where: { id: Number(id) },
      select: {
        resume_file_path: true,
        original_file_name: true,
        resume_mime_type: true,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'DB error: ' + err.message,
    });
  }

  if (!record || !record.resume_file_path) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found.',
    });
  }

  const filePath = path.join(
    process.cwd(),
    'public',
    record.resume_file_path.replace(/^\//, '')
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'File not found on server.',
    });
  }

  // Return the actual public URL instead of the PDF itself
  const resumeUrl = record.resume_file_path.startsWith('/')
    ? record.resume_file_path
    : `/${record.resume_file_path}`;

  return res.status(200).json({
    success: true,
    url: resumeUrl,
    filename: record.original_file_name || 'resume',
    mimeType: record.resume_mime_type || 'application/octet-stream',
  });
}