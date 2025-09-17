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

    const { title, description, event_date, event_type } = req.body;

    if (!title || !event_date || !event_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const event = await prisma.calendar_events.create({
      data: {
        title,
        description: description || null,
        event_date: new Date(event_date),
        event_type,
        created_by: decoded.empid || decoded.id
      }
    });

    res.status(201).json({
      success: true,
      message: "Event added successfully",
      event
    });

  } catch (error) {
    console.error("Add event API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error"
    });
  }
}
