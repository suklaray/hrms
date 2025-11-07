import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    // Find candidate by token
    const candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
      select: {
        candidate_id: true,
        candidate_name: true,
        form_token: true,
        ip_address: true,
        device_info: true,
        token_first_used_at: true,
        form_submitted: true,
        created_at: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({
      message: "Candidate debug info",
      candidate,
      hasIP: !!candidate.ip_address,
      hasDevice: !!candidate.device_info,
      devicePreview: candidate.device_info?.slice(0, 100)
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}