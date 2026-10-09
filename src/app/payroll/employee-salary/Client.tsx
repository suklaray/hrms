"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  CheckCircle2,
  ChevronDown,
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
  findApplicableSalaryStructureForFinancialYear,
  type ComponentRuleInput,
} from "@/lib/salaryCalculation";

interface EmployeeOption {
  id: number;
  empid: string;
  name: string;
  email: string;
  role?: string | null;
  rbacRole?: { id?: number; name?: string; type?: string } | null;
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
    financial_year_id: string;
    financial_year_name: string;
    grossSalary: number;
    netSalary: number;
  } | null;
}

interface FinancialYearOption {
  id: number;
  uid: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  lock: boolean;
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
  salary_structure_id: string;
  financial_year_id: string;
  status: "ACTIVE" | "INACTIVE" | "CLOSED";
  remarks?: string | null;
  createdAt: string;
  financialYear?: {
    id?: number;
    uid: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
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

function isUserSuperAdmin(emp: any): boolean {
  if (!emp) return false;
  if (emp.role && String(emp.role).toLowerCase() === "superadmin") return true;
  if (emp.rbacRole?.type === "SUPER_ADMIN" || emp.rbacRole?.type === 1) return true;
  const roleName = emp.rbacRole?.name || emp.position || "";
  if (["super admin", "superadmin"].includes(String(roleName).toLowerCase())) return true;
  return false;
}

export default function EmployeeSalaryClient({ user }: { user?: any } = {}) {
  const [activeTab, setActiveTab] = useState<"assign" | "directory" | "lookup">("assign");

  // Master lists
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [structures, setStructures] = useState<StructureOption[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Searchable Employee Dropdown State
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selected Employee & Assignment State
  const [selectedEmpid, setSelectedEmpid] = useState<string>("");
  const [selectedStructureId, setSelectedStructureId] = useState<string>("");
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState<string>("");
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
  const [directoryFyFilter, setDirectoryFyFilter] = useState("ALL");

  // Lookup Simulator State
  const [simFinancialYearId, setSimFinancialYearId] = useState<string>("");
  const [simResult, setSimResult] = useState<any | null>(null);

  // 1. Load initial data
  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [empRes, structRes, fyRes] = await Promise.all([
        fetch("/api/payroll/employee-salary-structures/employees"),
        fetch("/api/payroll/salary-structures?status=ACTIVE"),
        fetch("/api/payroll/financial-year"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        const list = (empData.data || []).filter((e: any) => !isUserSuperAdmin(e));
        setEmployees(list);
        if (list.length > 0 && (!selectedEmpid || isUserSuperAdmin(list.find((e: any) => e.empid === selectedEmpid)))) {
          setSelectedEmpid(list[0].empid);
        }
      }

      if (structRes.ok) {
        const structData = await structRes.json();
        const list = structData.data || [];
        setStructures(list);
        if (list.length > 0 && !selectedStructureId) {
          setSelectedStructureId(list[0].uid);
        }
      }

      if (fyRes.ok) {
        const fyData = await fyRes.json();
        const list = fyData.data || [];
        setFinancialYears(list);
        const activeFy = list.find((f: FinancialYearOption) => f.status === "ACTIVE") || list[0];
        if (activeFy && !selectedFinancialYearId) {
          setSelectedFinancialYearId(activeFy.uid);
          setSimFinancialYearId(activeFy.uid);
        }
      }
    } catch (err) {
      console.error("Error loading employees/structures/financial years:", err);
      toast.error("Failed to load initial data.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
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

  // Filtered employees for the searchable dropdown (excludes superadmin)
  const filteredDropdownEmployees = useMemo(() => {
    return employees
      .filter((emp) => !isUserSuperAdmin(emp))
      .filter((emp) => {
        if (!employeeSearch.trim()) return true;
        const q = employeeSearch.toLowerCase().trim();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.empid.toLowerCase().includes(q) ||
          (emp.position || "").toLowerCase().includes(q)
        );
      });
  }, [employees, employeeSearch]);

  // Selected financial year object
  const currentFinancialYear = useMemo(() => {
    return financialYears.find((fy) => fy.uid === selectedFinancialYearId) || null;
  }, [financialYears, selectedFinancialYearId]);

  // Current active structure for this employee in selected financial year (or overall)
  const currentActiveSalary = useMemo(() => {
    if (selectedFinancialYearId) {
      const activeInFy = employeeHistory.find(
        (v) => v.financial_year_id === selectedFinancialYearId && v.status === "ACTIVE"
      );
      if (activeInFy) return activeInFy;
    }
    return employeeHistory.find((v) => v.status === "ACTIVE") || null;
  }, [employeeHistory, selectedFinancialYearId]);

  // Check if a salary structure has already been created against this financial year and this employee
  const existingSalaryForSelectedFy = useMemo(() => {
    if (!selectedFinancialYearId) return null;
    const inHistory = employeeHistory.find(
      (v) =>
        v.financial_year_id === selectedFinancialYearId ||
        v.financialYear?.uid === selectedFinancialYearId ||
        String(v.financialYear?.id) === selectedFinancialYearId
    );
    if (inHistory) return inHistory;
    if (
      currentEmployee?.currentSalary &&
      (currentEmployee.currentSalary.financial_year_id === selectedFinancialYearId ||
        currentEmployee.currentSalary.financial_year_name === currentFinancialYear?.name)
    ) {
      return {
        uid: currentEmployee.currentSalary.uid,
        employee_id: selectedEmpid,
        financial_year_id: currentEmployee.currentSalary.financial_year_id,
        status: "ACTIVE" as const,
        salaryStructure: {
          name: currentEmployee.currentSalary.salary_structure_name,
          code: currentEmployee.currentSalary.salary_structure_code,
        },
        financialYear: {
          uid: currentEmployee.currentSalary.financial_year_id,
          name: currentEmployee.currentSalary.financial_year_name,
        },
      } as any;
    }
    return null;
  }, [employeeHistory, selectedFinancialYearId, currentEmployee, currentFinancialYear]);

  const hasDuplicateFySalary = Boolean(
    existingSalaryForSelectedFy &&
    (!editingVersion || editingVersion.uid !== existingSalaryForSelectedFy.uid)
  );

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
      (s) => s.uid === selectedStructureId || String(s.id) === selectedStructureId
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
          toast.success("Salary version activated! Any previous active version for this financial year is now INACTIVE.");
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
      setSelectedStructureId(version.salary_structure_id);
    }
    if (version.financial_year_id) {
      setSelectedFinancialYearId(version.financial_year_id);
    }

    setStatus(version.status);
    setRemarks(version.remarks || "");

    // Populate component rows from the version's saved components
    const structure = structures.find(
      (s) => s.uid === version.salary_structure_id || String(s.id) === version.salary_structure_id
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
    toast.info(`Editing salary structure for ${version.financialYear?.name || "Financial Year"}`);
  };

  // Cancel editing mode and revert to create revision mode
  const handleCancelEdit = () => {
    setEditingVersion(null);
    setStatus("ACTIVE");
    setRemarks("Annual salary revision");
    setAutoClosePrevious(true);

    if (selectedStructureId) {
      const structure = structures.find(
        (s) => s.uid === selectedStructureId || String(s.id) === selectedStructureId
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
    if (!selectedFinancialYearId) {
      toast.error("Please select a Financial Year.");
      return;
    }
    const selectedFy = financialYears.find((fy) => fy.uid === selectedFinancialYearId);
    if (selectedFy && selectedFy.status !== "ACTIVE") {
      toast.error("Please select an active financial year");
      return;
    }
    if (hasDuplicateFySalary) {
      toast.error("A salary structure has already been created against this financial year and this employee.");
      return;
    }
    if (editingVersion && selectedFinancialYearId !== editingVersion.financial_year_id) {
      const otherForFy = employeeHistory.find(
        (v) =>
          (v.financial_year_id === selectedFinancialYearId ||
            v.financialYear?.uid === selectedFinancialYearId ||
            String(v.financialYear?.id) === selectedFinancialYearId) &&
          v.uid !== editingVersion.uid
      );
      if (otherForFy) {
        toast.error("A salary structure has already been created against this financial year and this employee.");
        return;
      }
    }
    if (!selectedStructureId) {
      toast.error("Please select a Salary Structure template.");
      return;
    }
    if (componentRows.length === 0) {
      toast.error("At least one salary component amount is required.");
      return;
    }

    const structure = structures.find(
      (s) => s.uid === selectedStructureId || String(s.id) === selectedStructureId
    );
    const structureUid = structure ? structure.uid : selectedStructureId;

    setSaving(true);
    try {
      let res: Response;

      if (editingVersion) {
        // PATCH existing salary version
        const patchPayload = {
          salary_structure_id: structureUid,
          financial_year_id: selectedFinancialYearId,
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
        const payload = {
          employee_id: selectedEmpid,
          salary_structure_id: structureUid,
          financial_year_id: selectedFinancialYearId,
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

  // Directory filter
  const filteredDirectory = useMemo(() => {
    return employees
      .filter((emp) => !isUserSuperAdmin(emp))
      .filter((emp) => {
        if (directoryStatusFilter === "ASSIGNED" && !emp.hasActiveSalary) return false;
        if (directoryStatusFilter === "UNASSIGNED" && emp.hasActiveSalary) return false;
        if (directoryFyFilter !== "ALL" && emp.currentSalary?.financial_year_id !== directoryFyFilter) {
          return false;
        }
        if (directorySearch.trim()) {
          const q = directorySearch.toLowerCase().trim();
          const nameMatch = emp.name.toLowerCase().includes(q);
          const idMatch = emp.empid.toLowerCase().includes(q);
          const posMatch = (emp.position || "").toLowerCase().includes(q);
          return nameMatch || idMatch || posMatch;
        }
        return true;
      });
  }, [employees, directoryStatusFilter, directoryFyFilter, directorySearch]);

  const formatDateDisplay = (d: string | null | undefined) => {
    if (!d) return "-";
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
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                      Employee Salary Management
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Assign salary structures and manage customized package revisions per Financial Year.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/payroll/financial-year-setup/payroll-get-financial-years"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Calendar size={13} />
                  <span>Financial Years</span>
                </Link>
                <Link
                  href="/payroll/payroll-setup/salary-structures"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Salary Templates</span>
                </Link>
                <button
                  type="button"
                  onClick={loadInitialData}
                  disabled={loadingInitial}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw size={14} className={loadingInitial ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 mt-6 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("assign")}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "assign"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  }`}
              >
                <PenIcon size={14} />
                <span>Assign & Revise Structure</span>
                {editingVersion && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("directory")}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === "directory"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  }`}
              >
                <Users size={14} />
                <span>Employee Directory</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600 font-mono">
                  {employees.length}
                </span>
              </button>

            </div>
          </div>

          {/* =============================================================== */}
          {/* TAB 1: ASSIGN / REVISE EMPLOYEE SALARY */}
          {/* =============================================================== */}
          {activeTab === "assign" && (
            <form onSubmit={handleSaveSalary} className="space-y-6">
              {/* Editing Mode Notification Banner */}
              {editingVersion && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-900">
                          Editing Mode: Revision #{editingVersion.id}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Status: {editingVersion.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Modifying salary for <b>{currentEmployee?.name}</b> in <b>{editingVersion.financialYear?.name || "Financial Year"}</b>. Updates apply directly.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Cancel Edit (Create New Version)</span>
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
                        <b>{currentEmployee?.name}</b> has an active salary structure: <b>{currentActiveSalary.salaryStructure?.name}</b> in <b>{currentActiveSalary.financialYear?.name || "Current FY"}</b>.
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Searchable Select Employee Dropdown */}
                  <div className="relative" ref={employeeDropdownRef}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Select Employee <span className="text-red-500">*</span>
                      {editingVersion && (
                        <span className="text-[10px] text-amber-700 ml-1 font-normal">(locked in edit)</span>
                      )}
                    </label>
                    <button
                      type="button"
                      disabled={!!editingVersion}
                      onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                      className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-left text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center justify-between transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="truncate flex items-center gap-2">
                        <User size={13} className="text-gray-400 shrink-0" />
                        {currentEmployee ? (
                          <span className="truncate">
                            <span className="font-semibold text-gray-900">{currentEmployee.name}</span>{" "}
                            <span className="text-gray-500 font-mono text-[11px]">({currentEmployee.empid})</span>
                            {currentEmployee.position ? (
                              <span className="text-gray-400 text-xs"> • {currentEmployee.position}</span>
                            ) : null}
                          </span>
                        ) : loadingInitial ? (
                          "Loading employees..."
                        ) : (
                          "Select Employee"
                        )}
                      </span>
                      <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
                    </button>

                    {employeeDropdownOpen && !editingVersion && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-[#cfd5db] rounded-md shadow-lg py-1 max-h-60 overflow-auto">
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              placeholder="Search employee..."
                              className="w-full pl-7 pr-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded focus:outline-none focus:bg-white text-gray-800"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        {filteredDropdownEmployees.length === 0 ? (
                          <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
                            No employees found
                          </div>
                        ) : (
                          filteredDropdownEmployees.map((emp) => (
                            <button
                              type="button"
                              key={emp.empid}
                              onClick={() => {
                                setSelectedEmpid(emp.empid);
                                setEmployeeDropdownOpen(false);
                                setEmployeeSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left text-[12px] flex items-center justify-between hover:bg-indigo-50 cursor-pointer ${selectedEmpid === emp.empid ? "bg-indigo-50/70 font-semibold text-indigo-700" : "text-gray-700"
                                }`}
                            >
                              <span className="truncate">
                                {emp.name} <span className="font-mono text-[11px] text-gray-400">({emp.empid})</span>
                                {emp.position && <span className="text-[11px] text-gray-500"> • {emp.position}</span>}
                              </span>
                              {selectedEmpid === emp.empid && (
                                <Check size={13} className="text-indigo-600 shrink-0 ml-1" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Select Financial Year */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Financial Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFinancialYearId}
                      onChange={(e) => {
                        const newFyId = e.target.value;
                        setSelectedFinancialYearId(newFyId);
                        const alreadyExists = employeeHistory.find(
                          (v) =>
                            v.financial_year_id === newFyId ||
                            v.financialYear?.uid === newFyId ||
                            String(v.financialYear?.id) === newFyId
                        );
                        if (alreadyExists && (!editingVersion || editingVersion.uid !== alreadyExists.uid)) {
                          toast.warn(
                            "A salary structure has already been created against this financial year and this employee."
                          );
                        }
                      }}
                      className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {financialYears.map((fy) => (
                        <option key={fy.uid} value={fy.uid}>
                          {fy.name} ({formatDateDisplay(fy.start_date)} - {formatDateDisplay(fy.end_date)}) {fy.status === "ACTIVE" ? "★ Active" : ""}
                        </option>
                      ))}
                    </select>
                    {currentFinancialYear && (
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                        <span>Period: {formatDateDisplay(currentFinancialYear.start_date)} to {formatDateDisplay(currentFinancialYear.end_date)}</span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${currentFinancialYear.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600"
                          }`}>
                          {currentFinancialYear.status}
                        </span>
                      </div>
                    )}
                    {currentFinancialYear && currentFinancialYear.status !== "ACTIVE" && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 font-medium">
                        <AlertCircle size={14} className="shrink-0 text-amber-600" />
                        <span>Please select an active financial year. (Status: <b>{currentFinancialYear.status}</b>)</span>
                      </div>
                    )}
                    {hasDuplicateFySalary && (
                      <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2.5 mt-2 font-medium shadow-xs">
                        <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900">
                            A salary structure has already been created against this financial year and this employee.
                          </p>
                          {existingSalaryForSelectedFy?.salaryStructure?.name && (
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              Assigned Structure: <b>{existingSalaryForSelectedFy.salaryStructure?.name}</b> {existingSalaryForSelectedFy.salaryStructure?.code ? `(${existingSalaryForSelectedFy.salaryStructure?.code})` : ""} • Status: <b>{existingSalaryForSelectedFy.status}</b>
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const target =
                                  employeeHistory.find((v) => v.uid === existingSalaryForSelectedFy?.uid) ||
                                  existingSalaryForSelectedFy;
                                handleStartEdit(target as SalaryVersionHistoryItem);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition cursor-pointer"
                            >
                              <PenIcon size={11} />
                              <span>Edit Existing Salary Structure</span>
                            </button>
                            {existingSalaryForSelectedFy?.components && (
                              <button
                                type="button"
                                onClick={() => setInspectingVersion(existingSalaryForSelectedFy as SalaryVersionHistoryItem)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                <Eye size={11} />
                                <span>View Details</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Select Salary Structure Template */}
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
                        <option key={s.uid} value={s.uid}>
                          {s.name} ({s.code}) • {s.components.length} components
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Revision Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual salary revision, FY 2025-26 appointment..."
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
                            ? "Active version. Activating this will ensure any other versions in this FY become INACTIVE."
                            : `Current status is ${status}.`}
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
                            Auto-close previous active version in this Financial Year
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {autoClosePrevious
                              ? "Automatically closes older active salary records in this financial year (Version becomes ACTIVE)."
                              : "Keeps previous salary active. New salary will be created with status INACTIVE."}
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
                            Auto-close unchecked: Existing salary remains <b>ACTIVE</b>. This new version will be created as <b>INACTIVE</b> with your custom amounts.
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
                        Financial Year: <b>{currentActiveSalary.financialYear?.name || "N/A"}</b> ({formatDateDisplay(currentActiveSalary.financialYear?.start_date)} to {formatDateDisplay(currentActiveSalary.financialYear?.end_date)})
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                      title="Reset all customized amounts back to formula defaults"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Calculations</span>
                    </button>
                  </div>

                  {componentRows.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      No components found in the selected salary structure.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            <th className="py-2.5 px-4">Component</th>
                            <th className="py-2.5 px-4 text-center">Type</th>
                            <th className="py-2.5 px-4">Rule / Calculation</th>
                            <th className="py-2.5 px-4 text-right">Default Value</th>
                            <th className="py-2.5 px-4 text-right w-36">Assigned Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {componentRows.map((c, idx) => {
                            const isOverridden = Number(c.amount) !== Number(c.defaultAmount);
                            return (
                              <tr key={c.salary_component_id} className="hover:bg-gray-50/50">
                                <td className="py-2.5 px-4 font-semibold text-gray-900">
                                  {c.name}
                                  <span className="text-[10px] font-mono text-gray-400 block font-normal">
                                    {c.code}
                                  </span>
                                </td>

                                <td className="py-2.5 px-4 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${c.type === "EARNING"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                  >
                                    {c.type}
                                  </span>
                                </td>

                                <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                                  {c.ruleDescription}
                                </td>

                                <td className="py-2.5 px-4 text-right font-mono text-gray-500">
                                  ₹{Number(c.defaultAmount).toLocaleString("en-IN")}
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                      ₹
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={c.amount}
                                      onChange={(e) => handleAmountChange(idx, e.target.value)}
                                      className={`w-full text-right text-xs font-mono font-bold rounded-lg pl-6 pr-2 py-1.5 border transition-colors focus:outline-none focus:ring-1 ${isOverridden
                                        ? "bg-amber-50/50 border-amber-300 text-amber-900 focus:ring-amber-500"
                                        : "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500"
                                        }`}
                                      required
                                    />
                                    {isOverridden && (
                                      <span
                                        className="block text-[9px] text-amber-700 font-semibold text-right mt-0.5"
                                        title="Manually modified from standard structure calculation"
                                      >
                                        Overridden
                                      </span>
                                    )}
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

                {/* Live Salary Breakdown Summary (1 col) */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                        <Banknote size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Salary Breakdown
                      </h3>
                    </div>

                    <div className="space-y-3 mt-4 text-xs">
                      {/* Financial Year Tag */}
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-gray-600 font-medium">Financial Year</span>
                        <span className="font-bold text-gray-900">
                          {currentFinancialYear?.name || "Selected FY"}
                        </span>
                      </div>

                      {/* Gross Earnings */}
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <ArrowUpRight size={15} />
                          <span className="font-semibold">Gross Earnings</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          ₹{totals.grossEarnings.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Deductions */}
                      <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <ArrowDownRight size={15} />
                          <span className="font-semibold">Total Deductions</span>
                        </div>
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          -₹{totals.totalDeductions.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Net Take-Home */}
                      <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                          Net Take-Home Salary
                        </span>
                        <div className="text-2xl font-black font-mono text-indigo-900 mt-1">
                          ₹{totals.netSalary.toLocaleString("en-IN")}
                        </div>
                        <span className="text-[10px] text-indigo-600 mt-1 block">
                          Monthly net payable to employee
                        </span>
                      </div>

                      {/* Annualized CTC projection */}
                      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px] space-y-1">
                        <div className="flex justify-between text-gray-500">
                          <span>Annualized Gross (12m):</span>
                          <span className="font-mono font-medium text-gray-800">
                            ₹{(totals.grossEarnings * 12).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Annualized Net (12m):</span>
                          <span className="font-mono font-medium text-gray-800">
                            ₹{(totals.netSalary * 12).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission CTA Button */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    {hasDuplicateFySalary && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 font-medium">
                        <AlertCircle size={14} className="shrink-0 text-amber-600" />
                        <span>A salary structure has already been created against this financial year and this employee.</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={saving || hasDuplicateFySalary}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-colors text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      <span>
                        {saving
                          ? "Saving Structure..."
                          : editingVersion
                            ? "Update Salary Structure"
                            : "Save & Assign Salary Structure"}
                      </span>
                    </button>

                    {editingVersion && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Revision History for Selected Employee */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                      <History size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Salary Revision History ({currentEmployee?.name || "Employee"})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Track historical assignments, audit trail, and status per Financial Year. Click row to edit.
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono">
                    Total records: <b>{employeeHistory.length}</b>
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
                          <th className="py-2.5 px-4">Financial Year</th>
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
                              className={`cursor-pointer transition-colors ${isEditingThis
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
                                <div className="font-bold text-gray-800">
                                  {item.financialYear?.name || "N/A"}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {formatDateDisplay(item.financialYear?.start_date)} - {formatDateDisplay(item.financialYear?.end_date)}
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
                                    className={`text-[11px] font-bold rounded-full px-2.5 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 shadow-xs ${item.status === "ACTIVE"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                      : item.status === "CLOSED"
                                        ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                        : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                      } ${togglingId === item.id ? "opacity-50 cursor-wait" : ""}`}
                                    title="Click to change status. Activating this will automatically make any other active salary in this FY INACTIVE."
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
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer ${isEditingThis
                                      ? "bg-amber-600 text-white"
                                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                      }`}
                                    title="Edit this version's components and settings"
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
            </form>
          )}

          {/* =============================================================== */}
          {/* TAB 2: EMPLOYEE DIRECTORY & STATUS OVERVIEW */}
          {/* =============================================================== */}
          {activeTab === "directory" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Employee Salary Configuration Directory
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Overview of active salary structures assigned to employees across Financial Years.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Financial Year Filter */}
                  <select
                    value={directoryFyFilter}
                    onChange={(e) => setDirectoryFyFilter(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Financial Years</option>
                    {financialYears.map((fy) => (
                      <option key={fy.uid} value={fy.uid}>
                        {fy.name}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={directoryStatusFilter}
                    onChange={(e) => setDirectoryStatusFilter(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Employees</option>
                    <option value="ASSIGNED">Configured with Salary</option>
                    <option value="UNASSIGNED">Missing Salary Configuration</option>
                  </select>

                  {/* Search bar */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={directorySearch}
                      onChange={(e) => setDirectorySearch(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
                    />
                  </div>
                </div>
              </div>

              {/* Directory Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Active Salary Structure</th>
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
                              <span className="text-[10px] text-indigo-600 font-medium">
                                {emp.currentSalary.financial_year_name}
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
                  {inspectingVersion.financialYear?.name || "Financial Year"} • Status: {inspectingVersion.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
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
                  <span>Financial Year:</span>
                  <span className="font-bold text-gray-900">
                    {inspectingVersion.financialYear?.name || "N/A"}
                  </span>
                </div>
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
