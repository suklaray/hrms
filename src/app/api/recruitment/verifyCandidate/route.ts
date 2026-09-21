import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { candidateId, verificationStatus } = body;

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

    return NextResponse.json({ message: "Verification status updated", updatedCandidate }, { status: 200 });
  } catch (error) {
    console.error("Error updating verification status:", error);
    
    // Handle specific database connectivity errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      return NextResponse.json({
        message: "Database temporarily unavailable",
        error: "Service is temporarily unavailable. Please try again in a few moments.",
        code: 'DB_CONNECTION_ERROR'
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: "Internal Server Error",
      message: error.message 
    }, { status: 500 });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.warn("Failed to disconnect from database:", disconnectError.message);
    }
  }
}


