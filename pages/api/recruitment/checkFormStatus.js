import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidate_id } = req.query;

  if (!candidate_id) {
    return res.status(400).json({ error: 'Candidate ID is required' });
  }

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id },
      select: { form_submitted: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    return res.status(200).json({ 
      formSubmitted: candidate.form_submitted || false 
    });
  } catch (error) {
    console.error('Error checking form status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}