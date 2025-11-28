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

    const { title, description, event_date, event_type, visible_to } = req.body;

    if (!title || !event_date || !event_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Ensure creator's email is included in visible_to
    let finalVisibleTo = [];

    if (visible_to && typeof visible_to === "string") {
      finalVisibleTo = visible_to.split(",").map((v) => v.trim());
    } else if (Array.isArray(visible_to)) {
      finalVisibleTo = visible_to.map((v) => v.trim());
    }

    const creatorEmail = decoded.email;

    if (!creatorEmail) {
      return res.status(400).json({ message: "Creator email missing in token" });
    }

    // If "all" is selected, keep it as "all" only
    if (finalVisibleTo.includes("all")) {
      finalVisibleTo = ["all"];
    } else {
      // Add creator email if not already present
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
        visible_to: finalVisibleTo.join(","), // comma-separated
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
