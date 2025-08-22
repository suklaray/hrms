import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { email } = req.body;

  try {
    // Check in all three tables: users, employees, and candidates
    const [user, employee, candidate] = await Promise.all([
      prisma.users.findUnique({ where: { email } }),
      prisma.employees.findUnique({ where: { email } }),
      prisma.candidates.findFirst({ where: { email } })
    ]);

    const exists = !!(user || employee || candidate);
    res.status(200).json({ exists });
  } catch (err) {
    console.error("Email check error", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
