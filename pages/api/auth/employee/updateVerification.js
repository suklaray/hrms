import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Test database connectivity with retry
    let connectionAttempts = 0;
    const maxAttempts = 3;
    
    while (connectionAttempts < maxAttempts) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (connError) {
        connectionAttempts++;
        if (connectionAttempts >= maxAttempts) {
          throw connError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !["admin", "hr", "superadmin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { empid, verificationStatus } = req.body;

    if (!empid || typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: empid },
      data: { verified: verificationStatus ? 'verified' : 'not_verified' },
    });

    // Don't refresh JWT token - admin/HR should keep their own session
    // Only the employee being verified will get updated verification status on next login

    res.status(200).json({
      message: `Employee ${verificationStatus ? 'verified' : 'unverified'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    
    // Handle specific database connectivity errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      return res.status(503).json({
        message: "Database temporarily unavailable",
        error: "Service is temporarily unavailable. Please try again in a few moments.",
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.warn("Failed to disconnect from database:", disconnectError.message);
    }
  }
}