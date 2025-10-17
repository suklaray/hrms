import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const candidates = await prisma.candidates.findMany({
      orderBy: {
        id: 'desc',
      },
    });

    // Check if each candidate is already an employee
    const candidatesWithEmployeeStatus = await Promise.all(
      candidates.map(async (candidate) => {
        const existingEmployee = await prisma.users.findUnique({
          where: { email: candidate.email },
          select: { empid: true }
        });
        
        return {
          ...candidate,
          isEmployee: !!existingEmployee
        };
      })
    );

    return res.status(200).json(candidatesWithEmployeeStatus);

  } catch (error) {
    console.error("Error fetching candidates:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}
