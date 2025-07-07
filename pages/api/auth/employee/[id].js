import prisma from "@/lib/prisma"; 

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await prisma.users.delete({
      where: {
        id: parseInt(id), 
      },
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Prisma Delete Error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
}
