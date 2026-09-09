import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Invalid token' }); }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return res.status(403).json({ message: 'Forbidden: insufficient permissions' });

  const {
    empid,
    month,
    year,
    basic_salary,
    hra,
    da,
    allowances,
    deductions,
    pf,
    ptax,
    esic
  } = req.body;

  if (!empid || !month || !year || !basic_salary) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const bs   = Math.round((parseFloat(basic_salary) || 0) * 100) / 100;
  const h    = Math.round((parseFloat(hra) || 0) * 100) / 100;
  const d_a  = Math.round((parseFloat(da) || 0) * 100) / 100;
  const all  = Math.round((parseFloat(allowances) || 0) * 100) / 100;
  const gen_ded = Math.round((parseFloat(deductions) || 0) * 100) / 100;
  const pf_ded  = Math.round((parseFloat(pf) || 0) * 100) / 100;
  const pt_ded  = Math.round((parseFloat(ptax) || 0) * 100) / 100;
  const es_ded  = Math.round((parseFloat(esic) || 0) * 100) / 100;

  const net_pay = Math.round((bs + h + d_a + all - (gen_ded + pf_ded + pt_ded + es_ded)) * 100) / 100;

  try {
    await prisma.payroll.create({
      data: {
        empid,
        month,
        year,
        basic_salary: bs,
        hra: h,
        da: d_a,
        allowances: all,
        pf: pf_ded,
        ptax: pt_ded,
        esic: es_ded,
        deductions: gen_ded,
        net_pay
      }
    });

    res.status(200).json({ message: 'Payroll added successfully' });
  } catch (error) {
    console.error('Error adding payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
