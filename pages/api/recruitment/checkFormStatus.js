import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Token is required" });
  const candidate = await prisma.candidates.findFirst({ where: { form_token: token } });
  if (!candidate) return res.status(403).json({ error: "Invalid or expired token" });

  try {

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