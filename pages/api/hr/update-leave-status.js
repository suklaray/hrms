import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, error: 'Missing ID or status' });
  }

  try {
    await prisma.leave_requests.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.status(200).json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
