import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { token } = req.query;
  // Get user session from JWT token
  const cookies = parse(req.headers.cookie || "");
  const userToken = cookies.token;
  const session = userToken ? await getUserFromToken(userToken) : null;
  const rawXff = req.headers["x-forwarded-for"] || "";
  const ip = rawXff.split(",")[0].trim() || req.socket.remoteAddress;
  const userAgent = (req.headers["user-agent"] || "").slice(0, 200); // shorten stored UA

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    // First try to find by token
    let candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
    });

    // If not found by token, check if it's a submitted form (token set to null)
    if (!candidate) {
      candidate = await prisma.candidates.findFirst({
        where: {
          form_submitted: true,
          OR: [
            { candidate_id: token }, // fallback for old candidate IDs
            { form_link: { contains: token } } // check if token exists in form_link
          ]
        }
      });
      
      if (candidate) {
        // Check if this is the authorized user (same device/IP) or admin
        const allowedRoles = ["admin", "hr", "superadmin"];
        if (session && allowedRoles.includes(session.role)) {
          return res.status(403).json({ error: "submitted:Form already submitted" });
        }
        
        // For submitted forms, validate device/IP before showing submitted message
        if (candidate.device_info && candidate.ip_address) {
          const sameIp = candidate.ip_address === ip;
          const sameUA = candidate.device_info.startsWith(userAgent.slice(0, 50));
          if (!sameIp || !sameUA) {
            return res.status(404).json({ error: "Invalid or expired token" });
          }
        }
        
        return res.status(403).json({ error: "submitted:Form already submitted" });
      }
      
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    //  Check for Admin/HR/SuperAdmin roles (they can always view)
    const allowedRoles = ["admin", "hr", "superadmin"];
    if (session && allowedRoles.includes(session.role)) {
      return res.status(200).json({ ...candidate, isAdmin: true });
    }

    if (candidate.form_submitted) {
      return res.status(403).json({ error: "submitted:Form already submitted" });
    }

    //  Optional: check token expiry
    if (
      candidate.token_expiry &&
      new Date() > new Date(candidate.token_expiry)
    ) {
      return res.status(403).json({ error: "expired:Form link has expired" });
    }

    // First-time access → lock form to this device/IP
    if (!candidate.device_info && !candidate.ip_address) {
      // Save device info for first-time access (both admin and regular users)
      await prisma.candidates.update({
        where: { candidate_id: candidate.candidate_id },
        data: {
          device_info: userAgent,
          ip_address: ip,
          token_first_used_at: new Date(),
        },
      });
      return res.status(200).json(candidate);
    }

    // 🔐 Subsequent accesses: validate same device/IP (only for non-admin users)
    if (!session || !allowedRoles.includes(session.role)) {
      const sameIp = candidate.ip_address === ip;
      const sameUA =
        candidate.device_info &&
        candidate.device_info.startsWith(userAgent.slice(0, 50));
      if (!sameIp || !sameUA) {
        return res.status(403).json({
          error: "locked:Form is locked to a different device",
        });
      }
    }

    // ✅ All checks passed
    res.status(200).json(candidate);
  } catch (error) {
    console.error("Error fetching candidate by token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
