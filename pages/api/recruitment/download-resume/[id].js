import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: id },
      select: { resume: true },
    });

    if (!candidate || !candidate.resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resumePath = candidate.resume.startsWith('/') ? candidate.resume.substring(1) : candidate.resume;
    const filePath = path.join(process.cwd(), 'public', resumePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    let contentType = 'application/pdf';
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="resume${fileExt}"`);
    res.send(fileBuffer);
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}