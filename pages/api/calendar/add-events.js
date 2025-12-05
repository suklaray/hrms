import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const { title, description, event_date, event_type, visible_to, selected_groups } = req.body;

    if (!title || !event_date || !event_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const creatorEmail = decoded.email;
    if (!creatorEmail) {
      return res.status(400).json({ message: "Creator email missing in token" });
    }

    let finalVisibleTo = [];

    // Handle "all" selection
    if (visible_to && visible_to.includes("all")) {
      finalVisibleTo = ["all"];
    } else {
      // Process individual employee selections
      if (visible_to && Array.isArray(visible_to)) {
        finalVisibleTo = [...visible_to.filter(email => email !== "all")];
      }

      // Process group selections
      if (selected_groups && Array.isArray(selected_groups)) {
        for (const group of selected_groups) {
          const [groupType, groupValue] = group.key.split(":");
          
          let whereClause = { status: { not: 'Inactive' } };
          
          if (groupType === "role") {
            whereClause.role = groupValue;
          } else if (groupType === "position") {
            whereClause.position = groupValue;
          } else if (groupType === "employee_type") {
            whereClause.employee_type = groupValue;
          }
          
          const groupEmployees = await prisma.users.findMany({
            where: whereClause,
            select: { email: true }
          });
          
          const groupEmails = groupEmployees.map(emp => emp.email);
          finalVisibleTo = [...finalVisibleTo, ...groupEmails];
        }
      }

      // Remove duplicates and add creator
      finalVisibleTo = [...new Set(finalVisibleTo)];
      if (!finalVisibleTo.includes(creatorEmail)) {
        finalVisibleTo.push(creatorEmail);
      }
    }

    const event = await prisma.calendar_events.create({
      data: {
        title,
        description: description || null,
        event_date: new Date(event_date),
        event_type,
        visible_to: finalVisibleTo.join(","),
        created_by: creatorEmail,
      },
    });

    res.status(201).json({
      success: true,
      message: "Event added successfully",
      event,
    });
  } catch (error) {
    console.error("Add event API error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
