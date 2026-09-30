import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import {
  calculateSalaryBreakdown,
  validateStructureComponents,
  type ComponentRuleInput,
} from "@/lib/salaryCalculation";

async function findStructureByUidOrId(identifier: string) {
  if (!identifier) return null;
  const isNumeric = !isNaN(Number(identifier));
  return prisma.salary_structure.findFirst({
    where: {
      OR: [
        { uid: identifier },
        isNumeric ? { id: Number(identifier) } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      company: {
        select: { id: true, uid: true, name: true },
      },
      components: {
        orderBy: { sequence: "asc" },
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
          baseComponent: {
            select: {
              id: true,
              uid: true,
              name: true,
              code: true,
              type: true,
            },
          },
        },
      },
      _count: {
        select: {
          employeeSalaryStructures: true,
        },
      },
    },
  });
}

// ─── GET /api/payroll/salary-structures/:uid ───────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const structure = await findStructureByUidOrId(uid);

    if (!structure) {
      return NextResponse.json({ success: false, message: "Salary structure not found" }, { status: 404 });
    }

    const compRules: ComponentRuleInput[] = structure.components.map((c) => ({
      salary_component_id: c.salary_component_id,
      calculation_type: c.calculation_type as any,
      value: Number(c.value),
      base_component_id: c.base_component_id,
      sequence: c.sequence,
      name: c.salaryComponent?.name,
      code: c.salaryComponent?.code,
      type: c.salaryComponent?.type as any,
    }));

    const breakdown = calculateSalaryBreakdown(compRules);

    return NextResponse.json({
      success: true,
      data: {
        id: structure.id,
        uid: structure.uid,
        company_id: structure.company_id,
        name: structure.name,
        code: structure.code,
        description: structure.description,
        status: structure.status,
        createdAt: structure.createdAt,
        updatedAt: structure.updatedAt,
        company: structure.company,
        assignedEmployeesCount: structure._count.employeeSalaryStructures,
        components: structure.components.map((c) => ({
          id: c.id,
          uid: c.uid,
          salary_structure_id: c.salary_structure_id,
          salary_component_id: c.salary_component_id,
          calculation_type: c.calculation_type,
          value: Number(c.value),
          base_component_id: c.base_component_id,
          sequence: c.sequence,
          salary_component: c.salaryComponent,
          salaryComponent: c.salaryComponent,
          base_component: c.baseComponent,
          baseComponent: c.baseComponent,
        })),
        stats: {
          totalEarnings: breakdown.totalEarnings,
          totalDeductions: breakdown.totalDeductions,
          netSalary: breakdown.netSalary,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/payroll/salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch salary structure" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/payroll/salary-structures/:uid ─────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const existing = await findStructureByUidOrId(uid);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Salary structure not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, code, description, status, components } = body;

    const updateStructureData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ success: false, message: "Name cannot be empty." }, { status: 400 });
      }
      updateStructureData.name = name.trim();
    }

    if (code !== undefined) {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        return NextResponse.json({ success: false, message: "Code cannot be empty." }, { status: 400 });
      }
      if (trimmedCode !== existing.code) {
        const conflict = await prisma.salary_structure.findFirst({
          where: {
            company_id: existing.company_id,
            code: trimmedCode,
            NOT: { id: existing.id },
          },
        });
        if (conflict) {
          return NextResponse.json(
            { success: false, message: `Salary structure code "${trimmedCode}" already exists for this company.` },
            { status: 400 }
          );
        }
      }
      updateStructureData.code = trimmedCode;
    }

    if (description !== undefined) {
      updateStructureData.description = description ? description.trim() : null;
    }

    if (status !== undefined) {
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        return NextResponse.json({ success: false, message: "Status must be ACTIVE or INACTIVE." }, { status: 400 });
      }
      updateStructureData.status = status;
    }

    let normalizedComponents: ComponentRuleInput[] | null = null;

    if (components !== undefined) {
      if (!Array.isArray(components) || components.length === 0) {
        return NextResponse.json(
          { success: false, message: "Salary structure must contain at least one component." },
          { status: 400 }
        );
      }

      const incomingIds = components.map((c) => Number(c.salary_component_id));
      const dbComponents = await prisma.salary_component.findMany({
        where: {
          id: { in: incomingIds },
          company_id: existing.company_id,
        },
      });

      if (dbComponents.length !== incomingIds.length) {
        return NextResponse.json(
          { success: false, message: "One or more salary components do not exist or do not belong to this company." },
          { status: 400 }
        );
      }

      const metaMap = new Map<number, { name: string; code: string; type: any }>();
      dbComponents.forEach((dc) => metaMap.set(dc.id, { name: dc.name, code: dc.code, type: dc.type }));

      normalizedComponents = components.map((c, idx) => ({
        salary_component_id: Number(c.salary_component_id),
        calculation_type: c.calculation_type,
        value: Number(c.value),
        base_component_id: c.base_component_id ? Number(c.base_component_id) : null,
        sequence: c.sequence !== undefined ? Number(c.sequence) : idx + 1,
      }));

      const validation = validateStructureComponents(normalizedComponents, metaMap);
      if (!validation.valid) {
        return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
      }
    }

    // Atomic Prisma transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update structure fields
      const st = await tx.salary_structure.update({
        where: { id: existing.id },
        data: updateStructureData,
      });

      // 2. If components provided: delete old rows and create new rows
      if (normalizedComponents) {
        await tx.employee_salary_structure_component.deleteMany({
          where: { salary_structure_id: existing.id },
        });

        for (const comp of normalizedComponents) {
          await tx.employee_salary_structure_component.create({
            data: {
              salary_structure_id: existing.id,
              salary_component_id: comp.salary_component_id,
              calculation_type: comp.calculation_type,
              value: comp.value,
              base_component_id: comp.base_component_id || null,
              sequence: comp.sequence ?? 0,
            },
          });
        }
      }

      return tx.salary_structure.findUnique({
        where: { id: existing.id },
        include: {
          company: { select: { id: true, uid: true, name: true } },
          components: {
            orderBy: { sequence: "asc" },
            include: {
              salaryComponent: true,
              baseComponent: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Salary structure updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/payroll/salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update salary structure." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/payroll/salary-structures/:uid ────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const { uid } = await context.params;
    const structure = await findStructureByUidOrId(uid);

    if (!structure) {
      return NextResponse.json({ success: false, message: "Salary structure not found" }, { status: 404 });
    }

    // Section 15 check: A salary_structure assigned to an employee should not be physically deleted
    const assignmentCount = await prisma.employee_salary_structure.count({
      where: { salary_structure_id: structure.id },
    });

    if (assignmentCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete salary structure "${structure.name}" because it is currently assigned to ${assignmentCount} employee salary record(s). Change status to INACTIVE instead to archive it.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee_salary_structure_component.deleteMany({
        where: { salary_structure_id: structure.id },
      });
      await tx.salary_structure.delete({
        where: { id: structure.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Salary structure "${structure.name}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/payroll/salary-structures/:uid:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete salary structure." },
      { status: 500 }
    );
  }
}
