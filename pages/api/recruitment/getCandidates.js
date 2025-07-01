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

    // Always return array (even empty)
    return res.status(200).json(candidates);

  } catch (error) {
    console.error("Error fetching candidates:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}
