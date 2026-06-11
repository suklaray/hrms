import { verifyEmployeeToken } from '@/lib/auth';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find user by id to ensure consistency and include verification fields
    const employee = await prisma.users.findUnique({
      where: { 
        id: user.id 
      },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        date_of_joining: true,
        contact_number: true,
        role: true,
        verified: true, // Add verification status
        form_submitted: true // Add form submission status
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    console.log(`Employee profile fetched: ${employee.name} - Verified: ${employee.verified}, Form Submitted: ${employee.form_submitted}`);

    res.status(200).json(employee);
  } catch (error) {
    console.error('Employee profile error:', error);
    res.status(500).json({ error: 'Failed to fetch employee profile' });
  }
}