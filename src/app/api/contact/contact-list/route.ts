import { createRouteHandler } from "@/lib/apiAdapter";
import prisma from "@/lib/prisma";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const feedbacks = await prisma.contact_submissions.findMany({
    orderBy: { created_at: "desc" }    });
    return res.status(200).json({ feedbacks });
  } catch (error) {
    console.error("Error fetching contact submissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(handler);
