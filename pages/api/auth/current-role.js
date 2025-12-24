import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.token;
  const user = token ? getUserFromToken(token) : null;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const currentUser = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { role: true, status: true }
    });

    if (!currentUser || currentUser.status !== "Active") {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    res.status(200).json({ role: currentUser.role });
  } catch (error) {
    console.error("Error fetching current role:", error);
    res.status(500).json({ error: "Failed to fetch role" });
  }
}