import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    console.log('Looking for candidate with ID:', id);
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: id },
      select: {
        resume: true,
        name: true,
      },
    });

    console.log('Found candidate:', candidate);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!candidate.resume) {
      return res.status(404).json({ error: 'Resume not found for this candidate' });
    }

    console.log('Resume path:', candidate.resume);

    // Remove leading slash if present and handle the path properly
    const resumePath = candidate.resume.startsWith('/') ? candidate.resume.substring(1) : candidate.resume;
    const filePath = path.join(process.cwd(), 'public', resumePath);
    
    console.log('Full file path:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ error: 'Resume file not found on server' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(candidate.resume);
    const fileExt = path.extname(fileName).toLowerCase();
    
    // Set appropriate content type based on file extension
    let contentType = 'application/octet-stream';
    if (fileExt === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExt === '.doc') {
      contentType = 'application/msword';
    } else if (fileExt === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}