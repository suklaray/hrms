import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { email } = req.body;

  try {
    const user = await prisma.users.findUnique({
      where: { email }
    });

    res.status(200).json({ exists: !!user });
  } catch (err) {
    console.error("Email check error", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
