import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import {
  calculateSalaryBreakdown,
  validateStructureComponents,
  type ComponentRuleInput,
} from "@/lib/salaryCalculation";

/**
 * Resolves company UID from either integer id or string uid.
 */
async function resolveCompanyUid(companyIdInput: string | number | undefined, userCompanyId?: string | null): Promise<string | null> {
  if (companyIdInput !== undefined && companyIdInput !== null && companyIdInput !== "") {
    if (typeof companyIdInput === "number" || !isNaN(Number(companyIdInput))) {
      const comp = await prisma.company.findFirst({
        where: {
          OR: [{ id: Number(companyIdInput) }, { uid: String(companyIdInput) }],
        },
      });
      return comp ? comp.uid : null;
    } else {
      const comp = await prisma.company.findUnique({
        where: { uid: String(companyIdInput) },
      });
      return comp ? comp.uid : null;
    }
  }

  // Fallback to user's assigned company
  if (userCompanyId) {
    return userCompanyId;
  }

  // If only 1 company exists in DB, default to it
  const defaultComp = await prisma.company.findFirst();
  return defaultComp ? defaultComp.uid : null;
}

// ─── GET /api/payroll/salary-structures ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYSLIP_GENERATE]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("company_id");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    const userCompanyId = (auth.user as any)?.company_id;
    const companyUid = await resolveCompanyUid(companyIdParam || undefined, userCompanyId);

    const where: any = {};

    if (companyUid) {
      where.company_id = companyUid;
    }

    if (statusParam && (statusParam === "ACTIVE" || statusParam === "INACTIVE")) {
      where.status = statusParam;
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const structures = await prisma.salary_structure.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            uid: true,
            name: true,
          },
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
                active: true,
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
      orderBy: { createdAt: "desc" },
    });

    // Compute live preview totals for each structure
    const data = structures.map((s) => {
      const compRules: ComponentRuleInput[] = s.components.map((c) => ({
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

      return {
        id: s.id,
        uid: s.uid,
        company_id: s.company_id,
        name: s.name,
        code: s.code,
        description: s.description,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        company: s.company,
        componentsCount: s.components.length,
        assignedEmployeesCount: s._count.employeeSalaryStructures,
        components: s.components.map((c) => ({
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
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/payroll/salary-structures:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch salary structures" },
      { status: 500 }
    );
  }
}

// ─── POST /api/payroll/salary-structures ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_EDIT]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const { company_id, name, code, description, status = "ACTIVE", components } = body;

    // 1. Basic validation
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Structure name is required." }, { status: 400 });
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, message: "Structure code is required." }, { status: 400 });
    }
    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one salary component must be configured for this structure." },
        { status: 400 }
      );
    }

    // 2. Resolve company
    const companyUid = await resolveCompanyUid(company_id, (auth.user as any)?.company_id);
    if (!companyUid) {
      return NextResponse.json({ success: false, message: "Company not found or invalid." }, { status: 404 });
    }

    const trimmedCode = code.trim().toUpperCase();

    // 3. Unique code check per company
    const existing = await prisma.salary_structure.findFirst({
      where: {
        company_id: companyUid,
        code: trimmedCode,
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Salary structure code "${trimmedCode}" already exists for this company.` },
        { status: 400 }
      );
    }

    // 4. Validate salary components in DB
    const incomingComponentIds: number[] = [];
    for (const c of components) {
      let rawId = c.salary_component_id;
      if (typeof rawId === "string" && isNaN(Number(rawId))) {
        const found = await prisma.salary_component.findUnique({ where: { uid: rawId } });
        if (!found) {
          return NextResponse.json({ success: false, message: `Salary component "${rawId}" not found.` }, { status: 404 });
        }
        rawId = found.id;
      }
      incomingComponentIds.push(Number(rawId));
    }

    const dbComponents = await prisma.salary_component.findMany({
      where: {
        id: { in: incomingComponentIds },
        company_id: companyUid,
      },
    });

    if (dbComponents.length !== incomingComponentIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more salary components do not exist or do not belong to this company." },
        { status: 400 }
      );
    }

    const componentMetaMap = new Map<number, { name: string; code: string; type: any }>();
    dbComponents.forEach((dc) => {
      componentMetaMap.set(dc.id, { name: dc.name, code: dc.code, type: dc.type });
    });

    // 5. Normalize and validate component rules
    const normalizedComponents: ComponentRuleInput[] = components.map((c, index) => {
      let compId = Number(c.salary_component_id);
      let baseId = c.base_component_id ? Number(c.base_component_id) : null;

      return {
        salary_component_id: compId,
        calculation_type: c.calculation_type,
        value: Number(c.value),
        base_component_id: baseId,
        sequence: c.sequence !== undefined ? Number(c.sequence) : index + 1,
      };
    });

    const validation = validateStructureComponents(normalizedComponents, componentMetaMap);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    // 6. Prisma Transaction: Create structure + components atomically
    const createdStructure = await prisma.$transaction(async (tx) => {
      const structure = await tx.salary_structure.create({
        data: {
          company_id: companyUid,
          name: name.trim(),
          code: trimmedCode,
          description: description?.trim() || null,
          status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        },
      });

      // Insert all component rows
      for (const comp of normalizedComponents) {
        await tx.employee_salary_structure_component.create({
          data: {
            salary_structure_id: structure.id,
            salary_component_id: comp.salary_component_id,
            calculation_type: comp.calculation_type,
            value: comp.value,
            base_component_id: comp.base_component_id || null,
            sequence: comp.sequence ?? 0,
          },
        });
      }

      // Fetch complete newly created structure
      return tx.salary_structure.findUnique({
        where: { id: structure.id },
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
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Salary structure created successfully.",
      data: {
        uid: createdStructure?.uid,
        id: createdStructure?.id,
        name: createdStructure?.name,
        code: createdStructure?.code,
        description: createdStructure?.description,
        status: createdStructure?.status,
        company: createdStructure?.company,
        components: createdStructure?.components.map((c) => ({
          salary_component_id: c.salary_component_id,
          salary_component: c.salaryComponent,
          salaryComponent: c.salaryComponent,
          calculation_type: c.calculation_type,
          value: Number(c.value),
          base_component_id: c.base_component_id,
          base_component: c.baseComponent,
          baseComponent: c.baseComponent,
          sequence: c.sequence,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error creating salary structure:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "An error occurred while creating salary structure." },
      { status: 500 }
    );
  }
}
