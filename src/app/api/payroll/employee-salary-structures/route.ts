import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkSalaryVersionOverlap } from "@/lib/salaryCalculation";

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
    },
  });
}

/**
 * Resolves salary structure ID (integer) from either numeric id or string uid.
 */
async function resolveStructureId(structureInput: string | number | undefined | null): Promise<number | null> {
  if (!structureInput) return null;
  const isNumeric = !isNaN(Number(structureInput));
  const st = await prisma.salary_structure.findFirst({
    where: {
      OR: [
        { uid: String(structureInput) },
        isNumeric ? { id: Number(structureInput) } : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true },
  });
  return st ? st.id : null;
}

// ─── GET /api/payroll/employee-salary-structures ────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get("employee_id");
    const structureIdParam = searchParams.get("salary_structure_id");
    const statusParam = searchParams.get("status");
    const companyIdParam = searchParams.get("company_id");
    const periodStartParam = searchParams.get("payroll_period_start");
    const periodEndParam = searchParams.get("payroll_period_end");
    const effectiveDateParam = searchParams.get("effective_date");

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
      const stId = await resolveStructureId(structureIdParam);
      if (stId) {
        where.salary_structure_id = stId;
      }
    }

    if (statusParam && ["ACTIVE", "INACTIVE", "CLOSED"].includes(statusParam.toUpperCase())) {
      where.status = statusParam.toUpperCase() as any;
    }

    if (companyIdParam) {
      where.employee = {
        company_id: companyIdParam,
      };
    }

    // Effective Date Lookup (Section 25 Integration for Payroll Periods)
    if (periodStartParam && periodEndParam) {
      const pStart = new Date(periodStartParam);
      const pEnd = new Date(periodEndParam);
      if (!isNaN(pStart.getTime()) && !isNaN(pEnd.getTime())) {
        where.effective_from = { lte: pEnd };
        where.OR = [
          { effective_to: null },
          { effective_to: { gte: pStart } },
        ];
      }
    } else if (effectiveDateParam) {
      const effDate = new Date(effectiveDateParam);
      if (!isNaN(effDate.getTime())) {
        where.effective_from = { lte: effDate };
        where.OR = [
          { effective_to: null },
          { effective_to: { gte: effDate } },
        ];
      }
    }

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
            company: {
              select: { id: true, uid: true, name: true },
            },
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
      orderBy: [{ employee_id: "asc" }, { effective_from: "desc" }],
    });

    // Calculate totals for each employee salary version
    const data = records.map((rec) => {
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
        effective_from: rec.effective_from,
        effective_to: rec.effective_to,
        status: rec.status,
        remarks: rec.remarks,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        employee: rec.employee,
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
      effective_from,
      effective_to = null,
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

    // 2. Validate salary structure (optional if custom components, but if provided, must exist)
    let resolvedStructureId: number | null = null;
    if (salary_structure_id) {
      resolvedStructureId = await resolveStructureId(salary_structure_id);
      if (!resolvedStructureId) {
        return NextResponse.json({ success: false, message: "Salary structure not found." }, { status: 404 });
      }
    }

    // 3. Validate effective dates
    if (!effective_from) {
      return NextResponse.json({ success: false, message: "Effective from date is required." }, { status: 400 });
    }
    const fromDate = new Date(effective_from);
    if (isNaN(fromDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid effective_from date." }, { status: 400 });
    }

    let toDate: Date | null = null;
    if (effective_to) {
      toDate = new Date(effective_to);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json({ success: false, message: "Invalid effective_to date." }, { status: 400 });
      }
      if (toDate < fromDate) {
        return NextResponse.json(
          { success: false, message: "effective_from must be before or equal to effective_to." },
          { status: 400 }
        );
      }
    }

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

    // 5. Versioning and Overlap Handling (Preserve historical payroll data!)
    const existingVersions = await prisma.employee_salary_structure.findMany({
      where: { employee_id: employee.empid },
      orderBy: { effective_from: "desc" },
    });

    // Determine final status based on auto_close_previous:
    // If auto_close_previous is false, create as INACTIVE to keep previous active info intact.
    const finalStatus: "ACTIVE" | "INACTIVE" | "CLOSED" = !auto_close_previous
      ? "INACTIVE"
      : (status === "CLOSED" ? "CLOSED" : status === "INACTIVE" ? "INACTIVE" : "ACTIVE");

    // Auto-close active version if requested
    let versionToAutoClose: any = null;
    if (finalStatus === "ACTIVE" && auto_close_previous) {
      const activeVersion = existingVersions.find((v) => v.status === "ACTIVE");
      if (activeVersion) {
        const activeFrom = new Date(activeVersion.effective_from).getTime();
        if (activeFrom >= fromDate.getTime()) {
          return NextResponse.json(
            {
              success: false,
              message: `The active salary version started on ${new Date(activeVersion.effective_from).toISOString().slice(0, 10)}. New revision's effective_from (${effective_from}) must be strictly after that date.`,
            },
            { status: 400 }
          );
        }
        versionToAutoClose = activeVersion;
      }
    }

    // Check overlap with other versions:
    // Only check overlap if the new version is ACTIVE. An INACTIVE version is staged/draft and does not overlap.
    if (finalStatus === "ACTIVE") {
      const versionsToCheck = existingVersions.filter(
        (v) => (!versionToAutoClose || v.id !== versionToAutoClose.id) && v.status !== "INACTIVE"
      );

      const overlapResult = checkSalaryVersionOverlap(versionsToCheck, fromDate, toDate);
      if (overlapResult.overlap) {
        return NextResponse.json({ success: false, message: overlapResult.message }, { status: 400 });
      }
    }

    // 6. Prisma Transaction: Auto-close old version + create new assignment + create employee_salary_component rows
    const result = await prisma.$transaction(async (tx) => {
      // Auto-close previous active version
      if (versionToAutoClose) {
        // Closed version ends on the day before the new version begins
        const dayBefore = new Date(fromDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        await tx.employee_salary_structure.update({
          where: { id: versionToAutoClose.id },
          data: {
            effective_to: dayBefore,
            status: "CLOSED",
          },
        });
      }

      // Create new employee salary version
      const newVersion = await tx.employee_salary_structure.create({
        data: {
          employee_id: employee.empid,
          salary_structure_id: resolvedStructureId,
          effective_from: fromDate,
          effective_to: toDate,
          status: finalStatus,
          remarks: remarks ? String(remarks).trim() : null,
        },
      });

      // Insert actual component values into employee_salary_component
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

    const responseMsg =
      finalStatus === "INACTIVE"
        ? "New salary structure created with status INACTIVE. Previous active salary remains active."
        : versionToAutoClose
        ? "New active salary structure created. Previous active version closed successfully."
        : "Employee salary structure assigned successfully.";

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
