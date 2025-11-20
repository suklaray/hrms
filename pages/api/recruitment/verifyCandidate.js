import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT")
    return res.status(405).json({ error: "Method not allowed" });

  const { candidateId, verificationStatus } = req.body;

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

    const updatedCandidate = await prisma.candidates.update({
      where: { id: Number(candidateId) }, 
      data: { verification: verificationStatus },
    });

    res.status(200).json({ message: "Verification status updated", updatedCandidate });
  } catch (error) {
    console.error("Error updating verification status:", error);
    
    // Handle specific database connectivity errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      return res.status(503).json({
        message: "Database temporarily unavailable",
        error: "Service is temporarily unavailable. Please try again in a few moments.",
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: "Internal Server Error",
      message: error.message 
    });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.warn("Failed to disconnect from database:", disconnectError.message);
    }
  }
}
