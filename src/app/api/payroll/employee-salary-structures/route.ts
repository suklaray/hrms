import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { isSuperAdmin } from "@/lib/rbac";

/**
 * Resolves an employee user record from either empid (string) or user id (number/string).
 */
async function resolveEmployee(employeeIdInput: string | number) {
  if (employeeIdInput === undefined || employeeIdInput === null || employeeIdInput === "") {
    return null;
  }
  const str = String(employeeIdInput).trim();
  const isNumeric = !isNaN(Number(str));

  return prisma.users.findFirst({
    where: {
      OR: [
        { empid: str },
        isNumeric ? { id: Number(str) } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      company: {
        select: { id: true, uid: true, name: true },
      },
      rbacRole: {
        select: { id: true, name: true, type: true },
      },
    },
  });
}

/**
 * Resolves salary structure UID (string) from either numeric id or string uid.
 */
async function resolveStructureUid(structureInput: string | number | undefined | null): Promise<string | null> {
  if (!structureInput) return null;
  const isNumeric = !isNaN(Number(structureInput));
  const st = await prisma.salary_structure.findFirst({
    where: {
      OR: [
        { uid: String(structureInput) },
        isNumeric ? { id: Number(structureInput) } : undefined,
      ].filter(Boolean) as any,
    },
    select: { uid: true },
  });
  return st ? st.uid : null;
}

/**
 * Resolves financial year record from either numeric id or string uid.
 */
async function resolveFinancialYear(fyInput: string | number | undefined | null) {
  if (!fyInput) return null;
  const isNumeric = !isNaN(Number(fyInput));
  return prisma.financial_year.findFirst({
    where: {
      OR: [
        { uid: String(fyInput) },
        isNumeric ? { id: Number(fyInput) } : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true, uid: true, name: true, status: true, lock: true },
  });
}

// ─── GET /api/payroll/employee-salary-structures ────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get("employee_id");
    const structureIdParam = searchParams.get("salary_structure_id");
    const financialYearIdParam = searchParams.get("financial_year_id");
    const statusParam = searchParams.get("status");
    const companyIdParam = searchParams.get("company_id");

    const where: any = {};

    if (employeeIdParam) {
      const emp = await resolveEmployee(employeeIdParam);
      if (emp) {
        where.employee_id = emp.empid;
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    if (structureIdParam) {
      const stUid = await resolveStructureUid(structureIdParam);
      if (stUid) {
        where.salary_structure_id = stUid;
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    if (financialYearIdParam) {
      const fy = await resolveFinancialYear(financialYearIdParam);
      if (fy) {
        where.financial_year_id = fy.uid;
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    if (statusParam && ["ACTIVE", "INACTIVE", "CLOSED"].includes(statusParam.toUpperCase())) {
      where.status = statusParam.toUpperCase() as any;
    }

    where.employee = {
      ...(companyIdParam ? { company_id: companyIdParam } : {}),
      role: { not: "superadmin" },
    };

    const records = await prisma.employee_salary_structure.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            empid: true,
            name: true,
            email: true,
            contact_number: true,
            position: true,
            employee_type: true,
            company_id: true,
            role: true,
            roleId: true,
            company: {
              select: { id: true, uid: true, name: true },
            },
            rbacRole: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        financialYear: {
          select: {
            id: true,
            uid: true,
            name: true,
            start_date: true,
            end_date: true,
            status: true,
            lock: true,
          },
        },
        salaryStructure: {
          select: {
            id: true,
            uid: true,
            name: true,
            code: true,
            description: true,
            status: true,
          },
        },
        components: {
          include: {
            salaryComponent: {
              select: {
                id: true,
                uid: true,
                name: true,
                code: true,
                type: true,
                calculation_type: true,
                taxable: true,
                statutory: true,
              },
            },
          },
        },
      },
      orderBy: [{ employee_id: "asc" }, { createdAt: "desc" }],
    });

    const nonSuperAdminRecords = records.filter(
      (rec) => !isSuperAdmin(rec.employee) && rec.employee?.role !== "superadmin"
    );

    // Calculate totals for each employee salary structure
    const data = nonSuperAdminRecords.map((rec) => {
      let grossEarnings = 0;
      let totalDeductions = 0;

      const components = rec.components.map((c) => {
        const amt = Number(c.amount) || 0;
        const type = c.salaryComponent?.type || "EARNING";
        if (type === "EARNING") {
          grossEarnings += amt;
        } else {
          totalDeductions += amt;
        }

        return {
          id: c.id,
          uid: c.uid,
          employee_salary_structure_id: c.employee_salary_structure_id,
          salary_component_id: c.salary_component_id,
          amount: amt,
          salaryComponent: c.salaryComponent,
          salary_component: c.salaryComponent,
        };
      });

      grossEarnings = Math.round(grossEarnings * 100) / 100;
      totalDeductions = Math.round(totalDeductions * 100) / 100;
      const netSalary = Math.round((grossEarnings - totalDeductions) * 100) / 100;

      return {
        id: rec.id,
        uid: rec.uid,
        employee_id: rec.employee_id,
        salary_structure_id: rec.salary_structure_id,
        financial_year_id: rec.financial_year_id,
        status: rec.status,
        remarks: rec.remarks,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        employee: rec.employee,
        financialYear: rec.financialYear,
        financial_year: rec.financialYear,
        salaryStructure: rec.salaryStructure,
        salary_structure: rec.salaryStructure,
        components,
        summary: {
          grossEarnings,
          totalDeductions,
          netSalary,
        },
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/payroll/employee-salary-structures:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch employee salary structures." },
      { status: 500 }
    );
  }
}

// ─── POST /api/payroll/employee-salary-structures ───────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      employee_id,
      salary_structure_id,
      financial_year_id,
      status = "ACTIVE",
      remarks = null,
      components,
      auto_close_previous = true,
    } = body;

    // 1. Validate employee
    if (!employee_id) {
      return NextResponse.json({ success: false, message: "Employee ID is required." }, { status: 400 });
    }
    const employee = await resolveEmployee(employee_id);
    if (!employee) {
      return NextResponse.json({ success: false, message: "Employee not found." }, { status: 404 });
    }
    if (isSuperAdmin(employee) || employee.role === "superadmin") {
      return NextResponse.json(
        { success: false, message: "Salary structures cannot be assigned to a superadmin." },
        { status: 400 }
      );
    }

    // 2. Validate salary structure
    if (!salary_structure_id) {
      return NextResponse.json({ success: false, message: "Salary structure is required." }, { status: 400 });
    }
    const resolvedStructureUid = await resolveStructureUid(salary_structure_id);
    if (!resolvedStructureUid) {
      return NextResponse.json({ success: false, message: "Salary structure not found." }, { status: 404 });
    }

    // 3. Validate financial year
    if (!financial_year_id) {
      return NextResponse.json({ success: false, message: "Financial year is required." }, { status: 400 });
    }
    const financialYear = await resolveFinancialYear(financial_year_id);
    if (!financialYear) {
      return NextResponse.json({ success: false, message: "Financial year not found." }, { status: 404 });
    }
    if (financialYear.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Please select an active financial year" },
        { status: 400 }
      );
    }
    const resolvedFinancialYearUid = financialYear.uid;

    // 4. Validate components
    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one salary component amount must be provided." },
        { status: 400 }
      );
    }

    const seenCompIds = new Set<number>();
    const normalizedComponents: Array<{ salary_component_id: number; amount: number }> = [];

    for (const c of components) {
      let cId = Number(c.salary_component_id);
      if (isNaN(cId) || cId <= 0) {
        if (typeof c.salary_component_id === "string") {
          const found = await prisma.salary_component.findUnique({ where: { uid: c.salary_component_id } });
          if (found) cId = found.id;
        }
      }
      if (isNaN(cId) || cId <= 0) {
        return NextResponse.json({ success: false, message: "Invalid salary component ID in components list." }, { status: 400 });
      }

      if (seenCompIds.has(cId)) {
        return NextResponse.json(
          { success: false, message: `Duplicate component ID ${cId} provided.` },
          { status: 400 }
        );
      }
      seenCompIds.add(cId);

      const amt = Number(c.amount);
      if (isNaN(amt) || amt < 0) {
        return NextResponse.json(
          { success: false, message: "Component amounts must be non-negative numbers." },
          { status: 400 }
        );
      }

      normalizedComponents.push({ salary_component_id: cId, amount: Math.round(amt * 100) / 100 });
    }

    // Verify all components exist in DB
    const dbComponents = await prisma.salary_component.findMany({
      where: { id: { in: Array.from(seenCompIds) } },
    });
    if (dbComponents.length !== seenCompIds.size) {
      return NextResponse.json(
        { success: false, message: "One or more salary components do not exist." },
        { status: 400 }
      );
    }

    // 5. Prevent duplicate salary structure creation for the same financial year and employee
    const existingVersion = await prisma.employee_salary_structure.findFirst({
      where: {
        employee_id: employee.empid,
        financial_year_id: resolvedFinancialYearUid,
      },
    });

    if (existingVersion) {
      return NextResponse.json(
        {
          success: false,
          message: "A salary structure has already been created against this financial year and this employee.",
        },
        { status: 400 }
      );
    }

    const finalStatus: "ACTIVE" | "INACTIVE" | "CLOSED" = status === "CLOSED" ? "CLOSED" : status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    // 6. Prisma Transaction: create new assignment + create employee_salary_component rows
    const result = await prisma.$transaction(async (tx) => {
      // Create new employee salary version
      const newVersion = await tx.employee_salary_structure.create({
        data: {
          employee_id: employee.empid,
          salary_structure_id: resolvedStructureUid,
          financial_year_id: resolvedFinancialYearUid,
          status: finalStatus,
          remarks: remarks ? String(remarks).trim() : null,
        },
      });

      // Insert component values into employee_salary_component
      for (const comp of normalizedComponents) {
        await tx.employee_salary_component.create({
          data: {
            employee_salary_structure_id: newVersion.id,
            salary_component_id: comp.salary_component_id,
            amount: comp.amount,
          },
        });
      }

      // Return full created record
      return tx.employee_salary_structure.findUnique({
        where: { id: newVersion.id },
        include: {
          employee: {
            select: {
              id: true,
              empid: true,
              name: true,
              email: true,
              position: true,
              company: { select: { id: true, uid: true, name: true } },
            },
          },
          financialYear: {
            select: { id: true, uid: true, name: true, start_date: true, end_date: true, status: true },
          },
          salaryStructure: {
            select: { id: true, uid: true, name: true, code: true },
          },
          components: {
            include: {
              salaryComponent: {
                select: { id: true, uid: true, name: true, code: true, type: true },
              },
            },
          },
        },
      });
    });

    const responseMsg = "Employee salary structure assigned successfully.";

    return NextResponse.json({
      success: true,
      message: responseMsg,
      data: result,
    });
  } catch (error: any) {
    console.error("Error creating employee salary structure:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create employee salary structure." },
      { status: 500 }
    );
  }
}
