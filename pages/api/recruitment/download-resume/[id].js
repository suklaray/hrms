import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { id: parseInt(id) },
      select: {
        resume_data: true,
        resume_filename: true,
        resume_mimetype: true,
      },
    });

    if (!candidate || !candidate.resume_data) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Set appropriate headers for viewing in browser
    res.setHeader('Content-Type', candidate.resume_mimetype || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${candidate.resume_filename || 'resume'}"`);
    
    // Convert Bytes data to Buffer
    const fileBuffer = Buffer.from(candidate.resume_data);
    
    // Send the file buffer
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}