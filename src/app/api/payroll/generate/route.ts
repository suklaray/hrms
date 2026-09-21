import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      empid,
      month,
      year,
      basic_salary,
      hra,
      da,
      allowances,
      bonus,
      deductions,
      pf,
      ptax,
      esic,
      payslip_pdf,
      allowance_details,
      deduction_details,
    } = body;

    // Check if payroll already exists
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        empid,
        month,
        year: Number(year)
      }
    });

    if (existingPayroll) {
      return NextResponse.json({ error: `Payroll for ${month} ${year} already exists for this employee` }, { status: 400 });
    }

    const bs = Math.round((Number(basic_salary) || 0) * 100) / 100;
    const h = Math.round((Number(hra) || 0) * 100) / 100;
    const d_a = Math.round((Number(da) || 0) * 100) / 100;
    const all = Math.round((Number(allowances) || 0) * 100) / 100;
    const bon = Math.round((Number(bonus) || 0) * 100) / 100;
    const ded = Math.round((Number(deductions) || 0) * 100) / 100;
    const pf_ded = Math.round((Number(pf) || 0) * 100) / 100;
    const pt_ded = Math.round((Number(ptax) || 0) * 100) / 100;
    const es_ded = Math.round((Number(esic) || 0) * 100) / 100;

    const calculated_net_pay = Math.round((bs + all + bon - ded) * 100) / 100;

    const paymentDate = new Date();

    await prisma.payroll.create({
      data: {
        empid,
        month,
        year,
        basic_salary: bs,
        hra: h,
        da: d_a,
        allowances: all,
        bonus: bon,
        pf: pf_ded,
        ptax: pt_ded,
        esic: es_ded,
        deductions: ded,
        net_pay: calculated_net_pay,
        generated_on: paymentDate,
        payslip_pdf: payslip_pdf || null,
        allowance_details: JSON.stringify(allowance_details || []),
        deduction_details: JSON.stringify(deduction_details || [])
      },
    });

    return NextResponse.json({ 
      message: "Payroll generated successfully",
      empid,
      month,
      year,
      net_pay: calculated_net_pay
    }, { status: 200 });
  } catch (err: any) {
    console.error("Error generating payroll:", err);
    return NextResponse.json({ error: "Failed to generate payroll" }, { status: 500 });
  }
}
