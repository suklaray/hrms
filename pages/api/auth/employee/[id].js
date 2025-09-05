import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Set user status to Inactive instead of deleting
    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Inactive" },
    });

    res.status(200).json({ message: "User made inactive successfully" });
  } catch (error) {
    console.error("Prisma Update Error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}
