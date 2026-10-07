import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function findEmployeeSalaryByUidOrId(identifier: string) {
  if (!identifier) return null;
  const isNumeric = !isNaN(Number(identifier));
  return prisma.employee_salary_structure.findFirst({
    where: {
      OR: [
        { uid: identifier },
        isNumeric ? { id: Number(identifier) } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      employee: {
        select: {
          id: true,
          empid: true,
          name: true,
          email: true,
          contact_number: true,
          position: true,
          company: { select: { id: true, uid: true, name: true } },
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
  });
}

// ─── GET /api/payroll/employee-salary-structures/:uid ──────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const record = await findEmployeeSalaryByUidOrId(uid);

    if (!record) {
      return NextResponse.json({ success: false, message: "Employee salary structure not found" }, { status: 404 });
    }

    // Also fetch historical versions for this employee
    const history = await prisma.employee_salary_structure.findMany({
      where: {
        employee_id: record.employee_id,
        NOT: { id: record.id },
      },
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
              select: { id: true, uid: true, name: true, code: true, type: true },
            },
          },
        },
      },
    });

    let grossEarnings = 0;
    let totalDeductions = 0;

    const components = record.components.map((c) => {
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

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        components,
        summary: {
          grossEarnings,
          totalDeductions,
          netSalary,
        },
        history: history.map((h) => {
          let hGross = 0;
          let hDed = 0;
          const hComps = h.components.map((c) => {
            const a = Number(c.amount) || 0;
            if (c.salaryComponent?.type === "EARNING") hGross += a;
            else hDed += a;
            return {
              id: c.id,
              amount: a,
              salaryComponent: c.salaryComponent,
            };
          });
          return {
            id: h.id,
            uid: h.uid,
            financial_year_id: h.financial_year_id,
            financialYear: h.financialYear,
            financial_year: h.financialYear,
            status: h.status,
            remarks: h.remarks,
            salaryStructure: h.salaryStructure,
            components: hComps,
            grossEarnings: Math.round(hGross * 100) / 100,
            totalDeductions: Math.round(hDed * 100) / 100,
            netSalary: Math.round((hGross - hDed) * 100) / 100,
            createdAt: h.createdAt,
          };
        }),
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/payroll/employee-salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch employee salary structure" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/payroll/employee-salary-structures/:uid ────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const record = await findEmployeeSalaryByUidOrId(uid);

    if (!record) {
      return NextResponse.json({ success: false, message: "Employee salary structure not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { salary_structure_id, financial_year_id, status, remarks, components } = body;

    const updateData: any = {};

    if (salary_structure_id !== undefined) {
      if (!salary_structure_id) {
        return NextResponse.json({ success: false, message: "Salary structure cannot be empty." }, { status: 400 });
      }
      const isNumeric = !isNaN(Number(salary_structure_id));
      const st = await prisma.salary_structure.findFirst({
        where: {
          OR: [
            { uid: String(salary_structure_id) },
            isNumeric ? { id: Number(salary_structure_id) } : undefined,
          ].filter(Boolean) as any,
        },
        select: { uid: true },
      });
      if (!st) {
        return NextResponse.json({ success: false, message: "Salary structure not found." }, { status: 404 });
      }
      updateData.salary_structure_id = st.uid;
    }

    if (financial_year_id !== undefined) {
      if (!financial_year_id) {
        return NextResponse.json({ success: false, message: "Financial year cannot be empty." }, { status: 400 });
      }
      const isNumeric = !isNaN(Number(financial_year_id));
      const fy = await prisma.financial_year.findFirst({
        where: {
          OR: [
            { uid: String(financial_year_id) },
            isNumeric ? { id: Number(financial_year_id) } : undefined,
          ].filter(Boolean) as any,
        },
        select: { uid: true, status: true },
      });
      if (!fy) {
        return NextResponse.json({ success: false, message: "Financial year not found." }, { status: 404 });
      }
      if (fy.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, message: "Please select an active financial year" },
          { status: 400 }
        );
      }
      if (fy.uid !== record.financial_year_id) {
        const existingOther = await prisma.employee_salary_structure.findFirst({
          where: {
            employee_id: record.employee_id,
            financial_year_id: fy.uid,
            NOT: { id: record.id },
          },
        });
        if (existingOther) {
          return NextResponse.json(
            {
              success: false,
              message: "A salary structure has already been created against this financial year and this employee.",
            },
            { status: 400 }
          );
        }
      }
      updateData.financial_year_id = fy.uid;
    }

    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE", "CLOSED"].includes(status.toUpperCase())) {
        return NextResponse.json({ success: false, message: "Invalid status value." }, { status: 400 });
      }
      updateData.status = status.toUpperCase();
    }

    if (remarks !== undefined) {
      updateData.remarks = remarks ? String(remarks).trim() : null;
    }

    // Validate components if passed
    let normalizedComponents: Array<{ salary_component_id: number; amount: number }> | null = null;
    if (components !== undefined) {
      if (!Array.isArray(components) || components.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one component amount must be provided." },
          { status: 400 }
        );
      }

      normalizedComponents = [];
      const seen = new Set<number>();
      for (const c of components) {
        let cId = Number(c.salary_component_id);
        if (isNaN(cId) || cId <= 0) {
          if (typeof c.salary_component_id === "string") {
            const found = await prisma.salary_component.findUnique({ where: { uid: c.salary_component_id } });
            if (found) cId = found.id;
          }
        }
        const amt = Number(c.amount);
        if (isNaN(cId) || cId <= 0 || isNaN(amt) || amt < 0) {
          return NextResponse.json({ success: false, message: "Invalid component or amount." }, { status: 400 });
        }
        if (seen.has(cId)) {
          return NextResponse.json({ success: false, message: `Duplicate component ID ${cId}.` }, { status: 400 });
        }
        seen.add(cId);
        normalizedComponents.push({ salary_component_id: cId, amount: Math.round(amt * 100) / 100 });
      }
    }

    const targetFinancialYearId = updateData.financial_year_id || record.financial_year_id;

    // Atomic Prisma Transaction
    const updated = await prisma.$transaction(async (tx) => {
      // If setting this version to ACTIVE, set any other currently active version in the same financial year to INACTIVE
      if (updateData.status === "ACTIVE") {
        await tx.employee_salary_structure.updateMany({
          where: {
            employee_id: record.employee_id,
            financial_year_id: targetFinancialYearId,
            NOT: { id: record.id },
            status: "ACTIVE",
          },
          data: { status: "INACTIVE" },
        });
      }

      await tx.employee_salary_structure.update({
        where: { id: record.id },
        data: updateData,
      });

      if (normalizedComponents) {
        await tx.employee_salary_component.deleteMany({
          where: { employee_salary_structure_id: record.id },
        });

        for (const comp of normalizedComponents) {
          await tx.employee_salary_component.create({
            data: {
              employee_salary_structure_id: record.id,
              salary_component_id: comp.salary_component_id,
              amount: comp.amount,
            },
          });
        }
      }

      return tx.employee_salary_structure.findUnique({
        where: { id: record.id },
        include: {
          employee: {
            select: { id: true, empid: true, name: true, email: true, position: true },
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

    return NextResponse.json({
      success: true,
      message: "Employee salary structure updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/payroll/employee-salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update employee salary structure." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/payroll/employee-salary-structures/:uid ───────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const record = await findEmployeeSalaryByUidOrId(uid);

    if (!record) {
      return NextResponse.json({ success: false, message: "Employee salary structure not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee_salary_component.deleteMany({
        where: { employee_salary_structure_id: record.id },
      });
      await tx.employee_salary_structure.delete({
        where: { id: record.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Employee salary version deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/payroll/employee-salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete employee salary version." },
      { status: 500 }
    );
  }
}
