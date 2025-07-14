import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Update status to 'Inactive' instead of deleting
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Inactive" },
    });

    res.status(200).json({ message: "User marked as Inactive", user: updatedUser });
  } catch (error) {
    console.error("Prisma Update Error:", error);
    res.status(500).json({ error: "Failed to mark user as inactive" });
  }
}
