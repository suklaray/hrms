import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { isSuperAdmin } from "@/lib/rbac";
import { generatePayslipPdf } from "@/lib/payslipPdfGenerator";

export const dynamic = "force-dynamic";

// ─── GET: Fetch single payslip by ID/UID or employee's payslips list ──────────
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
  const isDownload = searchParams.get("download") === "true";

  const userPermissions = auth.permissions || new Set<string>();
  const isSuper = isSuperAdmin(currentUser);
  const canViewAny =
    isSuper ||
    userPermissions.has(PERMISSION_KEYS.PAYSLIP_VIEW) ||
    userPermissions.has(PERMISSION_KEYS.PAYSLIP_GENERATE);

  try {
    // ── If no specific payslip ID is requested: return user's or target employee's payslips
    if (!id) {
      const targetEmpId = canViewAny
        ? (searchParams.get("empid") || currentUser.empid)
        : currentUser.empid;

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

    // ── Fetch specific payroll record by ID or UID
    const trimmedId = id.trim();
    const isNumeric = !isNaN(Number(trimmedId)) && /^\d+$/.test(trimmedId);

    const payrollRecord = await prisma.payroll.findFirst({
      where: isNumeric
        ? {
            OR: [
              { id: Number(trimmedId) },
              { uid: trimmedId },
            ],
          }
        : { uid: trimmedId },
      include: {
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
      },
    });

    if (!payrollRecord) {
      return NextResponse.json(
        { success: false, error: "Payslip not found" },
        { status: 404 }
      );
    }

    // ── Check Ownership: If user only has PAYSLIP_VIEW_OWN, ensure it's their own payslip
    if (!canViewAny) {
      const isOwner =
        (currentUser.empid && String(payrollRecord.empid).toLowerCase() === String(currentUser.empid).toLowerCase()) ||
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Payslip ID is required" },
        { status: 400 }
      );
    }

    const trimmedId = String(id).trim();
    const isNumeric = !isNaN(Number(trimmedId)) && /^\d+$/.test(trimmedId);

    const payrollRecord = await prisma.payroll.findFirst({
      where: isNumeric
        ? {
            OR: [
              { id: Number(trimmedId) },
              { uid: trimmedId },
            ],
          }
        : { uid: trimmedId },
      include: {
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
      },
    });

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
        (currentUser.empid && String(payrollRecord.empid).toLowerCase() === String(currentUser.empid).toLowerCase()) ||
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
