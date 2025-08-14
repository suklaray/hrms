import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Delete user from database
    await prisma.users.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Prisma Update Error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}
