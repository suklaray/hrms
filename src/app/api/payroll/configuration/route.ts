import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function checkAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: NextResponse.json({ message: 'Invalid token' }, { status: 401 }) };
  }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return { error: NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 }) };
  return { decoded };
}

// ─── POST (Create) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      company_id,
      payroll_country,
      currency,
      payroll_effective_date,
      payroll_cycle,
      working_days,
      attendance_cut_off,
      leave_cut_off,
      overtime_cut_off,
      salary_payment_date,
      financial_year_id,
      salary_calendar,
      status,
      remarks
    } = body;

    if (!company_id || !payroll_country || !currency || !payroll_effective_date || !payroll_cycle || !working_days || !attendance_cut_off || !leave_cut_off || !salary_payment_date || !financial_year_id || !salary_calendar || !status) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const existingConfig = await prisma.payroll_configuration.findFirst({
      where: {
        company_id: company_id,
        financial_year_id: financial_year_id,
      },
    });

    if (existingConfig) {
      return NextResponse.json({ success: false, message: 'Payroll configuration already exists for this company and financial year' }, { status: 400 });
    }

    await prisma.payroll_configuration.create({
      data: {
        company_id,
        payroll_country,
        currency,
        payroll_effective_date: new Date(payroll_effective_date),
        payroll_cycle,
        working_days,
        attendance_cut_off,
        leave_cut_off,
        overtime_cut_off,
        salary_payment_date: Number(salary_payment_date),
        financial_year_id,
        salary_calendar,
        approval: "PENDING",
        status,
        remarks
      }
    });

    return NextResponse.json({ success: true, message: 'Payroll configuration added successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error adding payroll configuration:', error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

// ─── PUT (Update / Toggle Status) ──────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const configId = body.uid || body.id;
    if (!configId) {
      return NextResponse.json({ success: false, message: 'Configuration ID is required for update' }, { status: 400 });
    }

    const isNumericId = !isNaN(Number(configId)) && /^\d+$/.test(String(configId).trim());
    const whereClause = isNumericId ? { id: Number(configId) } : { uid: String(configId) };

    const safeUpdateData: any = { ...body };
    delete safeUpdateData.company;
    delete safeUpdateData.financial_year;
    delete safeUpdateData.createdAt;
    delete safeUpdateData.updatedAt;
    delete safeUpdateData.id;
    delete safeUpdateData.uid;

    if (safeUpdateData.company_id !== undefined && safeUpdateData.company_id !== null && safeUpdateData.company_id !== '') {
      safeUpdateData.company_id = String(safeUpdateData.company_id);
    }
    if (safeUpdateData.payroll_effective_date !== undefined && safeUpdateData.payroll_effective_date !== null && safeUpdateData.payroll_effective_date !== '') {
      safeUpdateData.payroll_effective_date = new Date(safeUpdateData.payroll_effective_date);
    }
    if (safeUpdateData.salary_payment_date !== undefined && safeUpdateData.salary_payment_date !== null && safeUpdateData.salary_payment_date !== '') {
      safeUpdateData.salary_payment_date = Number(safeUpdateData.salary_payment_date);
    }
    if (safeUpdateData.financial_year_start_month !== undefined && safeUpdateData.financial_year_start_month !== null && safeUpdateData.financial_year_start_month !== '') {
      safeUpdateData.financial_year_start_month = String(safeUpdateData.financial_year_start_month);
    }
    if (safeUpdateData.financial_year_end_month !== undefined && safeUpdateData.financial_year_end_month !== null && safeUpdateData.financial_year_end_month !== '') {
      safeUpdateData.financial_year_end_month = String(safeUpdateData.financial_year_end_month);
    }
    if (safeUpdateData.overtime_cut_off === '') {
      safeUpdateData.overtime_cut_off = null;
    }

    const updated = await prisma.payroll_configuration.update({
      where: whereClause,
      data: safeUpdateData,
    });
    return NextResponse.json({ success: true, message: 'Configuration updated successfully', data: updated }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating configuration:', error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

// ─── PATCH (Alias to PUT) ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  return PUT(req);
}

// ─── GET (Get Payroll Configuration from uid or id) ───────────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;

  const id = req.nextUrl.searchParams.get('uid') || req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, message: 'Configuration ID is required to fetch' }, { status: 400 });
  }
  try {
    const isNumericId = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const configuration = await prisma.payroll_configuration.findFirst({
      where: isNumericId
        ? { OR: [{ id: Number(id) }, { uid: String(id) }] }
        : { uid: String(id) },
      include: {
        company: true,
        financial_year: true
      },
    });

    if (!configuration) {
      return NextResponse.json({ success: false, message: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: configuration }, { status: 200 });
  } catch (error: any) {
    console.error('Error getting configuration:', error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
