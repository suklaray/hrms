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
      select: { profile_photo: true },
    });

    res.status(200).json({
      name: candidate.name,
      email: candidate.email,
      profile_photo: employee?.profile_photo || '', // return photo or empty
    });

  } catch (err) {
    console.error('Error fetching candidate/employee:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
