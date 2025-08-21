import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const candidate = await prisma.candidates.findFirst({
      where: { candidate_id: id },
      select: {
        resume_data: true,
        resume_filename: true,
        resume_mimetype: true,
      },
    });

    if (!candidate || !candidate.resume_data) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', candidate.resume_mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${candidate.resume_filename || 'resume'}"`);
    
    // Send the file data
    res.send(candidate.resume_data);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}