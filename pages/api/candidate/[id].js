import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // 1️⃣ Get the candidate info
    const candidate = await prisma.candidates.findUnique({
      where: { id: parseInt(id) },
      select: { name: true, email: true },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // 2️⃣ Get profile photo from employees table where email matches
    const employee = await prisma.employees.findUnique({
      where: { email: candidate.email },
      select: { 
        profile_photo: true,
        profile_photo_data: true,
        profile_photo_filename: true,
        profile_photo_mimetype: true
      },
    });

    let profilePhotoUrl = '';
    if (employee?.profile_photo_data) {
      // Convert Bytes to base64 for display
      const base64 = Buffer.from(employee.profile_photo_data).toString('base64');
      profilePhotoUrl = `data:${employee.profile_photo_mimetype || 'image/jpeg'};base64,${base64}`;
    } else if (employee?.profile_photo) {
      profilePhotoUrl = employee.profile_photo;
    }

    res.status(200).json({
      name: candidate.name,
      email: candidate.email,
      profile_photo: profilePhotoUrl,
    });

  } catch (err) {
    console.error('Error fetching candidate/employee:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
