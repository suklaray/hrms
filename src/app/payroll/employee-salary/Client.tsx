"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Filter,
  History,
  Info,
  Layers,
  PenIcon,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  calculateSalaryBreakdown,
  findApplicableSalaryVersion,
  type ComponentRuleInput,
} from "@/lib/salaryCalculation";

interface EmployeeOption {
  id: number;
  empid: string;
  name: string;
  email: string;
  contact_number?: string | null;
  position?: string | null;
  employee_type?: string | null;
  company_id?: string | null;
  totalSalaryVersions: number;
  hasActiveSalary: boolean;
  currentSalary?: {
    uid: string;
    salary_structure_name: string;
    salary_structure_code: string;
    effective_from: string;
    effective_to: string | null;
    grossSalary: number;
    netSalary: number;
  } | null;
}

interface StructureOption {
  id: number;
  uid: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  components: Array<{
    id: number;
    salary_component_id: number;
    calculation_type: "FIXED" | "PERCENTAGE";
    value: number;
    base_component_id: number | null;
    sequence: number;
    salaryComponent?: {
      id: number;
      name: string;
      code: string;
      type: "EARNING" | "DEDUCTION";
    };
    baseComponent?: {
      id: number;
      name: string;
      code: string;
    } | null;
  }>;
}

interface EmployeeComponentRow {
  salary_component_id: number;
  name: string;
  code: string;
  type: "EARNING" | "DEDUCTION";
  calculation_type: "FIXED" | "PERCENTAGE" | "FORMULA";
  ruleDescription: string;
  defaultAmount: number;
  amount: number;
}

interface SalaryVersionHistoryItem {
  id: number;
  uid: string;
  employee_id: string;
  salary_structure_id: number | null;
  effective_from: string;
  effective_to: string | null;
  status: "ACTIVE" | "INACTIVE" | "CLOSED";
  remarks?: string | null;
  createdAt: string;
  salaryStructure?: {
    name: string;
    code: string;
  } | null;
  components: Array<{
    salary_component_id: number;
    amount: number;
    salaryComponent?: {
      name: string;
      code: string;
      type: "EARNING" | "DEDUCTION";
    };
  }>;
  summary: {
    grossEarnings: number;
    totalDeductions: number;
    netSalary: number;
  };
}

export default function EmployeeSalaryClient({ user }: { user?: any } = {}) {
  const [activeTab, setActiveTab] = useState<"assign" | "directory" | "simulator">("assign");

  // Master lists
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selected Employee & Assignment State
  const [selectedEmpid, setSelectedEmpid] = useState<string>("");
  const [selectedStructureId, setSelectedStructureId] = useState<string>("");
  const [effectiveFrom, setEffectiveFrom] = useState<string>("");
  const [effectiveTo, setEffectiveTo] = useState<string>("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "CLOSED">("ACTIVE");
  const [remarks, setRemarks] = useState<string>("Annual salary revision");
  const [autoClosePrevious, setAutoClosePrevious] = useState<boolean>(true);

  // Track existing version being edited (null = creating new revision)
  const [editingVersion, setEditingVersion] = useState<SalaryVersionHistoryItem | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Component amounts for the selected employee
  const [componentRows, setComponentRows] = useState<EmployeeComponentRow[]>([]);

  // Historical versions for currently selected employee
  const [employeeHistory, setEmployeeHistory] = useState<SalaryVersionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal to inspect a historical version
  const [inspectingVersion, setInspectingVersion] = useState<SalaryVersionHistoryItem | null>(null);

  // Directory search & filter
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState("ALL");

  // Section 25: Effective-Date Lookup Simulator State
  const [simPeriodStart, setSimPeriodStart] = useState<string>("2026-09-01");
  const [simPeriodEnd, setSimPeriodEnd] = useState<string>("2026-09-30");
  const [simResult, setSimResult] = useState<any | null>(null);

  // 1. Load initial data
  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [empRes, structRes] = await Promise.all([
        fetch("/api/payroll/employee-salary-structures/employees"),
        fetch("/api/payroll/salary-structures?status=ACTIVE"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        const list = empData.data || [];
        setEmployees(list);
        if (list.length > 0 && !selectedEmpid) {
          setSelectedEmpid(list[0].empid);
        }
      }

      if (structRes.ok) {
        const structData = await structRes.json();
        const list = structData.data || [];
        setStructures(list);
        if (list.length > 0 && !selectedStructureId) {
          setSelectedStructureId(String(list[0].id));
        }
      }
    } catch (err) {
      console.error("Error loading employees/structures:", err);
      toast.error("Failed to load initial data.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Set default effective date to the 1st of current month
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    setEffectiveFrom(`${year}-${month}-01`);
  }, []);

  // 2. Fetch history whenever selected employee changes
  useEffect(() => {
    if (!selectedEmpid) {
      setEmployeeHistory([]);
      return;
    }

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch(
          `/api/payroll/employee-salary-structures?employee_id=${selectedEmpid}`
        );
        const result = await res.json();
        if (res.ok && result.success) {
          setEmployeeHistory(result.data || []);
        }
      } catch (err) {
        console.error("Error loading employee salary history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [selectedEmpid]);

  // Reset editing version if user switches employee
  useEffect(() => {
    if (editingVersion && editingVersion.employee_id !== selectedEmpid) {
      setEditingVersion(null);
    }
  }, [selectedEmpid, editingVersion]);

  // Selected employee object
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.empid === selectedEmpid) || null;
  }, [employees, selectedEmpid]);

  // Current active structure for this employee
  const currentActiveSalary = useMemo(() => {
    return employeeHistory.find((v) => v.status === "ACTIVE") || null;
  }, [employeeHistory]);

  // 3. Populate component rows when selected structure changes
  useEffect(() => {
    if (!selectedStructureId) {
      setComponentRows([]);
      return;
    }

    // If currently editing and the selected structure matches this version's structure, don't overwrite custom amounts!
    if (editingVersion && String(editingVersion.salary_structure_id) === String(selectedStructureId)) {
      return;
    }

    const structure = structures.find(
      (s) => String(s.id) === selectedStructureId || s.uid === selectedStructureId
    );
    if (!structure || !structure.components) {
      setComponentRows([]);
      return;
    }

    // Calculate default amounts using the salary calculation engine
    const rules: ComponentRuleInput[] = structure.components.map((c) => ({
      salary_component_id: c.salary_component_id,
      calculation_type: c.calculation_type,
      value: Number(c.value),
      base_component_id: c.base_component_id,
      sequence: c.sequence,
      name: c.salaryComponent?.name,
      code: c.salaryComponent?.code,
      type: c.salaryComponent?.type || "EARNING",
    }));

    const preview = calculateSalaryBreakdown(rules);

    const rows: EmployeeComponentRow[] = preview.components.map((item) => {
      const originalRule = structure.components.find(
        (c) => c.salary_component_id === item.salary_component_id
      );
      let ruleDesc = "";
      if (item.calculation_type === "FIXED") {
        ruleDesc = `Fixed ₹${Number(item.value).toLocaleString("en-IN")}`;
      } else {
        ruleDesc = `${item.value}% of ${item.baseComponentName || "Base Component"}`;
      }

      return {
        salary_component_id: item.salary_component_id,
        name: item.name || `Component #${item.salary_component_id}`,
        code: item.code || `C${item.salary_component_id}`,
        type: item.type || "EARNING",
        calculation_type: item.calculation_type,
        ruleDescription: ruleDesc,
        defaultAmount: item.amount,
        amount: item.amount,
      };
    });

    setComponentRows(rows);
  }, [selectedStructureId, structures, editingVersion]);

  // Handle manual override of component amount
  const handleAmountChange = (index: number, newAmountStr: string) => {
    const val = Number(newAmountStr);
    const updated = [...componentRows];
    updated[index].amount = isNaN(val) ? 0 : Math.max(0, val);
    setComponentRows(updated);
  };

  // Reset to default structure amounts
  const handleResetToDefaults = () => {
    const reset = componentRows.map((c) => ({ ...c, amount: c.defaultAmount }));
    setComponentRows(reset);
    toast.info("Salary components reset to structure default calculations.");
  };

  // Computed totals for employee salary
  const totals = useMemo(() => {
    let grossEarnings = 0;
    let totalDeductions = 0;

    componentRows.forEach((c) => {
      const amt = Number(c.amount) || 0;
      if (c.type === "EARNING") {
        grossEarnings += amt;
      } else {
        totalDeductions += amt;
      }
    });

    grossEarnings = Math.round(grossEarnings * 100) / 100;
    totalDeductions = Math.round(totalDeductions * 100) / 100;
    const netSalary = Math.round((grossEarnings - totalDeductions) * 100) / 100;

    return { grossEarnings, totalDeductions, netSalary };
  }, [componentRows]);

  // Validate if effective_to is before effective_from
  const isDateRangeInvalid = useMemo(() => {
    if (!effectiveFrom || !effectiveTo) return false;
    const fTime = new Date(effectiveFrom).getTime();
    const tTime = new Date(effectiveTo).getTime();
    return !isNaN(fTime) && !isNaN(tTime) && tTime < fTime;
  }, [effectiveFrom, effectiveTo]);

  // Calculated duration helper
  const dateRangeSummary = useMemo(() => {
    if (!effectiveFrom) return null;
    if (!effectiveTo) return "Open-ended (Present)";
    const f = new Date(effectiveFrom);
    const t = new Date(effectiveTo);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || t.getTime() < f.getTime()) return null;
    const diffDays = Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 365 && diffDays <= 366) return "1 Year cycle";
    return `${diffDays} days`;
  }, [effectiveFrom, effectiveTo]);

  // Quick toggle version status in revision table
  const handleToggleStatus = async (
    item: SalaryVersionHistoryItem,
    newStatus: "ACTIVE" | "INACTIVE" | "CLOSED"
  ) => {
    if (item.status === newStatus) return;

    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/payroll/employee-salary-structures/${item.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        if (newStatus === "ACTIVE") {
          toast.success("Salary version activated! Previous active version has been set to INACTIVE.");
        } else {
          toast.success(`Salary version status changed to ${newStatus}.`);
        }
        // Refresh history & initial list
        loadInitialData();
        const targetEmpId = item.employee_id || selectedEmpid;
        const histRes = await fetch(
          `/api/payroll/employee-salary-structures?employee_id=${targetEmpId}`
        );
        const histData = await histRes.json();
        if (histData.success) {
          setEmployeeHistory(histData.data || []);
        }
      } else {
        toast.error(result.message || "Failed to update status.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  };

  // Start editing an existing salary version
  const handleStartEdit = (version: SalaryVersionHistoryItem) => {
    setEditingVersion(version);
    setSelectedEmpid(version.employee_id);
    if (version.salary_structure_id) {
      setSelectedStructureId(String(version.salary_structure_id));
    }

    setEffectiveFrom(toDateInputValue(version.effective_from));
    setEffectiveTo(toDateInputValue(version.effective_to));
    setStatus(version.status);
    setRemarks(version.remarks || "");

    // Populate component rows from the version's saved components
    const structure = structures.find(
      (s) => String(s.id) === String(version.salary_structure_id) || s.uid === String(version.salary_structure_id)
    );

    if (version.components && version.components.length > 0) {
      const rows: EmployeeComponentRow[] = version.components.map((c) => {
        const structComp = structure?.components?.find(
          (sc) => sc.salary_component_id === c.salary_component_id
        );
        let ruleDesc = "";
        const calcType: "FIXED" | "PERCENTAGE" | "FORMULA" = structComp?.calculation_type || "FIXED";
        if (structComp) {
          if (structComp.calculation_type === "FIXED") {
            ruleDesc = `Fixed ₹${Number(structComp.value).toLocaleString("en-IN")}`;
          } else {
            ruleDesc = `${structComp.value}% of ${structComp.baseComponent?.name || "Base Component"}`;
          }
        } else {
          ruleDesc = "Recorded value";
        }

        return {
          salary_component_id: c.salary_component_id,
          name: c.salaryComponent?.name || structComp?.salaryComponent?.name || `Component #${c.salary_component_id}`,
          code: c.salaryComponent?.code || structComp?.salaryComponent?.code || `C${c.salary_component_id}`,
          type: (c.salaryComponent?.type || structComp?.salaryComponent?.type || "EARNING") as "EARNING" | "DEDUCTION",
          calculation_type: calcType,
          ruleDescription: ruleDesc,
          defaultAmount: Number(structComp?.value) || Number(c.amount),
          amount: Number(c.amount) || 0,
        };
      });
      setComponentRows(rows);
    }

    setActiveTab("assign");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Editing salary record (${formatDateDisplay(version.effective_from)} → ${formatDateDisplay(version.effective_to)})`);
  };

  // Cancel editing mode and revert to create revision mode
  const handleCancelEdit = () => {
    setEditingVersion(null);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    setEffectiveFrom(`${year}-${month}-01`);
    setEffectiveTo("");
    setStatus("ACTIVE");
    setRemarks("Annual salary revision");
    setAutoClosePrevious(true);

    if (selectedStructureId) {
      const structure = structures.find(
        (s) => String(s.id) === selectedStructureId || s.uid === selectedStructureId
      );
      if (structure && structure.components) {
        const rules: ComponentRuleInput[] = structure.components.map((c) => ({
          salary_component_id: c.salary_component_id,
          calculation_type: c.calculation_type,
          value: Number(c.value),
          base_component_id: c.base_component_id,
          sequence: c.sequence,
          name: c.salaryComponent?.name,
          code: c.salaryComponent?.code,
          type: c.salaryComponent?.type || "EARNING",
        }));
        const preview = calculateSalaryBreakdown(rules);
        const rows: EmployeeComponentRow[] = preview.components.map((item) => {
          const originalRule = structure.components.find(
            (c) => c.salary_component_id === item.salary_component_id
          );
          let ruleDesc = "";
          if (item.calculation_type === "FIXED") {
            ruleDesc = `Fixed ₹${Number(item.value).toLocaleString("en-IN")}`;
          } else {
            ruleDesc = `${item.value}% of ${item.baseComponentName || "Base Component"}`;
          }
          return {
            salary_component_id: item.salary_component_id,
            name: item.name || `Component #${item.salary_component_id}`,
            code: item.code || `C${item.salary_component_id}`,
            type: item.type || "EARNING",
            calculation_type: item.calculation_type,
            ruleDescription: ruleDesc,
            defaultAmount: item.amount,
            amount: item.amount,
          };
        });
        setComponentRows(rows);
      }
    }
  };

  // 4. Save Salary Assignment / Revision / In-Place Edit
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmpid) {
      toast.error("Please select an employee.");
      return;
    }
    if (!effectiveFrom) {
      toast.error("Effective From date is required.");
      return;
    }
    if (effectiveFrom && effectiveTo) {
      const fromTime = new Date(effectiveFrom).getTime();
      const toTime = new Date(effectiveTo).getTime();
      if (toTime < fromTime) {
        toast.error("Effective To date cannot be earlier than Effective From date.");
        return;
      }
    }
    if (componentRows.length === 0) {
      toast.error("At least one salary component amount is required.");
      return;
    }

    setSaving(true);
    try {
      let res: Response;

      if (editingVersion) {
        // PATCH existing salary version (excludes itself from overlap check)
        const patchPayload = {
          salary_structure_id: selectedStructureId ? Number(selectedStructureId) : null,
          effective_from: effectiveFrom,
          effective_to: effectiveTo ? effectiveTo : null,
          status,
          remarks: remarks.trim() || null,
          components: componentRows.map((c) => ({
            salary_component_id: c.salary_component_id,
            amount: Number(c.amount) || 0,
          })),
        };

        res = await fetch(`/api/payroll/employee-salary-structures/${editingVersion.uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        });
      } else {
        // POST new salary revision
        // When auto_close_previous is false, status is INACTIVE so it creates an inactive structure without closing old active info
        const payload = {
          employee_id: selectedEmpid,
          salary_structure_id: Number(selectedStructureId),
          effective_from: effectiveFrom,
          effective_to: effectiveTo ? effectiveTo : null,
          status: autoClosePrevious ? "ACTIVE" : "INACTIVE",
          remarks: remarks.trim() || null,
          auto_close_previous: autoClosePrevious,
          components: componentRows.map((c) => ({
            salary_component_id: c.salary_component_id,
            amount: Number(c.amount) || 0,
          })),
        };

        res = await fetch("/api/payroll/employee-salary-structures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(
          result.message ||
            (editingVersion
              ? "Employee salary version updated successfully!"
              : "Employee salary version saved successfully!")
        );
        setEditingVersion(null);
        // Refresh history & employee list
        loadInitialData();
        const histRes = await fetch(
          `/api/payroll/employee-salary-structures?employee_id=${selectedEmpid}`
        );
        const histData = await histRes.json();
        if (histData.success) {
          setEmployeeHistory(histData.data || []);
        }
      } else {
        toast.error(result.message || "Failed to save employee salary.");
      }
    } catch (err: any) {
      console.error("Error saving salary:", err);
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // Section 25: Run Payroll Period Effective-Date Simulation
  const runSimulator = () => {
    if (!simPeriodStart || !simPeriodEnd) {
      toast.error("Please provide both Period Start and Period End dates.");
      return;
    }

    const matchResult = findApplicableSalaryVersion(
      employeeHistory,
      simPeriodStart,
      simPeriodEnd
    );

    if (matchResult.error) {
      setSimResult({ error: matchResult.error });
      return;
    }

    if (!matchResult.version) {
      setSimResult({
        found: false,
        message: `No salary structure version was active during the period ${simPeriodStart} to ${simPeriodEnd}.`,
      });
      return;
    }

    const matched = matchResult.version;
    setSimResult({
      found: true,
      version: matched,
      periodStart: simPeriodStart,
      periodEnd: simPeriodEnd,
    });
  };

  // Directory filter
  const filteredDirectory = useMemo(() => {
    return employees.filter((emp) => {
      if (directoryStatusFilter === "ASSIGNED" && !emp.hasActiveSalary) return false;
      if (directoryStatusFilter === "UNASSIGNED" && emp.hasActiveSalary) return false;
      if (directorySearch.trim()) {
        const q = directorySearch.toLowerCase().trim();
        const nameMatch = emp.name.toLowerCase().includes(q);
        const idMatch = emp.empid.toLowerCase().includes(q);
        const posMatch = (emp.position || "").toLowerCase().includes(q);
        return nameMatch || idMatch || posMatch;
      }
      return true;
    });
  }, [employees, directoryStatusFilter, directorySearch]);

  const toDateInputValue = (d: string | Date | null | undefined): string => {
    if (!d) return "";
    if (typeof d === "string") {
      const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (d: string | null | undefined) => {
    if (!d) return "Present";
    if (typeof d === "string") {
      const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [_, y, m, day] = match;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mIdx = parseInt(m, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          return `${monthNames[mIdx]} ${day.padStart(2, "0")}, ${y}`;
        }
      }
    }
    const date = new Date(d);
    return isNaN(date.getTime())
      ? d
      : date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      <Head>
        <title>Employee Salary Management | HRMS Payroll</title>
      </Head>

      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto space-y-6">
          {/* Main Top Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <Banknote size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Employee Salary Management
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Assign salary structures, review component values, manage salary revisions, and preserve historical payroll records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/payroll/payroll-setup/salary-structures"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors"
                >
                  <FileSpreadsheet size={15} className="text-indigo-600" />
                  <span>Salary Structures Master</span>
                </Link>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("assign")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "assign"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <Plus size={15} />
                <span>Assign / Revise Salary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("directory")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "directory"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <Users size={15} />
                <span>Employee Directory</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "directory" ? "bg-indigo-800 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                >
                  {employees.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("simulator");
                  runSimulator();
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "simulator"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <CalendarDays size={15} />
                <span>Payroll Period Simulator (Effective-Date Lookup)</span>
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* TAB 1: ASSIGN / REVISE SALARY STUDIO */}
          {/* =============================================================== */}
          {activeTab === "assign" && (
            <div className="space-y-6">
              {/* Edit Mode Alert Banner */}
              {editingVersion && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 border border-amber-200 rounded-lg text-amber-800">
                      <PenIcon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          Editing Salary Version: {editingVersion.salaryStructure?.name || "Custom Salary"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-900 border border-amber-300">
                          EDIT MODE
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Modifying salary for <b>{currentEmployee?.name}</b> ({formatDateDisplay(editingVersion.effective_from)} → {formatDateDisplay(editingVersion.effective_to)}). Updates apply directly without date self-overlap.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Cancel Edit (Create New Version Instead)</span>
                  </button>
                </div>
              )}

              {/* Employee & Structure Selector Header Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
                {/* Notice if employee has active salary and user is in create revision mode */}
                {currentActiveSalary && !editingVersion && (
                  <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-indigo-900 flex items-center gap-1.5">
                      <Info size={15} className="text-indigo-600 shrink-0" />
                      <span>
                        <b>{currentEmployee?.name}</b> has an active salary structure: <b>{currentActiveSalary.salaryStructure?.name}</b> ({formatDateDisplay(currentActiveSalary.effective_from)} → {formatDateDisplay(currentActiveSalary.effective_to)}).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(currentActiveSalary)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <PenIcon size={12} />
                      <span>Edit Existing Salary</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Select Employee */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Select Employee <span className="text-red-500">*</span>
                      {editingVersion && (
                        <span className="text-[10px] text-amber-700 ml-1 font-normal">(locked in edit)</span>
                      )}
                    </label>
                    <select
                      value={selectedEmpid}
                      onChange={(e) => setSelectedEmpid(e.target.value)}
                      disabled={!!editingVersion}
                      className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {employees.map((emp) => (
                        <option key={emp.empid} value={emp.empid}>
                          {emp.name} ({emp.empid}) {emp.position ? `• ${emp.position}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Salary Structure */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Salary Structure Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedStructureId}
                      onChange={(e) => setSelectedStructureId(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {structures.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) • {s.components.length} components
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Effective From Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Effective From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      max={effectiveTo || undefined}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className={`w-full text-xs sm:text-sm bg-gray-50 border rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 ${
                        isDateRangeInvalid
                          ? "border-red-400 focus:ring-red-500 bg-red-50/20"
                          : "border-gray-200 focus:ring-indigo-500"
                      }`}
                      required
                    />
                  </div>

                  {/* Effective To Date (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Effective To <span className="text-gray-400 font-normal">(Leave blank for Present)</span>
                      </label>
                      {dateRangeSummary && !isDateRangeInvalid && (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                          {dateRangeSummary}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={effectiveTo}
                      min={effectiveFrom || undefined}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                      className={`w-full text-xs sm:text-sm bg-gray-50 border rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 ${
                        isDateRangeInvalid
                          ? "border-red-400 focus:ring-red-500 bg-red-50/20"
                          : "border-gray-200 focus:ring-indigo-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Date range error warning if effectiveTo is before effectiveFrom */}
                {isDateRangeInvalid && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                    <AlertCircle size={15} className="shrink-0 text-red-600" />
                    <span>
                      Date Conflict: Effective To date ({formatDateDisplay(effectiveTo)}) cannot be earlier than Effective From date ({formatDateDisplay(effectiveFrom)}). Please select an end date on or after the start date.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Revision Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual salary revision, Initial appointment, Promotion..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {editingVersion ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <div>
                        <span className="text-xs font-semibold text-amber-900 block">
                          Updating Existing Version In-Place
                        </span>
                        <span className="text-[11px] text-amber-700">
                          {status === "ACTIVE"
                            ? "Active version. Activating this will ensure any other versions become INACTIVE."
                            : `Current status is ${status}. Excluded from overlap check with itself.`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-semibold text-amber-950">Status:</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "CLOSED")}
                          className="text-xs font-bold rounded-lg px-2.5 py-1 bg-white border border-amber-300 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">
                            Auto-close previous active version
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {autoClosePrevious
                              ? "Automatically closes older active salary records on day before new effective date (Version becomes ACTIVE)."
                              : "Keeps old salary active. New salary will be created with status INACTIVE."}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoClosePrevious}
                          onChange={(e) => setAutoClosePrevious(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      {!autoClosePrevious && (
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2">
                          <Info size={13} className="shrink-0 text-indigo-600" />
                          <span>
                            Auto-close unchecked: Existing salary remains <b>ACTIVE</b>. This new version will be created as <b>INACTIVE</b> with your custom amounts and dates without any date overlap conflict.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Active Salary Banner if available */}
              {currentActiveSalary && (
                <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {currentEmployee?.name?.slice(0, 2).toUpperCase() || "EM"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          Current Salary: {currentActiveSalary.salaryStructure?.name || "Standard Salary"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Applicable from <b>{formatDateDisplay(currentActiveSalary.effective_from)}</b> →{" "}
                        <b>{formatDateDisplay(currentActiveSalary.effective_to)}</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-sans">Gross</span>
                      <span className="font-bold text-gray-900">
                        ₹{currentActiveSalary.summary.grossEarnings.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-sans">Deductions</span>
                      <span className="font-bold text-amber-700">
                        -₹{currentActiveSalary.summary.totalDeductions.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-sans">Net Take-Home</span>
                      <span className="font-bold text-indigo-600 text-sm">
                        ₹{currentActiveSalary.summary.netSalary.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(currentActiveSalary)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer ml-auto"
                      title="Edit this active salary structure"
                    >
                      <PenIcon size={13} />
                      <span>Edit Salary</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Main Workspace: Component Amounts Review + Salary Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Components Table (2 cols) */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Salary Components & Amounts
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Amounts computed from structure rules. You can review or manually override values.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                      title="Reset all amounts to structure defaults"
                    >
                      <RotateCcw size={12} />
                      <span>Reset to Rules</span>
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2.5 px-3">Component</th>
                          <th className="py-2.5 px-3 text-center">Type</th>
                          <th className="py-2.5 px-3">Calculation Rule</th>
                          <th className="py-2.5 px-3 text-right">Default Amount</th>
                          <th className="py-2.5 px-3 text-right w-36">Actual Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {componentRows.map((c, idx) => {
                          const isEarning = c.type === "EARNING";
                          const isOverridden = Number(c.amount) !== Number(c.defaultAmount);

                          return (
                            <tr key={c.salary_component_id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-gray-900">{c.name}</div>
                                <span className="text-[10px] font-mono text-gray-400">{c.code}</span>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isEarning ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    EARNING
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    DEDUCTION
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-gray-600">{c.ruleDescription}</td>

                              <td className="py-2.5 px-3 text-right font-mono text-gray-500">
                                ₹{c.defaultAmount.toLocaleString("en-IN")}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={c.amount}
                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                    className={`w-full pl-6 pr-2 py-1 text-xs text-right font-mono font-semibold rounded border transition-colors ${isOverridden
                                        ? "bg-amber-50/60 border-amber-300 text-amber-900 focus:bg-white"
                                        : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white"
                                      } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                                  />
                                </div>
                                {isOverridden && (
                                  <span className="text-[9px] text-amber-600 block mt-0.5">
                                    Custom override
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                    <span className="text-[11px] text-gray-400">
                      Actual component values will be permanently recorded into <b>employee_salary_component</b>.
                    </span>
                  </div>
                </div>

                {/* Live Take-Home Summary Card (1 col) */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Salary Summary
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Net before dynamic attendance and payroll period cuts.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ArrowUpRight size={15} className="text-emerald-600" />
                        <span>Gross Earnings:</span>
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-base">
                        ₹{totals.grossEarnings.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-700">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ArrowDownRight size={15} className="text-amber-600" />
                        <span>Total Deductions:</span>
                      </span>
                      <span className="font-mono font-bold text-amber-700 text-base">
                        -₹{totals.totalDeductions.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                        Net Take-Home
                      </span>
                      <div className="font-mono font-extrabold text-indigo-700 text-2xl">
                        ₹{totals.netSalary.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-indigo-600/80 block mt-1">
                        Monthly base salary rate
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSalary}
                    disabled={saving || componentRows.length === 0 || isDateRangeInvalid}
                    className={`w-full py-2.5 px-4 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                      editingVersion
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                    }`}
                  >
                    {editingVersion ? <PenIcon size={16} /> : <Save size={16} />}
                    <span>
                      {saving
                        ? editingVersion
                          ? "Updating Salary..."
                          : "Saving Revision..."
                        : editingVersion
                        ? "Update Salary Version"
                        : "Save Salary Version"}
                    </span>
                  </button>

                  {editingVersion ? (
                    <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                      <p className="font-semibold text-amber-950">In-Place Version Update:</p>
                      <p className="mt-0.5 text-amber-800">
                        Updates this record directly. Date overlap validation excludes this record so it will not conflict with itself.
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <p className="font-semibold text-gray-700">
                        {autoClosePrevious ? "Historical Preservation Mode:" : "Staged Draft Version Mode:"}
                      </p>
                      <p className="mt-0.5">
                        {autoClosePrevious
                          ? "Creating a new revision automatically closes older active versions without deleting or changing their historical records."
                          : "New revision will be created as INACTIVE. Current active salary remains untouched and active without date overlap error."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Historical Salary Timeline & Table (Section 24) */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Salary Revision History ({employeeHistory.length} versions)
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Past and active salary versions for {currentEmployee?.name || "this employee"}.
                      </p>
                    </div>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="py-8 text-center text-gray-400 text-xs">Loading history...</div>
                ) : employeeHistory.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No historical salary records found for this employee.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          <th className="py-2.5 px-4">Version & Structure</th>
                          <th className="py-2.5 px-4">Effective Window</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 px-4 text-right">Gross Earnings</th>
                          <th className="py-2.5 px-4 text-right">Deductions</th>
                          <th className="py-2.5 px-4 text-right">Net Pay</th>
                          <th className="py-2.5 px-4">Remarks</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {employeeHistory.map((item, idx) => {
                          const isCurrent = item.status === "ACTIVE";

                          const isEditingThis = editingVersion?.id === item.id;

                          return (
                            <tr
                              key={item.uid}
                              onClick={() => handleStartEdit(item)}
                              className={`cursor-pointer transition-colors ${
                                isEditingThis
                                  ? "bg-amber-50/80 ring-2 ring-amber-400"
                                  : isCurrent
                                  ? "bg-indigo-50/20 hover:bg-indigo-50/40"
                                  : "hover:bg-gray-50/80"
                              }`}
                              title="Click row to edit this salary version"
                            >
                              <td className="py-3 px-4">
                                <span className="font-bold text-gray-900 block">
                                  {item.salaryStructure?.name || "Custom Salary"}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  Version #{employeeHistory.length - idx} • {item.salaryStructure?.code || "CUSTOM"}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-semibold text-gray-800">
                                  {formatDateDisplay(item.effective_from)} → {formatDateDisplay(item.effective_to)}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center justify-center">
                                  <select
                                    value={item.status}
                                    disabled={togglingId === item.id}
                                    onChange={(e) =>
                                      handleToggleStatus(
                                        item,
                                        e.target.value as "ACTIVE" | "INACTIVE" | "CLOSED"
                                      )
                                    }
                                    className={`text-[11px] font-bold rounded-full px-2.5 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 shadow-xs ${
                                      item.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                        : item.status === "CLOSED"
                                        ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                        : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                    } ${togglingId === item.id ? "opacity-50 cursor-wait" : ""}`}
                                    title="Click to change status. Activating this will automatically make any other active salary INACTIVE."
                                  >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="CLOSED">CLOSED</option>
                                  </select>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-medium text-gray-800">
                                ₹{item.summary.grossEarnings.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-amber-700">
                                -₹{item.summary.totalDeductions.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                                ₹{item.summary.netSalary.toLocaleString("en-IN")}
                              </td>

                              <td className="py-3 px-4 text-gray-500 text-[11px] max-w-xs truncate">
                                {item.remarks || <span className="italic text-gray-300">-</span>}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(item);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
                                      isEditingThis
                                        ? "bg-amber-600 text-white"
                                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                    }`}
                                    title="Edit this version's dates and amounts"
                                  >
                                    <PenIcon size={12} />
                                    <span>{isEditingThis ? "Editing" : "Edit"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectingVersion(item);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-xs text-gray-700 font-medium transition-colors cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    <span>Inspect</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: EMPLOYEE DIRECTORY */}
          {/* =============================================================== */}
          {activeTab === "directory" && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee by name, empid, title..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    value={directoryStatusFilter}
                    onChange={(e) => setDirectoryStatusFilter(e.target.value)}
                    className="text-xs sm:text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Employees</option>
                    <option value="ASSIGNED">Assigned Salary Only</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Current Salary Structure</th>
                      <th className="py-3 px-4 text-right">Net Monthly</th>
                      <th className="py-3 px-4 text-center">Versions</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDirectory.map((emp) => (
                      <tr key={emp.empid} className="hover:bg-gray-50/50">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 block">{emp.name}</span>
                              <span className="text-[10px] font-mono text-gray-400">{emp.empid}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600">
                          {emp.position || <span className="italic text-gray-300">-</span>}
                        </td>

                        <td className="py-3 px-4">
                          {emp.currentSalary ? (
                            <div>
                              <span className="font-semibold text-gray-800 block">
                                {emp.currentSalary.salary_structure_name}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                From {formatDateDisplay(emp.currentSalary.effective_from)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                              Not Configured
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {emp.currentSalary ? (
                            `₹${emp.currentSalary.netSalary.toLocaleString("en-IN")}`
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            {emp.totalSalaryVersions}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpid(emp.empid);
                              setActiveTab("assign");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <span>Manage / Revise</span>
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: EFFECTIVE-DATE LOOKUP SIMULATOR (SECTION 25) */}
          {/* =============================================================== */}
          {activeTab === "simulator" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Payroll Period Effective-Date Lookup Simulator
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verify which historical or active salary version applies to a specific payroll processing calendar period.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    value={selectedEmpid}
                    onChange={(e) => {
                      setSelectedEmpid(e.target.value);
                      setTimeout(runSimulator, 50);
                    }}
                    className="w-full text-xs sm:text-sm bg-white border border-gray-200 rounded-lg p-2 text-gray-800"
                  >
                    {employees.map((emp) => (
                      <option key={emp.empid} value={emp.empid}>
                        {emp.name} ({emp.empid})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payroll Period Start Date
                  </label>
                  <input
                    type="date"
                    value={simPeriodStart}
                    onChange={(e) => setSimPeriodStart(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-gray-200 rounded-lg p-2 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payroll Period End Date
                  </label>
                  <input
                    type="date"
                    value={simPeriodEnd}
                    onChange={(e) => setSimPeriodEnd(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-white border border-gray-200 rounded-lg p-2 text-gray-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={runSimulator}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Play size={14} />
                  <span>Execute Effective-Date Lookup</span>
                </button>

                <div className="text-[11px] text-gray-500 font-mono">
                  Rule: effective_from &le; period_end AND (effective_to IS NULL OR effective_to &ge; period_start)
                </div>
              </div>

              {/* Simulation Result Box */}
              {simResult && (
                <div className="mt-4 p-5 rounded-xl border animate-in fade-in duration-200">
                  {simResult.error ? (
                    <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-200">
                      <ShieldAlert size={20} className="shrink-0" />
                      <div>
                        <p className="font-bold text-sm">Data Integrity Conflict</p>
                        <p className="text-xs mt-0.5">{simResult.error}</p>
                      </div>
                    </div>
                  ) : !simResult.found ? (
                    <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <AlertCircle size={20} className="shrink-0" />
                      <div>
                        <p className="font-bold text-sm">No Applicable Salary Version Found</p>
                        <p className="text-xs mt-0.5">{simResult.message}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block">
                              Applicable Salary Version Resolved
                            </span>
                            <span className="font-bold text-base">
                              {simResult.version.salaryStructure?.name || "Standard Salary"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-emerald-700 block">Status: {simResult.version.status}</span>
                          <span className="font-mono text-xs">
                            Active window: {formatDateDisplay(simResult.version.effective_from)} →{" "}
                            {formatDateDisplay(simResult.version.effective_to)}
                          </span>
                        </div>
                      </div>

                      {/* Display exact amounts Payroll calculation engine will consume */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                              <th className="py-2.5 px-4">Component</th>
                              <th className="py-2.5 px-4 text-center">Type</th>
                              <th className="py-2.5 px-4 text-right">Amount Consumed by Payroll</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {simResult.version.components.map((c: any) => (
                              <tr key={c.salary_component_id}>
                                <td className="py-2.5 px-4 font-semibold text-gray-900">
                                  {c.salaryComponent?.name || `Component #${c.salary_component_id}`}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.salaryComponent?.type === "EARNING"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                  >
                                    {c.salaryComponent?.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                                  ₹{Number(c.amount).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 font-bold border-t border-gray-200">
                              <td colSpan={2} className="py-2.5 px-4 text-gray-800">
                                Net Base Payable:
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-indigo-700 text-sm">
                                ₹{simResult.version.summary.netSalary.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* INSPECT HISTORICAL VERSION MODAL */}
      {/* =================================================================== */}
      {inspectingVersion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Historical Salary Version Details
                </h3>
                <p className="text-[11px] text-gray-500">
                  {formatDateDisplay(inspectingVersion.effective_from)} to{" "}
                  {formatDateDisplay(inspectingVersion.effective_to)} • Status: {inspectingVersion.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-2 px-3">Component</th>
                      <th className="py-2 px-3 text-center">Type</th>
                      <th className="py-2 px-3 text-right">Actual Amount Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inspectingVersion.components.map((c) => (
                      <tr key={c.salary_component_id}>
                        <td className="py-2 px-3 font-semibold text-gray-900">
                          {c.salaryComponent?.name || `Component #${c.salary_component_id}`}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.salaryComponent?.type === "EARNING"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                              }`}
                          >
                            {c.salaryComponent?.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                          ₹{Number(c.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Gross Earnings:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    ₹{inspectingVersion.summary.grossEarnings.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Deductions:</span>
                  <span className="font-bold text-amber-700 font-mono">
                    -₹{inspectingVersion.summary.totalDeductions.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-gray-200 flex justify-between font-bold text-indigo-700 text-sm">
                  <span>Net Take-Home:</span>
                  <span className="font-mono">
                    ₹{inspectingVersion.summary.netSalary.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {inspectingVersion.remarks && (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Remarks: </span>
                  {inspectingVersion.remarks}
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const v = inspectingVersion;
                  setInspectingVersion(null);
                  handleStartEdit(v);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PenIcon size={13} />
                <span>Edit this Version</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
