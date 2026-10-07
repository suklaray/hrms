import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { isSuperAdmin } from "@/lib/rbac";

// ─── GET /api/payroll/employee-salary-structures/employees ──────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("company_id");
    const search = searchParams.get("search");
    const financialYearIdParam = searchParams.get("financial_year_id");

    const where: any = {
      status: { not: "Inactive" },
      role: { not: "superadmin" },
    };

    if (companyIdParam) {
      where.company_id = companyIdParam;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { empid: { contains: q } },
        { email: { contains: q } },
        { position: { contains: q } },
      ];
    }

    const structureWhere: any = {};
    if (financialYearIdParam) {
      structureWhere.financial_year_id = financialYearIdParam;
    }

    const employees = await prisma.users.findMany({
      where,
      select: {
        id: true,
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        position: true,
        employee_type: true,
        status: true,
        role: true,
        roleId: true,
        company_id: true,
        company: {
          select: { id: true, uid: true, name: true },
        },
        rbacRole: {
          select: { id: true, name: true, type: true },
        },
        employee_salary_structures: {
          where: Object.keys(structureWhere).length > 0 ? structureWhere : undefined,
          orderBy: { createdAt: "desc" },
          include: {
            financialYear: {
              select: { id: true, uid: true, name: true, start_date: true, end_date: true, status: true },
            },
            salaryStructure: {
              select: { id: true, uid: true, name: true, code: true },
            },
            components: {
              include: {
                salaryComponent: {
                  select: { id: true, name: true, code: true, type: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const nonSuperAdminEmployees = employees.filter(
      (emp) => !isSuperAdmin(emp) && emp.role !== "superadmin"
    );

    const formatted = nonSuperAdminEmployees.map((emp) => {
      const activeStructure = emp.employee_salary_structures.find((s) => s.status === "ACTIVE") || null;

      let currentGross = 0;
      let currentNet = 0;
      if (activeStructure) {
        let earnings = 0;
        let deductions = 0;
        activeStructure.components.forEach((c) => {
          const amt = Number(c.amount) || 0;
          if (c.salaryComponent?.type === "EARNING") earnings += amt;
          else deductions += amt;
        });
        currentGross = Math.round(earnings * 100) / 100;
        currentNet = Math.round((earnings - deductions) * 100) / 100;
      }

      return {
        id: emp.id,
        empid: emp.empid,
        name: emp.name,
        email: emp.email,
        contact_number: emp.contact_number,
        position: emp.position,
        employee_type: emp.employee_type,
        company_id: emp.company_id,
        company: emp.company,
        totalSalaryVersions: emp.employee_salary_structures.length,
        hasActiveSalary: Boolean(activeStructure),
        currentSalary: activeStructure
          ? {
              uid: activeStructure.uid,
              salary_structure_name: activeStructure.salaryStructure?.name || "Custom Salary",
              salary_structure_code: activeStructure.salaryStructure?.code || "CUSTOM",
              financial_year_id: activeStructure.financial_year_id,
              financial_year_name: activeStructure.financialYear?.name || "N/A",
              grossSalary: currentGross,
              netSalary: currentNet,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("Error fetching employees for salary setup:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch employees." },
      { status: 500 }
    );
  }
}
