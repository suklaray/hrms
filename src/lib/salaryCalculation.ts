// src/lib/salaryCalculation.ts

export type CalculationType = "FIXED" | "PERCENTAGE" | "FORMULA";
export type ComponentType = "EARNING" | "DEDUCTION";

export interface ComponentRuleInput {
  salary_component_id: number;
  calculation_type: CalculationType;
  value: number;
  base_component_id?: number | null;
  sequence?: number;
  name?: string;
  code?: string;
  type?: ComponentType;
}

export interface CalculatedComponentResult {
  salary_component_id: number;
  name?: string;
  code?: string;
  type?: ComponentType;
  calculation_type: CalculationType;
  value: number;
  base_component_id?: number | null;
  baseComponentName?: string;
  amount: number;
  sequence: number;
}

export interface SalaryBreakdownSummary {
  components: CalculatedComponentResult[];
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
}

/**
 * Validates that component rules adhere to HRMS salary structure constraints:
 * 1. Unique components within the structure.
 * 2. Non-negative values.
 * 3. PERCENTAGE requires base_component_id.
 * 4. FIXED does not require base_component_id.
 * 5. Self-referencing is rejected (e.g. HRA based on HRA).
 * 6. Base component must exist within the structure itself.
 * 7. Circular dependencies are rejected (e.g. A -> B and B -> A).
 */
export function validateStructureComponents(
  components: ComponentRuleInput[],
  componentDetailsMap?: Map<number, { name: string; code: string; type: ComponentType }>
): { valid: boolean; error?: string; sorted?: ComponentRuleInput[] } {
  if (!components || components.length === 0) {
    return { valid: false, error: "At least one salary component is required in a salary structure." };
  }

  const seenComponentIds = new Set<number>();
  for (const c of components) {
    const id = Number(c.salary_component_id);
    if (isNaN(id) || id <= 0) {
      return { valid: false, error: "Invalid salary component ID." };
    }
    if (seenComponentIds.has(id)) {
      const compName = componentDetailsMap?.get(id)?.name || `ID ${id}`;
      return { valid: false, error: `Component "${compName}" cannot appear more than once in the same salary structure.` };
    }
    seenComponentIds.add(id);

    const val = Number(c.value);
    if (isNaN(val) || val < 0) {
      const compName = componentDetailsMap?.get(id)?.name || `ID ${id}`;
      return { valid: false, error: `Value for component "${compName}" must be a non-negative number.` };
    }

    if (c.calculation_type === "PERCENTAGE") {
      if (!c.base_component_id) {
        const compName = componentDetailsMap?.get(id)?.name || `ID ${id}`;
        return { valid: false, error: `Percentage component "${compName}" requires a base component.` };
      }
      const baseId = Number(c.base_component_id);
      if (baseId === id) {
        const compName = componentDetailsMap?.get(id)?.name || `ID ${id}`;
        return { valid: false, error: `Component "${compName}" cannot reference itself as its base component.` };
      }
      if (!seenComponentIds.has(baseId) && !components.some((other) => Number(other.salary_component_id) === baseId)) {
        const compName = componentDetailsMap?.get(id)?.name || `ID ${id}`;
        return { valid: false, error: `Base component for "${compName}" must be included in the salary structure.` };
      }
    }
  }

  // Circular dependency check using Topological Sort (Kahn's Algorithm)
  // Dependency graph: edge from base_component -> dependent component
  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();

  for (const c of components) {
    const id = Number(c.salary_component_id);
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const c of components) {
    const id = Number(c.salary_component_id);
    if (c.calculation_type === "PERCENTAGE" && c.base_component_id) {
      const baseId = Number(c.base_component_id);
      if (adj.has(baseId)) {
        adj.get(baseId)!.push(id);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }
  }

  const queue: number[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const sortedIds: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sortedIds.push(u);
    for (const v of adj.get(u) || []) {
      const newDeg = (inDegree.get(v) || 0) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  if (sortedIds.length !== components.length) {
    return {
      valid: false,
      error: "Circular dependency detected among salary components. A component cannot depend indirectly or directly on itself.",
    };
  }

  const compMap = new Map<number, ComponentRuleInput>();
  components.forEach((c) => compMap.set(Number(c.salary_component_id), c));
  const sorted = sortedIds.map((id) => compMap.get(id)!);

  return { valid: true, sorted };
}

/**
 * Calculates live amounts for all components in a salary structure.
 * Respects topological dependency order for PERCENTAGE calculations.
 */
export function calculateSalaryBreakdown(
  components: ComponentRuleInput[],
  componentMeta?: Map<number, { name: string; code: string; type: ComponentType }>
): SalaryBreakdownSummary {
  const validation = validateStructureComponents(components, componentMeta);
  const evaluationList = validation.sorted || components;

  const amountsMap = new Map<number, number>();
  const results: CalculatedComponentResult[] = [];

  for (const comp of evaluationList) {
    const id = Number(comp.salary_component_id);
    const meta = componentMeta?.get(id);
    const type = comp.type || meta?.type || "EARNING";
    const name = comp.name || meta?.name || `Component ${id}`;
    const code = comp.code || meta?.code || `C${id}`;
    const value = Number(comp.value) || 0;

    let calculatedAmount = 0;
    let baseCompName: string | undefined = undefined;

    if (comp.calculation_type === "FIXED") {
      calculatedAmount = value;
    } else if (comp.calculation_type === "PERCENTAGE") {
      const baseId = comp.base_component_id ? Number(comp.base_component_id) : null;
      if (baseId) {
        baseCompName = componentMeta?.get(baseId)?.name;
        const baseAmount = amountsMap.get(baseId) || 0;
        calculatedAmount = Math.round(((value / 100) * baseAmount) * 100) / 100;
      } else {
        calculatedAmount = 0;
      }
    } else {
      calculatedAmount = value;
    }

    amountsMap.set(id, calculatedAmount);

    results.push({
      salary_component_id: id,
      name,
      code,
      type,
      calculation_type: comp.calculation_type,
      value,
      base_component_id: comp.base_component_id,
      baseComponentName: baseCompName,
      amount: calculatedAmount,
      sequence: comp.sequence ?? results.length + 1,
    });
  }

  // Restore sequence ordering for presentation if specified
  results.sort((a, b) => a.sequence - b.sequence);

  let totalEarnings = 0;
  let totalDeductions = 0;

  for (const item of results) {
    if (item.type === "EARNING") {
      totalEarnings += item.amount;
    } else if (item.type === "DEDUCTION") {
      totalDeductions += item.amount;
    }
  }

  totalEarnings = Math.round(totalEarnings * 100) / 100;
  totalDeductions = Math.round(totalDeductions * 100) / 100;
  const netSalary = Math.round((totalEarnings - totalDeductions) * 100) / 100;

  return {
    components: results,
    totalEarnings,
    totalDeductions,
    netSalary,
  };
}

/**
 * Checks for date overlap among employee salary structure versions.
 * Rules:
 * - effective_from must be <= effective_to (if effective_to is defined).
 * - No two versions may overlap in their active time window.
 */
export function checkSalaryVersionOverlap(
  existingVersions: Array<{
    id: number;
    effective_from: Date | string;
    effective_to: Date | string | null;
    status?: string;
  }>,
  newFrom: Date | string,
  newTo: Date | string | null,
  excludeId?: number
): { overlap: boolean; message?: string; conflictingVersion?: any } {
  const fromTime = new Date(newFrom).getTime();
  const toTime = newTo ? new Date(newTo).getTime() : Infinity;

  if (isNaN(fromTime)) {
    return { overlap: true, message: "Invalid effective_from date." };
  }
  if (newTo && isNaN(toTime)) {
    return { overlap: true, message: "Invalid effective_to date." };
  }
  if (toTime < fromTime) {
    return { overlap: true, message: "Effective from date must be before or equal to effective to date." };
  }

  for (const v of existingVersions) {
    if (excludeId && v.id === excludeId) continue;
    // Closed or inactive versions might still count if historical overlap is forbidden,
    // but in payroll, historical periods must not overlap.
    const vFrom = new Date(v.effective_from).getTime();
    const vTo = v.effective_to ? new Date(v.effective_to).getTime() : Infinity;

    // Overlap condition: startA <= endB && endA >= startB
    const isOverlapping = fromTime <= vTo && toTime >= vFrom;
    if (isOverlapping) {
      const formatDate = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "Present");
      return {
        overlap: true,
        conflictingVersion: v,
        message: `Date overlap detected with existing salary version (${formatDate(v.effective_from)} to ${formatDate(v.effective_to)}). An employee cannot have overlapping salary versions.`,
      };
    }
  }

  return { overlap: false };
}

/**
 * Finds the applicable salary version for a given payroll period:
 * Rule (from Section 25):
 * effective_from <= payroll_period_end
 * AND (effective_to IS NULL OR effective_to >= payroll_period_start)
 */
export function findApplicableSalaryVersion<T extends { effective_from: Date | string; effective_to: Date | string | null; status?: string }>(
  versions: T[],
  periodStart: Date | string,
  periodEnd: Date | string
): { version: T | null; error?: string } {
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();

  if (isNaN(start) || isNaN(end) || end < start) {
    return { version: null, error: "Invalid payroll period date range." };
  }

  // Filter out INACTIVE versions: inactive versions are not active for payroll calculation
  const matching = versions.filter((v) => {
    if (v.status === "INACTIVE") return false;
    const vFrom = new Date(v.effective_from).getTime();
    const vTo = v.effective_to ? new Date(v.effective_to).getTime() : Infinity;
    return vFrom <= end && vTo >= start;
  });

  if (matching.length === 0) {
    return { version: null };
  }

  if (matching.length > 1) {
    return {
      version: null,
      error: `Data integrity conflict: Found ${matching.length} overlapping salary versions for period ${new Date(periodStart).toISOString().slice(0, 10)} to ${new Date(periodEnd).toISOString().slice(0, 10)}. Please review the employee's salary versions.`,
    };
  }

  return { version: matching[0] };
}
