import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // Reconnect to database if connection is lost
    await prisma.$connect();
    
    // 1️⃣ Get the candidate info
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: id },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // 2️⃣ Get profile photo from employees table where email matches
    const employee = await prisma.employees.findUnique({
      where: { email: candidate.email },
      select: { 
        profile_photo: true
      },
    });

    let profilePhotoUrl = '';
    if (employee?.profile_photo) {
      profilePhotoUrl = employee.profile_photo;
    }

    res.status(200).json({
      ...candidate,
      profile_photo: profilePhotoUrl,
    });

  } catch (err) {
    console.error('Error fetching candidate/employee:', err);
    
    // If it's a connection error, try to reconnect
    if (err.code === 'P1017') {
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        return res.status(500).json({ error: 'Database connection lost. Please try again.' });
      } catch (reconnectErr) {
        console.error('Failed to reconnect:', reconnectErr);
      }
    }
    
    res.status(500).json({ error: 'Server error' });
  } finally {
    // Don't disconnect here as it might be used by other requests
  }
}
