import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {

  // 1. Check authentication & permissions
  const token = req?.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Invalid token' }); }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return res.status(403).json({ message: 'Forbidden: insufficient permissions' });

  // 2. Dispatch based on HTTP Method
  switch (req.method) {
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
    case 'PATCH':
      return handlePut(req, res);
    case 'GET':
      return handleGet(req, res);
    default:
      res.setHeader('Allow', ['POST', 'PUT', 'PATCH', 'GET']);
      return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
}

// ─── POST (Create) ────────────────────────────────────────────────────────────
async function handlePost(req, res) {
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
    financial_year_start_month,
    financial_year_end_month,
    salary_calendar,
    status,
    remarks
  } = req.body;

  if (!company_id || !payroll_country || !currency || !payroll_effective_date || !payroll_cycle || !working_days || !attendance_cut_off || !leave_cut_off || !salary_payment_date || !financial_year_start_month || !financial_year_end_month || !salary_calendar || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await prisma.payrollConfiguration.create({
      data: {
        company_id: Number(company_id),
        payroll_country,
        currency,
        payroll_effective_date: new Date(payroll_effective_date),
        payroll_cycle,
        working_days,
        attendance_cut_off,
        leave_cut_off,
        overtime_cut_off,
        salary_payment_date: Number(salary_payment_date),
        financial_year_start_month: String(financial_year_start_month),
        financial_year_end_month: String(financial_year_end_month),
        salary_calendar,
        approval: "NO",
        status,
        remarks
      }
    });

    res.status(200).json({ type: 'success', message: 'Payroll configuration added successfully' });
  } catch (error) {
    console.error('Error adding payroll configuration:', error);
    res.status(500).json({ type: 'Internal server error', message: error.message });
  }
}

// ─── PUT / PATCH (Update / Toggle Status) ──────────────────────────────────────
async function handlePut(req, res) {
  const { id, ...updateData } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Configuration ID is required for update' });
  }
  try {
    const isNumericId = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const whereClause = isNumericId ? { id: Number(id) } : { uid: String(id) };

    const safeUpdateData = { ...updateData };
    delete safeUpdateData.company;
    delete safeUpdateData.createdAt;
    delete safeUpdateData.updatedAt;
    delete safeUpdateData.id;
    delete safeUpdateData.uid;

    if (safeUpdateData.company_id !== undefined && safeUpdateData.company_id !== null && safeUpdateData.company_id !== '') {
      safeUpdateData.company_id = Number(safeUpdateData.company_id);
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

    // Allows partial updates (e.g. just status toggle) or full updates (editing the form)
    const updated = await prisma.payrollConfiguration.update({
      where: whereClause,
      data: safeUpdateData,
    });
    return res.status(200).json({ success: true, message: 'Configuration updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating configuration:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── GET (Get Payroll Configuration from uid or id) ───────────────────────────────
async function handleGet(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Configuration ID is required to fetch' });
  }
  try {
    const isNumericId = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const configuration = await prisma.payrollConfiguration.findFirst({
      where: isNumericId
        ? { OR: [{ id: Number(id) }, { uid: String(id) }] }
        : { uid: String(id) },
      include: {
        company: true,
      },
    });

    if (!configuration) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    return res.status(200).json({ success: true, data: configuration });
  } catch (error) {
    console.error('Error getting configuration:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}