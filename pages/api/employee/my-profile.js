import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookies (same as dashboard)
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    // Verify employee token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure this is an employee role
    if (decoded.role !== 'employee') {
      return res.status(403).json({ error: 'Access denied - Employee only' });
    }

    // Find user by id (same as dashboard) to ensure consistency
    const employee = await prisma.users.findUnique({
      where: { 
        id: decoded.id 
      },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        date_of_joining: true,
        contact_number: true,
        role: true
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error('Employee profile error:', error);
    res.status(500).json({ error: 'Failed to fetch employee profile' });
  }
}