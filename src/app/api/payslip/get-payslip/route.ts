import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { isSuperAdmin } from "@/lib/rbac";
import { generatePayslipPdf } from "@/lib/payslipPdfGenerator";

export const dynamic = "force-dynamic";

const PAYROLL_INCLUDE = {
  components: true,
  company: true,
  period: true,
  users: {
    include: {
      employeeProfile: {
        include: {
          bank_details: true,
        },
      },
      rbacRole: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  },
};

/**
 * Resolves the authenticated user's employee ID (empid)
 * Checks the JWT payload first, falling back to a DB lookup if needed.
 */
async function resolveUserEmpid(currentUser: any): Promise<string | undefined> {
  if (currentUser?.empid) return String(currentUser.empid);
  if (currentUser?.id || currentUser?.email) {
    const dbUser = await prisma.users.findFirst({
      where: {
        OR: [
          ...(currentUser.id ? [{ id: Number(currentUser.id) }] : []),
          ...(currentUser.email ? [{ email: String(currentUser.email) }] : []),
        ],
      },
      select: { empid: true },
    });
    if (dbUser?.empid) return dbUser.empid;
  }
  return undefined;
}

// ─── GET: Fetch single payslip by ID/UID/empid or employee's payslips list ──────────
export async function GET(req: NextRequest) {
  // 1. Authenticate & Authorize
  const auth = await checkAuth(req, [
    PERMISSION_KEYS.PAYSLIP_VIEW_OWN,
    PERMISSION_KEYS.PAYSLIP_VIEW,
    PERMISSION_KEYS.PAYSLIP_GENERATE,
  ]);

  if ("error" in auth && auth.error) {
    return auth.error;
  }

  const currentUser = auth.user;
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || searchParams.get("uid") || searchParams.get("payrollId");
  const periodIdParam = searchParams.get("periodId") || searchParams.get("period_id");
  const isDownload = searchParams.get("download") === "true";

  const userPermissions = auth.permissions || new Set<string>();
  const isSuper = isSuperAdmin(currentUser);
  const canViewAny =
    isSuper ||
    userPermissions.has(PERMISSION_KEYS.PAYSLIP_VIEW) ||
    userPermissions.has(PERMISSION_KEYS.PAYSLIP_GENERATE);

  const userEmpid = await resolveUserEmpid(currentUser);

  try {
    // ── If no specific payslip ID is requested: return user's or target employee's payslips
    if (!id) {
      const targetEmpId = canViewAny
        ? (searchParams.get("empid") || userEmpid)
        : userEmpid;

      if (!targetEmpId) {
        return NextResponse.json(
          { success: false, error: "Employee ID or Payslip ID is required" },
          { status: 400 }
        );
      }

      const payrollList = await prisma.payroll.findMany({
        where: { empid: String(targetEmpId) },
        include: {
          company: {
            select: {
              name: true,
              city: true,
              state: true,
            },
          },
          period: {
            select: {
              period_name: true,
              period_start: true,
              period_end: true,
            },
          },
          components: true,
        },
        orderBy: {
          salary_payment_date: "desc",
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: payrollList,
        },
        { status: 200 }
      );
    }

    // ── Fetch specific payroll record by ID, UID, empid, or self-alias
    const trimmedId = id.trim();
    const isSelfAlias = trimmedId === "my-payslip" || trimmedId === "me";

    let payrollRecord;
    if (isSelfAlias) {
      if (!userEmpid) {
        return NextResponse.json(
          { success: false, error: "Employee ID could not be resolved for your profile" },
          { status: 400 }
        );
      }

      payrollRecord = await prisma.payroll.findFirst({
        where: {
          empid: userEmpid,
          ...(periodIdParam ? { period_id: String(periodIdParam) } : {}),
        },
        orderBy: {
          salary_payment_date: "desc",
        },
        include: PAYROLL_INCLUDE,
      });
    } else {
      const isNumeric = !isNaN(Number(trimmedId)) && /^\d+$/.test(trimmedId);

      payrollRecord = await prisma.payroll.findFirst({
        where: isNumeric
          ? {
              OR: [
                { id: Number(trimmedId) },
                { uid: trimmedId },
                { empid: trimmedId, ...(periodIdParam ? { period_id: String(periodIdParam) } : {}) },
              ],
            }
          : {
              OR: [
                { uid: trimmedId },
                { empid: trimmedId, ...(periodIdParam ? { period_id: String(periodIdParam) } : {}) },
              ],
            },
        orderBy: {
          salary_payment_date: "desc",
        },
        include: PAYROLL_INCLUDE,
      });
    }

    if (!payrollRecord) {
      return NextResponse.json(
        { success: false, error: "Payslip not found" },
        { status: 404 }
      );
    }

    // ── Check Ownership: If user only has PAYSLIP_VIEW_OWN, ensure it's their own payslip
    if (!canViewAny) {
      const isOwner =
        (userEmpid && String(payrollRecord.empid).toLowerCase() === String(userEmpid).toLowerCase()) ||
        (currentUser.id && payrollRecord.users?.id === Number(currentUser.id)) ||
        (currentUser.email && payrollRecord.users?.email?.toLowerCase() === currentUser.email.toLowerCase());

      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: You are only permitted to view and download your own payslip.",
          },
          { status: 403 }
        );
      }
    }

    // Also fetch available payslips for this employee so the user can see/switch periods in the UI
    const availablePayslips = await prisma.payroll.findMany({
      where: { empid: payrollRecord.empid },
      select: {
        id: true,
        uid: true,
        period_id: true,
        period_name: true,
        salary_payment_date: true,
        gross_salary: true,
        net_salary: true,
        total_payable_amount: true,
        status: true,
      },
      orderBy: {
        salary_payment_date: "desc",
      },
    });

    // ── Handle direct PDF Download
    if (isDownload) {
      const { buffer, fileName } = await generatePayslipPdf({
        empid: payrollRecord.empid,
        period_id: payrollRecord.period_id,
        period_name: payrollRecord.period_name,
        gross_salary: payrollRecord.gross_salary?.toString() || 0,
        total_deduction: payrollRecord.total_deduction?.toString() || 0,
        net_salary: payrollRecord.net_salary?.toString() || 0,
        total_payable_amount:
          (payrollRecord.total_payable_amount || payrollRecord.net_salary)?.toString() || 0,
        salary_payment_date: payrollRecord.salary_payment_date,
        generated_at: payrollRecord.generated_at,
        company: payrollRecord.company,
        users: payrollRecord.users,
        components: payrollRecord.components.map((c) => ({
          component_name: c.component_name,
          component_ammount: c.component_ammount?.toString() || 0,
          component_type: c.component_type,
        })),
      });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName || `Payslip_${payrollRecord.empid}_${payrollRecord.period_name}.pdf`}"`,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    // ── Return JSON response for UI rendering
    return NextResponse.json(
      {
        success: true,
        data: payrollRecord,
        availablePayslips,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/payslip/get-payslip:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payslip: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

// ─── POST: Also support POST requests with { id } in body ─────────────────────
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req, [
    PERMISSION_KEYS.PAYSLIP_VIEW_OWN,
    PERMISSION_KEYS.PAYSLIP_VIEW,
    PERMISSION_KEYS.PAYSLIP_GENERATE,
  ]);

  if ("error" in auth && auth.error) {
    return auth.error;
  }

  const currentUser = auth.user;
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id || body.uid || body.payrollId;
    const periodIdParam = body.periodId || body.period_id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Payslip ID is required" },
        { status: 400 }
      );
    }

    const userEmpid = await resolveUserEmpid(currentUser);
    const trimmedId = String(id).trim();
    const isSelfAlias = trimmedId === "my-payslip" || trimmedId === "me";

    let payrollRecord;
    if (isSelfAlias) {
      if (!userEmpid) {
        return NextResponse.json(
          { success: false, error: "Employee ID could not be resolved for your profile" },
          { status: 400 }
        );
      }

      payrollRecord = await prisma.payroll.findFirst({
        where: {
          empid: userEmpid,
          ...(periodIdParam ? { period_id: String(periodIdParam) } : {}),
        },
        orderBy: {
          salary_payment_date: "desc",
        },
        include: PAYROLL_INCLUDE,
      });
    } else {
      const isNumeric = !isNaN(Number(trimmedId)) && /^\d+$/.test(trimmedId);

      payrollRecord = await prisma.payroll.findFirst({
        where: isNumeric
          ? {
              OR: [
                { id: Number(trimmedId) },
                { uid: trimmedId },
                { empid: trimmedId, ...(periodIdParam ? { period_id: String(periodIdParam) } : {}) },
              ],
            }
          : {
              OR: [
                { uid: trimmedId },
                { empid: trimmedId, ...(periodIdParam ? { period_id: String(periodIdParam) } : {}) },
              ],
            },
        orderBy: {
          salary_payment_date: "desc",
        },
        include: PAYROLL_INCLUDE,
      });
    }

    if (!payrollRecord) {
      return NextResponse.json(
        { success: false, error: "Payslip not found" },
        { status: 404 }
      );
    }

    const userPermissions = auth.permissions || new Set<string>();
    const isSuper = isSuperAdmin(currentUser);
    const canViewAny =
      isSuper ||
      userPermissions.has(PERMISSION_KEYS.PAYSLIP_VIEW) ||
      userPermissions.has(PERMISSION_KEYS.PAYSLIP_GENERATE);

    if (!canViewAny) {
      const isOwner =
        (userEmpid && String(payrollRecord.empid).toLowerCase() === String(userEmpid).toLowerCase()) ||
        (currentUser.id && payrollRecord.users?.id === Number(currentUser.id)) ||
        (currentUser.email && payrollRecord.users?.email?.toLowerCase() === currentUser.email.toLowerCase());

      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: You are only permitted to view your own payslip.",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: payrollRecord,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/payslip/get-payslip:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
