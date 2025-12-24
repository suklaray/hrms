import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.token;
  const user = token ? getUserFromToken(token) : null;

  if (!user || !["admin", "hr", "superadmin"].includes(user.role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const positions = await prisma.$queryRaw`
        SELECT p.*, u.name as created_by_name 
        FROM positions p 
        LEFT JOIN users u ON p.created_by = u.empid 
        ORDER BY p.created_at DESC
      `;
      res.status(200).json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  } else if (req.method === "POST") {
    try {
      const { position_name, description } = req.body;
      
      if (!position_name) {
        return res.status(400).json({ error: "Position name is required" });
      }

      const position = await prisma.$queryRaw`
        INSERT INTO positions (position_name, description, created_by, created_at)
        VALUES (${position_name}, ${description || null}, ${user.empid}, NOW())
        RETURNING *
      `;

      res.status(201).json({ message: "Position created successfully", position: position[0] });
    } catch (error) {
      console.error("Error creating position:", error);
      res.status(500).json({ error: "Failed to create position" });
    }
  } else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { position_name, description } = req.body;
      
      if (!position_name) {
        return res.status(400).json({ error: "Position name is required" });
      }

      await prisma.$queryRaw`
        UPDATE positions 
        SET position_name = ${position_name}, description = ${description || null}
        WHERE id = ${parseInt(id)}
      `;

      res.status(200).json({ message: "Position updated successfully" });
    } catch (error) {
      console.error("Error updating position:", error);
      res.status(500).json({ error: "Failed to update position" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.query;
      
      // Get position name first
      const position = await prisma.positions.findUnique({
        where: { id: parseInt(id) },
        select: { position_name: true }
      });
      
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }
      
      // Check if any active employees have this position
      const employeesWithPosition = await prisma.users.count({
        where: {
          position: position.position_name,
          status: "Active"
        }
      });
      
      if (employeesWithPosition > 0) {
        return res.status(400).json({ 
          error: "Cannot delete position", 
          message: `${employeesWithPosition} active employee(s) are assigned to this position. Please reassign them first.`,
          hasEmployees: true
        });
      }
      
      await prisma.positions.delete({
        where: { id: parseInt(id) }
      });
      
      res.status(200).json({ message: "Position deleted successfully" });
    } catch (error) {
      console.error("Error deleting position:", error);
      res.status(500).json({ error: "Failed to delete position" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}