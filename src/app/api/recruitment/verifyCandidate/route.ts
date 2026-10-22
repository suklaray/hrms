import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSIONS } from "@/rbac/permissions";
import { isSuperAdmin, resolveUserRole } from "@/rbac/service";
import { canVerifyRecruitmentCandidate } from "@/lib/recruitmentVerificationAccess";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const { error, user, permissions } = await checkAuth(req, [PERMISSIONS.RECRUITMENT.VERIFY_CANDIDATE]);
  if (error) return error;

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

    const candidate = await prisma.candidates.findUnique({
      where: { id: Number(candidateId) },
      include: {
        parsed_resume: {
          select: {
            job_description: {
              select: { hiring_manager_id: true },
            },
          },
        },
      },
    });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const hiringManagerEmpid = candidate.parsed_resume?.job_description?.hiring_manager_id;
    const [hiringManager, roles, currentRole] = await Promise.all([
      hiringManagerEmpid
        ? prisma.users.findUnique({
            where: { empid: hiringManagerEmpid },
            select: { roleId: true },
          })
        : null,
      prisma.role.findMany({ select: { id: true, parentId: true } }),
      resolveUserRole(user),
    ]);
    if (
      !canVerifyRecruitmentCandidate(
        user?.empid,
        currentRole?.roleId,
        hiringManagerEmpid,
        hiringManager?.roleId,
        roles,
        isSuperAdmin(user) ||
          (permissions?.has(PERMISSIONS.RECRUITMENT.VERIFY_CANDIDATE) ?? false),
        isSuperAdmin(user)
      )
    ) {
      return NextResponse.json({ error: "You cannot verify this candidate" }, { status: 403 });
    }

    const updatedCandidate = await prisma.candidates.update({
      where: { id: candidate.id },
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
