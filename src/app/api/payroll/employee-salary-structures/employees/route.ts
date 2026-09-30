import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

// ─── GET /api/payroll/employee-salary-structures/employees ──────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("company_id");
    const search = searchParams.get("search");

    const where: any = {
      status: { not: "Inactive" },
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
        company_id: true,
        company: {
          select: { id: true, uid: true, name: true },
        },
        employee_salary_structures: {
          orderBy: { effective_from: "desc" },
          include: {
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

    const formatted = employees.map((emp) => {
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
              effective_from: activeStructure.effective_from,
              effective_to: activeStructure.effective_to,
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
