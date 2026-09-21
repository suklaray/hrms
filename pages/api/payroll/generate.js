import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });

  try {
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
      hra_include,
      da_include,
      pf_include,
      ptax_include,
      esic_include
    } = req.body;

    // Check if payroll already exists
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        empid,
        month,
        year: Number(year)
      }
    });

    if (existingPayroll) {
      return res.status(400).json({ error: `Payroll for ${month} ${year} already exists for this employee` });
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

    // Update user status to 'Payroll Generated'
    // try {
    //   await prisma.users.update({
    //     where: { empid },
    //     data: {
    //       status: 'Payroll Generated',
    //     },
    //   });
    //   console.log(`Updated status for employee ${empid} to 'Payroll Generated'`);
    // } catch (updateError) {
    //   console.error('Error updating user status:', updateError);
    // }

    return res.status(200).json({ 
      message: "Payroll generated successfully",
      empid,
      month,
      year,
      net_pay: calculated_net_pay
    });
  } catch (err) {
    console.error("Error generating payroll:", err);
    return res.status(500).json({ error: "Failed to generate payroll" });
  }
}
