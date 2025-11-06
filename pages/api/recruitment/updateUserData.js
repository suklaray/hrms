import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token, device_info } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    // Get IP address from request headers
    const forwarded = req.headers["x-forwarded-for"];
    const ip_address = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress || 'unknown';

    // Update candidate record with IP and device info
    const result = await prisma.candidates.updateMany({
      where: { form_token: token },
      data: {
        ip_address,
        device_info,
        token_first_used_at: new Date()
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({ message: "User data updated successfully" });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}