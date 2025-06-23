import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        empid: true,
        name: true,
        email: true,
        position: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
