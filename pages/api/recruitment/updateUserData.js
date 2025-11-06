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
    // Enhanced IP detection with multiple fallbacks
    const getClientIP = () => {
      const forwarded = req.headers["x-forwarded-for"];
      const realIP = req.headers["x-real-ip"];
      const clientIP = req.headers["x-client-ip"];
      const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress;
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP.trim();
      if (clientIP) return clientIP.trim();
      if (remoteAddr) return remoteAddr;
      return 'unknown';
    };
    
    const ip_address = getClientIP();
    
    console.log('UpdateUserData - IP Detection:', { 
      ip_address, 
      device_info: device_info?.slice(0, 100),
      headers: {
        'x-forwarded-for': req.headers["x-forwarded-for"],
        'x-real-ip': req.headers["x-real-ip"],
        'user-agent': req.headers["user-agent"]?.slice(0, 50)
      }
    });

    // Check if candidate already has this data
    const candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
      select: { candidate_id: true, ip_address: true, device_info: true }
    });
    
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    
    // Only update if data is missing or different
    const needsUpdate = !candidate.ip_address || !candidate.device_info;
    
    if (needsUpdate) {
      const result = await prisma.candidates.updateMany({
        where: { form_token: token },
        data: {
          ip_address: candidate.ip_address || ip_address,
          device_info: candidate.device_info || device_info,
          token_first_used_at: candidate.token_first_used_at || new Date()
        }
      });
      
      console.log('UpdateUserData - Updated:', { 
        candidateId: candidate.candidate_id,
        updated: result.count > 0,
        finalIP: candidate.ip_address || ip_address
      });
    }

    res.status(200).json({ 
      message: "User data updated successfully",
      updated: needsUpdate,
      ip_address: candidate.ip_address || ip_address
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}