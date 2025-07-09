import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No messages selected." });
  }

  try {
    await prisma.contact_submissions.deleteMany({
      where: { id: { in: ids } },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete messages." });
  }
}
