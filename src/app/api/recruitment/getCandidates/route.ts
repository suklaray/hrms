import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSIONS } from "@/rbac/permissions";
import { isSuperAdmin, resolveUserRole } from "@/rbac/service";
import { canVerifyRecruitmentCandidate } from "@/lib/recruitmentVerificationAccess";

export async function GET(req: NextRequest) {
  const { error, user, permissions } = await checkAuth(req, [PERMISSIONS.RECRUITMENT.VIEW]);
  if (error) return error;

  try {
    const candidates = await prisma.candidates.findMany({
      orderBy: {
        id: "desc",
      },
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

    const hiringManagerIds = [
      ...new Set(
        candidates
          .map((candidate) => candidate.parsed_resume?.job_description?.hiring_manager_id)
          .filter((empid): empid is string => Boolean(empid))
      ),
    ];
    const [hiringManagers, roles, currentRole] = await Promise.all([
      prisma.users.findMany({
        where: { empid: { in: hiringManagerIds } },
        select: { empid: true, roleId: true },
      }),
      prisma.role.findMany({ select: { id: true, parentId: true } }),
      resolveUserRole(user),
    ]);
    const hiringManagerRoleIds = new Map(
      hiringManagers.map((manager) => [manager.empid, manager.roleId])
    );

    // Check if each candidate is already an employee
    const candidatesWithEmployeeStatus = await Promise.all(
      candidates.map(async (candidate) => {
        const existingEmployee = await prisma.users.findUnique({
          where: { email: candidate.email },
          select: { empid: true },
        });

        return {
          ...candidate,
          isEmployee: !!existingEmployee,
          canVerifyCandidate: canVerifyRecruitmentCandidate(
            user?.empid,
            currentRole?.roleId,
            candidate.parsed_resume?.job_description?.hiring_manager_id,
            hiringManagerRoleIds.get(candidate.parsed_resume?.job_description?.hiring_manager_id || "") ?? null,
            roles,
            isSuperAdmin(user) ||
              (permissions?.has(PERMISSIONS.RECRUITMENT.VERIFY_CANDIDATE) ?? false),
            isSuperAdmin(user)
          ),
        };
      })
    );

    return NextResponse.json(candidatesWithEmployeeStatus, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
