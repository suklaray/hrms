import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || "");
  const user = cookies.token ? getUserFromToken(cookies.token) : null;

  if (!user || !["admin", "hr", "superadmin"].includes(user.role))
    return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const departments = await prisma.departments.findMany({
      include: { positions: true },
      orderBy: { created_at: "desc" },
    });
    return res.status(200).json(departments);
  }

  if (req.method === "POST") {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Department name is required" });
    try {
      const dept = await prisma.departments.create({
        data: { name: name.trim(), description: description || null, created_by: user.empid },
      });
      return res.status(201).json(dept);
    } catch (e) {
      if (e.code === "P2002") return res.status(400).json({ error: "Department name already exists" });
      return res.status(500).json({ error: "Failed to create department" });
    }
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Department name is required" });
    try {
      await prisma.departments.update({
        where: { id: parseInt(id) },
        data: { name: name.trim(), description: description || null },
      });
      return res.status(200).json({ message: "Updated successfully" });
    } catch (e) {
      if (e.code === "P2002") return res.status(400).json({ error: "Department name already exists" });
      return res.status(500).json({ error: "Failed to update department" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    const dept = await prisma.departments.findUnique({
      where: { id: parseInt(id) },
      include: { positions: true },
    });
    if (!dept) return res.status(404).json({ error: "Department not found" });
    if (dept.positions.length > 0)
      return res.status(400).json({ error: `Cannot delete — ${dept.positions.length} position(s) linked. Reassign them first.` });
    await prisma.departments.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ message: "Deleted successfully" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
