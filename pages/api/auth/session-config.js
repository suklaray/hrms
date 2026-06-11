import { SESSION_CONFIG } from "@/lib/authMiddleware";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Return session configuration for frontend synchronization
    res.status(200).json({
      sessionTimeout: SESSION_CONFIG.TIMEOUT,
      jwtExpiry: SESSION_CONFIG.JWT_EXPIRY,
      warningOffset: SESSION_CONFIG.WARNING_OFFSET,
      // Additional helpful info
      warningTime: SESSION_CONFIG.TIMEOUT - SESSION_CONFIG.WARNING_OFFSET,
      countdownDuration: SESSION_CONFIG.WARNING_OFFSET / 1000
    });
  } catch (error) {
    console.error("Session config error:", error);
    res.status(500).json({ message: "Error retrieving session configuration" });
  }
}