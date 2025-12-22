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
      const { positionName } = req.query;
      
      if (!positionName) {
        return res.status(400).json({ error: "Position name is required" });
      }

      // Get employees with this position
      const employees = await prisma.users.findMany({
        where: {
          position: positionName,
          status: "Active"
        },
        select: {
          empid: true,
          name: true,
          email: true,
          employee_type: true,
          role: true,
          position: true
        }
      });

      // Get all available positions for reassignment
      const availablePositions = await prisma.positions.findMany({
        where: {
          position_name: {
            not: positionName
          }
        },
        select: {
          id: true,
          position_name: true
        }
      });

      res.status(200).json({
        employees,
        availablePositions
      });
    } catch (error) {
      console.error("Error fetching position employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  } else if (req.method === "PUT") {
    // Reassign employee position
    try {
      const { empid, newPosition } = req.body;
      
      if (!empid || !newPosition) {
        return res.status(400).json({ error: "Employee ID and new position are required" });
      }

      // Get the employee being reassigned
      const employee = await prisma.users.findUnique({
        where: { empid },
        select: { role: true }
      });

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Get fresh user role for permission check
      const currentUser = await prisma.users.findUnique({
        where: { empid: user.empid },
        select: { role: true }
      });

      // Check role-based permissions with fresh role
      const canReassign = (
        currentUser.role === "superadmin" ||
        (currentUser.role === "admin" && ["hr", "employee"].includes(employee.role)) ||
        (currentUser.role === "hr" && employee.role === "employee")
      );

      if (!canReassign) {
        return res.status(403).json({ error: "Insufficient permissions to reassign this employee" });
      }

      await prisma.users.update({
        where: { empid },
        data: { position: newPosition }
      });

      res.status(200).json({ message: "Position updated successfully" });
    } catch (error) {
      console.error("Error updating employee position:", error);
      res.status(500).json({ error: "Failed to update position" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}