import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSIONS } from "@/rbac/permissions";
import { isSuperAdmin, resolveUserRole } from "@/rbac/service";
import { canVerifyRecruitmentCandidate } from "@/lib/recruitmentVerificationAccess";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { error, user, permissions } = await checkAuth(req, [PERMISSIONS.RECRUITMENT.VIEW]);
  if (error) return error;

  const query = await getQueryParams(req, context?.params);
  const { id } = query;

  if (!id) {
    return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
  }

  try {
    const candidate = await prisma.candidates.findFirst({
      where: {
        candidate_id: id,
      },
      include: {
        verified_by_user: { select: { name: true } },
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

    const { parsed_resume, ...candidateData } = candidate;
    const hiringManagerEmpid = parsed_resume?.job_description?.hiring_manager_id;
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

    const responseData = {
      ...candidateData,
      resume: candidate.resume,
      canVerifyCandidate: canVerifyRecruitmentCandidate(
        user?.empid,
        currentRole?.roleId,
        hiringManagerEmpid,
        hiringManager?.roleId,
        roles,
        isSuperAdmin(user) ||
          (permissions?.has(PERMISSIONS.RECRUITMENT.VERIFY_CANDIDATE) ?? false),
        isSuperAdmin(user)
      ),
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
