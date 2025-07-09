// pages/api/contact/contact-list.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function handler(req, res) {
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
