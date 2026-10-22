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
  if (verificationStatus !== true) {
    return NextResponse.json(
      { error: "Candidate verification cannot be reverted" },
      { status: 400 }
    );
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

    const parsedCandidateId = Number(candidateId);
    if (!Number.isInteger(parsedCandidateId) || parsedCandidateId <= 0 || !user?.empid) {
      return NextResponse.json({ error: "Valid candidate and verifier are required" }, { status: 400 });
    }

    const [candidate, verifier] = await Promise.all([
      prisma.candidates.findUnique({
        where: { id: parsedCandidateId },
        include: {
          parsed_resume: {
            select: {
              job_description: {
                select: { hiring_manager_id: true },
              },
            },
          },
        },
      }),
      prisma.users.findUnique({
        where: { empid: user.empid },
        select: { id: true },
      }),
    ]);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    if (!verifier) {
      return NextResponse.json({ error: "Verifier account not found" }, { status: 404 });
    }
    if (!candidate.form_submitted) {
      return NextResponse.json({ error: "Candidate has not submitted the form" }, { status: 400 });
    }
    if (candidate.verification) {
      return NextResponse.json({ error: "Candidate has already been verified" }, { status: 409 });
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

    const verifiedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.candidates.updateMany({
        where: {
          id: candidate.id,
          form_submitted: true,
          OR: [{ verification: false }, { verification: null }],
        },
        data: {
          verification: true,
          verified_by: verifier.id,
          verified_at: verifiedAt,
        },
      });
      if (result.count !== 1) return false;

      if (hiringManagerEmpid) {
        await tx.notifications.updateMany({
          where: {
            recipient_type: "user",
            recipient_id: hiringManagerEmpid,
            type: "recruitment_verification_pending",
            metadata: JSON.stringify({ candidateId: candidate.candidate_id, url: `/Recruitment/${candidate.candidate_id}` }),
          },
          data: { is_read: true },
        });
      }
      return true;
    });

    if (!updated) {
      return NextResponse.json({ error: "Candidate has already been verified" }, { status: 409 });
    }
    const updatedCandidate = await prisma.candidates.findUnique({
      where: {
        id: parsedCandidateId,
      },
      select: {
        id: true,
        verification: true,
        verified_by: true,
        verified_at: true,
      },
    });
    return NextResponse.json({ message: "Candidate verified", updatedCandidate }, { status: 200 });
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
