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

    if (candidates.length === 0) {
      return res.status(200).json({ message: "No candidates found." });
    }

    res.status(200).json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
