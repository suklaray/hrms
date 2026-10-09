"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import Pageheader from "@/Components/PageHeader";
import { toast } from "react-toastify";
import { isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { formatLongDate, formatDate } from "@/utils/dateTime";
import { TableSkeleton } from "@/Components/Skeletons";
import {
    Banknote,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    CreditCard,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Filter,
    Layers,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    User,
    Users,
    X,
    XCircle,
    AlertCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    RotateCcw,
    Printer,
    Building2,
    Hash,
    Briefcase,
} from "lucide-react";

interface EmployeeSalaryManageProps {
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        empid: string;
        roleId: number;
        rbacRole: any;
    };
    permissions: string[];
}

interface PayrollPeriod {
    uid: string;
    period_name: string;
    period_start: string;
    period_end: string;
    status: string;
    company?: { name: string; uid: string };
    financial_year?: { name: string; uid: string; status: string };
    payroll_configuration?: { payroll_cycle: string; currency: string; salary_payment_date: string };
}

interface EmployeeItem {
    id: number;
    empid: string;
    name: string;
    email: string;
    position?: string | null;
    employee_type?: string | null;
    roleId?: number;
    rbacRole?: { id: number; name: string } | null;
}

interface PayrollComponent {
    id: number;
    payroll_id: string;
    component_name: string;
    component_code: string;
    component_formulla: string;
    component_ammount: number | string;
    component_type: "EARNING" | "DEDUCTION";
}

interface PayrollRecord {
    id: number;
    uid: string;
    empid: string;
    company_id: string;
    period_name: string;
    period_id: string;
    gross_salary: number | string;
    total_deduction: number | string;
    net_salary: number | string;
    total_working_days: number;
    days_worked: number;
    days_absent: number;
    overtime_hours: number;
    overtime_rate_perhour: number | string;
    weekend: number;
    salary_payment_date: string;
    total_payable_amount: number | string;
    status: "PENDING" | "DRAFT" | "GENERATED" | "INITIATED" | "DISBURSED" | "REJECTED";
    generated_at: string;
    payslip_url?: string | null;
    components?: PayrollComponent[];
    company?: {
        uid: string;
        name: string;
        address?: string;
        email?: string;
        website?: string;
    };
    users?: {
        empid: string;
        name: string;
        email: string;
        position?: string | null;
        employee_type?: string | null;
        date_of_joining?: string | null;
        employeeProfile?: {
            bank_details?:
            | {
                id?: number;
                account_holder_name?: string;
                bank_name?: string;
                account_number?: string;
                ifsc_code?: string;
                branch_name?: string;
                pan_number?: string;
                checkbook_document?: string;
            }
            | Array<{
                id?: number;
                account_holder_name?: string;
                bank_name?: string;
                account_number?: string;
                ifsc_code?: string;
                branch_name?: string;
                pan_number?: string;
                checkbook_document?: string;
            }>
            | null;
        } | null;
    };
}

// Currency formatter
function formatCurrency(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount));
}

// Status definitions and badges
const PAYROLL_STATUS_MAP: Record<
    string,
    { label: string; dot: string; bg: string; text: string; border: string }
> = {
    GENERATED: {
        label: "Generated",
        dot: "bg-blue-500",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
    },
    INITIATED: {
        label: "Initiated",
        dot: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
    },
    DISBURSED: {
        label: "Disbursed",
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
    },
    REJECTED: {
        label: "Rejected",
        dot: "bg-rose-500",
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
    },
    PENDING: {
        label: "Pending",
        dot: "bg-slate-400",
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
    },
    DRAFT: {
        label: "Draft",
        dot: "bg-gray-400",
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
    },
};

function StatusBadge({ status }: { status: string }) {
    const config = PAYROLL_STATUS_MAP[status] || {
        label: status || "Unknown",
        dot: "bg-gray-400",
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border select-none ${config.bg} ${config.text} ${config.border}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span>{config.label}</span>
        </span>
    );
}

export default function EmployeeSalaryManage({ user, permissions }: EmployeeSalaryManageProps) {
    // RBAC Permission Checks
    const userPerms = useMemo(() => new Set(Array.isArray(permissions) ? permissions : []), [permissions]);
    const can = useCallback(
        (permKey: string): boolean => {
            if (!user) return false;
            if (isSuperAdmin(user)) return true;
            return userPerms.has(permKey);
        },
        [user, userPerms]
    );

    const canInitiate = can(PERMISSION_KEYS.PAYSLIP_INITIATE);
    const canView = can(PERMISSION_KEYS.PAYSLIP_VIEW);
    const canDispatch = can(PERMISSION_KEYS.PAYSLIP_DISBURSED);

    // Filter states
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

    const [employees, setEmployees] = useState<EmployeeItem[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedEmpid, setSelectedEmpid] = useState<string>("");

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");

    // Data states
    const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
    const [loadingPayrolls, setLoadingPayrolls] = useState(false);

    // Batch selection
    const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

    // Inline Expanded Sections State
    const [expandedUids, setExpandedUids] = useState<Record<string, boolean>>({});
    const [detailedRecords, setDetailedRecords] = useState<Record<string, PayrollRecord>>({});
    const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

    // Confirmation dialog state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: "INITIATE" | "DISBURSE" | "REJECT" | "BATCH_INITIATE" | "BATCH_DISBURSE" | "BATCH_REJECT";
        title: string;
        description: string;
        targetRecord?: PayrollRecord;
        targetUids?: string[];
    } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 1. Fetch Payroll Periods
    const fetchPeriods = useCallback(async () => {
        setLoadingPeriods(true);
        try {
            const res = await fetch("/api/payroll/periods");
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setPeriods(data.data);
            }
        } catch (err) {
            console.error("Error fetching payroll periods:", err);
            toast.error("Failed to load payroll periods");
        } finally {
            setLoadingPeriods(false);
        }
    }, []);

    // 2. Fetch Employees
    const fetchEmployees = useCallback(async () => {
        setLoadingEmployees(true);
        try {
            const res = await fetch("/api/auth/employees");
            const data = await res.json();
            if (data.success && Array.isArray(data.users)) {
                setEmployees(data.users);
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
            toast.error("Failed to load employees");
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    // 3. Fetch Payroll Records based on Period and Empid
    const fetchPayrolls = useCallback(async () => {
        setLoadingPayrolls(true);
        try {
            const params = new URLSearchParams();
            if (selectedPeriodId) params.append("periodId", selectedPeriodId);
            if (selectedEmpid) params.append("empid", selectedEmpid);

            const queryString = params.toString() ? `?${params.toString()}` : "";
            const res = await fetch(`/api/payslip/initiate${queryString}`);
            const data = await res.json();

            if (data.success && Array.isArray(data.data)) {
                setPayrolls(data.data);
            } else {
                setPayrolls([]);
            }
        } catch (err) {
            console.error("Error fetching payroll records:", err);
            toast.error("Failed to load payroll records");
            setPayrolls([]);
        } finally {
            setLoadingPayrolls(false);
            setSelectedUids(new Set()); // reset selection on fresh fetch
        }
    }, [selectedPeriodId, selectedEmpid]);

    // Initial load
    useEffect(() => {
        fetchPeriods();
        fetchEmployees();
    }, [fetchPeriods, fetchEmployees]);

    // Re-fetch payrolls when period or employee filter changes
    useEffect(() => {
        fetchPayrolls();
    }, [fetchPayrolls]);

    // Toggle expand row underneath employee
    const toggleExpand = async (uid: string) => {
        const isCurrentlyOpen = !!expandedUids[uid];
        setExpandedUids((prev) => ({
            ...prev,
            [uid]: !isCurrentlyOpen,
        }));

        if (isCurrentlyOpen) return;

        // Fetch fresh detailed record (including bank details & components) if not cached
        if (!detailedRecords[uid]) {
            try {
                setLoadingDetails((prev) => ({ ...prev, [uid]: true }));
                const res = await fetch(`/api/payslip/initiate?uid=${uid}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setDetailedRecords((prev) => ({ ...prev, [uid]: data.data }));
                }
            } catch (err) {
                console.error("Error fetching detailed payroll:", err);
            } finally {
                setLoadingDetails((prev) => ({ ...prev, [uid]: false }));
            }
        }
    };

    // Filtered Payroll Records
    const filteredPayrolls = useMemo(() => {
        let list = payrolls;

        // Status tab filter
        if (selectedStatusTab !== "ALL") {
            list = list.filter((p) => p.status === selectedStatusTab);
        }

        // Search text filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((p) => {
                const nameMatch = p.users?.name?.toLowerCase().includes(q) || false;
                const empidMatch = p.empid?.toLowerCase().includes(q) || false;
                const emailMatch = p.users?.email?.toLowerCase().includes(q) || false;
                const positionMatch = p.users?.position?.toLowerCase().includes(q) || false;
                const periodMatch = p.period_name?.toLowerCase().includes(q) || false;
                return nameMatch || empidMatch || emailMatch || positionMatch || periodMatch;
            });
        }

        return list;
    }, [payrolls, selectedStatusTab, searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedPeriodId, selectedEmpid, selectedStatusTab, searchQuery]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = payrolls.length;
        const totalNet = payrolls.reduce((acc, p) => acc + Number(p.total_payable_amount || p.net_salary || 0), 0);
        const generated = payrolls.filter((p) => p.status === "GENERATED" || p.status === "PENDING");
        const initiated = payrolls.filter((p) => p.status === "INITIATED");
        const disbursed = payrolls.filter((p) => p.status === "DISBURSED");
        const rejected = payrolls.filter((p) => p.status === "REJECTED");

        const initiatedNet = initiated.reduce(
            (acc, p) => acc + Number(p.total_payable_amount || p.net_salary || 0),
            0
        );
        const disbursedNet = disbursed.reduce(
            (acc, p) => acc + Number(p.total_payable_amount || p.net_salary || 0),
            0
        );

        return {
            total,
            totalNet,
            generatedCount: generated.length,
            initiatedCount: initiated.length,
            initiatedNet,
            disbursedCount: disbursed.length,
            disbursedNet,
            rejectedCount: rejected.length,
        };
    }, [payrolls]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredPayrolls.length / pageSize) || 1;
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPayrolls.slice(start, start + pageSize);
    }, [filteredPayrolls, currentPage, pageSize]);

    // Batch selection helpers
    const toggleSelectAll = () => {
        if (selectedUids.size === paginatedRecords.length && paginatedRecords.length > 0) {
            setSelectedUids(new Set());
        } else {
            const next = new Set<string>();
            paginatedRecords.forEach((p) => {
                if (p.uid) next.add(p.uid);
            });
            setSelectedUids(next);
        }
    };

    const toggleSelectRow = (uid: string) => {
        const next = new Set(selectedUids);
        if (next.has(uid)) {
            next.delete(uid);
        } else {
            next.add(uid);
        }
        setSelectedUids(next);
    };

    // Determine eligible selected items for batch actions
    const selectedRecords = useMemo(() => {
        return payrolls.filter((p) => selectedUids.has(p.uid));
    }, [payrolls, selectedUids]);

    const eligibleForInitiate = useMemo(() => {
        return selectedRecords.filter((p) => p.status === "GENERATED" || p.status === "PENDING");
    }, [selectedRecords]);

    const eligibleForDisburseOrReject = useMemo(() => {
        return selectedRecords.filter((p) => p.status === "INITIATED");
    }, [selectedRecords]);

    // Action Execution: Initiate (Single)
    const executeInitiate = async (uid: string) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/payslip/initiate?uid=${uid}&status=INITIATED`, {
                method: "PUT",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || "Salary initiated successfully!");
                // Update local list state
                setPayrolls((prev) =>
                    prev.map((p) => (p.uid === uid ? { ...p, status: "INITIATED", generated_at: new Date().toISOString() } : p))
                );
                // Update detailed state
                setDetailedRecords((prev) =>
                    prev[uid] ? { ...prev, [uid]: { ...prev[uid], status: "INITIATED", generated_at: new Date().toISOString() } } : prev
                );
                setConfirmModal(null);
            } else {
                toast.error(data.message || "Failed to initiate salary");
            }
        } catch (err) {
            console.error("Error initiating salary:", err);
            toast.error("Failed to initiate salary");
        } finally {
            setActionLoading(false);
        }
    };

    // Action Execution: Disburse or Reject (Single)
    const executeDisburseOrReject = async (uid: string, targetStatus: "DISBURSED" | "REJECTED") => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/payslip/disburse?uid=${uid}&status=${targetStatus}`, {
                method: "PUT",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(
                    data.message ||
                    (targetStatus === "DISBURSED"
                        ? "Salary marked as DISBURSED successfully!"
                        : "Salary marked as REJECTED successfully!")
                );
                // Update local list state
                setPayrolls((prev) =>
                    prev.map((p) =>
                        p.uid === uid
                            ? {
                                ...p,
                                status: targetStatus,
                                payslip_url: data.payslip_url || p.payslip_url,
                                generated_at: new Date().toISOString(),
                            }
                            : p
                    )
                );
                // Update detailed state
                setDetailedRecords((prev) => {
                    const currentDetail = prev[uid];
                    if (!currentDetail) return prev;
                    return {
                        ...prev,
                        [uid]: {
                            ...currentDetail,
                            status: targetStatus,
                            payslip_url: data.payslip_url || currentDetail.payslip_url,
                            generated_at: new Date().toISOString(),
                        },
                    };
                });
                setConfirmModal(null);
            } else {
                toast.error(data.message || `Failed to mark salary as ${targetStatus}`);
            }
        } catch (err) {
            console.error(`Error marking as ${targetStatus}:`, err);
            toast.error(`Failed to mark salary as ${targetStatus}`);
        } finally {
            setActionLoading(false);
        }
    };

    // Action Execution: Batch operations
    const executeBatch = async (
        uids: string[],
        action: "INITIATE" | "DISBURSED" | "REJECTED"
    ) => {
        setActionLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const uid of uids) {
            try {
                let res;
                if (action === "INITIATE") {
                    res = await fetch(`/api/payslip/initiate?uid=${uid}&status=INITIATED`, {
                        method: "PUT",
                    });
                } else {
                    res = await fetch(`/api/payslip/disburse?uid=${uid}&status=${action}`, {
                        method: "PUT",
                    });
                }
                const data = await res.json();
                if (res.ok && data.success) {
                    successCount++;
                    setPayrolls((prev) =>
                        prev.map((p) => (p.uid === uid ? { ...p, status: action as any } : p))
                    );
                    setDetailedRecords((prev) =>
                        prev[uid] ? { ...prev, [uid]: { ...prev[uid], status: action as any } } : prev
                    );
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setActionLoading(false);
        setConfirmModal(null);
        setSelectedUids(new Set());

        if (successCount > 0) {
            toast.success(`Successfully processed ${successCount} record(s)`);
        }
        if (failCount > 0) {
            toast.error(`Failed to process ${failCount} record(s)`);
        }
    };

    // Export to CSV
    const exportToCsv = () => {
        if (filteredPayrolls.length === 0) {
            toast.info("No records to export");
            return;
        }

        const headers = [
            "Employee ID",
            "Employee Name",
            "Email",
            "Position",
            "Period",
            "Working Days",
            "Days Worked",
            "Days Absent",
            "Overtime Hours",
            "Gross Salary",
            "Total Deductions",
            "Net Payable",
            "Status",
            "Payment Date",
        ];

        const rows = filteredPayrolls.map((p) => [
            `"${p.empid || ""}"`,
            `"${p.users?.name || ""}"`,
            `"${p.users?.email || ""}"`,
            `"${p.users?.position || ""}"`,
            `"${p.period_name || ""}"`,
            p.total_working_days || 0,
            p.days_worked || 0,
            p.days_absent || 0,
            p.overtime_hours || 0,
            Number(p.gross_salary || 0).toFixed(2),
            Number(p.total_deduction || 0).toFixed(2),
            Number(p.total_payable_amount || p.net_salary || 0).toFixed(2),
            `"${p.status}"`,
            `"${formatDate(p.salary_payment_date)}"`,
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
            "download",
            `employee_salaries_${selectedPeriodId || "all"}_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Payroll data exported successfully!");
    };

    return (
        <div className="min-h-screen bg-slate-50/60 pb-16">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* Header with Go Back to Salary Generator */}
                <Pageheader
                    title="Manage Employee Salary"
                    description="Review generated payroll records, initiate salary disbursement, and authorize payout disbursements."
                    href="/payroll/employee-salary"
                />

                {/* Top Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Workflow:
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="px-2 py-0.5 rounded bg-indigo-500 text-white font-medium">1. Payroll Setup</span>
                            <span className="text-slate-400">→</span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">2. Generate</span>
                            <span className="text-slate-400">→</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">3. Initiate</span>
                            <span className="text-slate-400">→</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">4. Disburse</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => fetchPayrolls()}
                            disabled={loadingPayrolls}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingPayrolls ? "animate-spin text-indigo-600" : ""}`} />
                            <span>Refresh</span>
                        </button>

                        <button
                            type="button"
                            onClick={exportToCsv}
                            disabled={filteredPayrolls.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Export CSV</span>
                        </button>

                        <Link
                            href="/payroll/employee-salary"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Generate Salary</span>
                        </Link>
                    </div>
                </div>

                {/* KPI Metrics Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Total Records */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                <FileSpreadsheet className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <span>Total Net Volume</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(stats.totalNet)}</span>
                        </div>
                    </div>

                    {/* Ready to Initiate */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Generated / Pending</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.generatedCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <span>Awaiting Initiation</span>
                            <span className="font-semibold text-blue-700">{stats.generatedCount} records</span>
                        </div>
                    </div>

                    {/* Initiated / Pending Payout */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Initiated (In Review)</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.initiatedCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Banknote className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <span>Pending Payout</span>
                            <span className="font-semibold text-amber-700">{formatCurrency(stats.initiatedNet)}</span>
                        </div>
                    </div>

                    {/* Disbursed */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Disbursed (Completed)</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.disbursedCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <span>Disbursed Volume</span>
                            <span className="font-semibold text-emerald-700">{formatCurrency(stats.disbursedNet)}</span>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Panel */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Payroll Period Dropdown */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Payroll Period
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedPeriodId}
                                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">All Payroll Periods</option>
                                    {periods.map((p) => (
                                        <option key={p.uid} value={p.uid}>
                                            {p.period_name} ({formatDate(p.period_start)} - {formatDate(p.period_end)}) [{p.status}]
                                        </option>
                                    ))}
                                </select>
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        {/* Employee Dropdown Filter */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Filter by Employee
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedEmpid}
                                    onChange={(e) => setSelectedEmpid(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">All Employees</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.empid}>
                                            {emp.name} ({emp.empid}) {emp.position ? `- ${emp.position}` : ""}
                                        </option>
                                    ))}
                                </select>
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>

                        {/* Search Input */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Search Records
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, ID, position, email..."
                                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Tabs and Quick Reset */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { key: "ALL", label: "All", count: stats.total },
                                { key: "GENERATED", label: "Generated", count: stats.generatedCount },
                                { key: "INITIATED", label: "Initiated", count: stats.initiatedCount },
                                { key: "DISBURSED", label: "Disbursed", count: stats.disbursedCount },
                                { key: "REJECTED", label: "Rejected", count: stats.rejectedCount },
                            ].map((tab) => {
                                const isActive = selectedStatusTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setSelectedStatusTab(tab.key)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive
                                            ? "bg-indigo-600 text-white shadow-xs"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                                            }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-indigo-700/60 text-white" : "bg-slate-200 text-slate-700"
                                                }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {(selectedPeriodId || selectedEmpid || searchQuery || selectedStatusTab !== "ALL") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPeriodId("");
                                    setSelectedEmpid("");
                                    setSearchQuery("");
                                    setSelectedStatusTab("ALL");
                                }}
                                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset Filters</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Batch Action Floating Header (if rows selected) */}
                {selectedUids.size > 0 && (
                    <div className="bg-indigo-900 text-white rounded-xl px-5 py-3.5 mb-4 shadow-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold">
                                {selectedUids.size}
                            </div>
                            <span className="text-xs font-medium">
                                Selected {selectedUids.size} employee record(s)
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {canInitiate && eligibleForInitiate.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmModal({
                                            isOpen: true,
                                            action: "BATCH_INITIATE",
                                            title: `Batch Initiate Salaries (${eligibleForInitiate.length})`,
                                            description: `Are you sure you want to initiate salary for ${eligibleForInitiate.length} eligible employee(s)? Their status will become INITIATED.`,
                                            targetUids: eligibleForInitiate.map((p) => p.uid),
                                        })
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Initiate ({eligibleForInitiate.length})</span>
                                </button>
                            )}

                            {canDispatch && eligibleForDisburseOrReject.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmModal({
                                                isOpen: true,
                                                action: "BATCH_DISBURSE",
                                                title: `Batch Disburse Payouts (${eligibleForDisburseOrReject.length})`,
                                                description: `Are you sure you want to mark ${eligibleForDisburseOrReject.length} initiated salary record(s) as DISBURSED? Ensure bank transfers are complete.`,
                                                targetUids: eligibleForDisburseOrReject.map((p) => p.uid),
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Disburse ({eligibleForDisburseOrReject.length})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmModal({
                                                isOpen: true,
                                                action: "BATCH_REJECT",
                                                title: `Batch Reject Payouts (${eligibleForDisburseOrReject.length})`,
                                                description: `Are you sure you want to REJECT ${eligibleForDisburseOrReject.length} initiated salary record(s)?`,
                                                targetUids: eligibleForDisburseOrReject.map((p) => p.uid),
                                            })
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject ({eligibleForDisburseOrReject.length})</span>
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedUids(new Set())}
                                className="px-2.5 py-1.5 text-xs text-indigo-200 hover:text-white transition-colors cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Payroll Table with Inline Expandable Rows */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="px-4 py-3.5 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                paginatedRecords.length > 0 &&
                                                paginatedRecords.every((p) => selectedUids.has(p.uid))
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-4 py-3.5">Employee</th>
                                    <th className="px-4 py-3.5">Period</th>
                                    <th className="px-4 py-3.5 text-center">Work Days</th>
                                    <th className="px-4 py-3.5 text-right">Gross Salary</th>
                                    <th className="px-4 py-3.5 text-right">Deductions</th>
                                    <th className="px-4 py-3.5 text-right">Net Payable</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>

                            {loadingPayrolls ? (
                                <TableSkeleton rows={pageSize} columns={9} />
                            ) : paginatedRecords.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={9} className="px-6 py-16 text-center">
                                            <div className="max-w-md mx-auto flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                                    <Banknote className="w-7 h-7" />
                                                </div>
                                                <h3 className="text-base font-semibold text-slate-800">
                                                    No payroll records found
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1 mb-5">
                                                    {selectedPeriodId || selectedEmpid || searchQuery
                                                        ? "Try clearing filters or selecting another payroll period."
                                                        : "No employee salaries have been generated yet for this filter criteria."}
                                                </p>
                                                <Link
                                                    href="/payroll/employee-salary"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Generate Employee Salary</span>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {paginatedRecords.map((record) => {
                                        const isSelected = selectedUids.has(record.uid);
                                        const isExpanded = !!expandedUids[record.uid];
                                        const netPayable = Number(record.total_payable_amount || record.net_salary || 0);
                                        const gross = Number(record.gross_salary || 0);
                                        const deduction = Number(record.total_deduction || 0);

                                        // Detailed item if loaded from single endpoint or record fallback
                                        const detailRecord = detailedRecords[record.uid] || record;
                                        const rawBank = detailRecord.users?.employeeProfile?.bank_details;
                                        const bank = Array.isArray(rawBank) ? rawBank[0] : rawBank;
                                        const loadingDetailItem = !!loadingDetails[record.uid];

                                        return (
                                            <Fragment key={record.uid}>
                                                {/* Main Table Row */}
                                                <tr
                                                    className={`transition-colors ${isExpanded
                                                        ? "bg-amber-50/25"
                                                        : isSelected
                                                            ? "bg-indigo-50/40"
                                                            : "hover:bg-slate-50/80"
                                                        }`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectRow(record.uid)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </td>

                                                    {/* Employee Name & Details */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs select-none shadow-xs">
                                                                {record.users?.name
                                                                    ? record.users.name.charAt(0).toUpperCase()
                                                                    : record.empid.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-slate-900">
                                                                    {record.users?.name || "Unknown Name"}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                                    <span className="font-mono text-slate-600 font-medium">
                                                                        {record.empid}
                                                                    </span>
                                                                    {record.users?.position && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{record.users.position}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Period */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="font-medium text-slate-800">
                                                            {record.period_name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            Pay Date: {formatDate(record.salary_payment_date)}
                                                        </div>
                                                    </td>

                                                    {/* Attendance Days */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                        <div className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                                                            <span>{record.days_worked}</span>
                                                            <span className="text-slate-400">/</span>
                                                            <span>{record.total_working_days} d</span>
                                                        </div>
                                                        {record.overtime_hours > 0 && (
                                                            <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                                                                +{record.overtime_hours}h OT
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Gross Salary */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium text-slate-700">
                                                        {formatCurrency(gross)}
                                                    </td>

                                                    {/* Deductions */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium text-rose-600">
                                                        -{formatCurrency(deduction)}
                                                    </td>

                                                    {/* Net Payable */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-slate-900 text-[13px]">
                                                        {formatCurrency(netPayable)}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                                        <StatusBadge status={record.status} />
                                                    </td>

                                                    {/* Combined Action Column */}
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpand(record.uid)}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer ${isExpanded
                                                                    ? "bg-slate-800 text-white hover:bg-slate-700"
                                                                    : record.status === "GENERATED" || record.status === "PENDING"
                                                                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                                        : record.status === "INITIATED"
                                                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                                    }`}
                                                                title={
                                                                    isExpanded
                                                                        ? "Close breakdown section"
                                                                        : record.status === "GENERATED" || record.status === "PENDING"
                                                                            ? "View payslip & initiate salary"
                                                                            : record.status === "INITIATED"
                                                                                ? "View payslip & authorize disbursement"
                                                                                : "View payslip breakdown"
                                                                }
                                                            >
                                                                {isExpanded ? (
                                                                    <>
                                                                        <X className="w-3.5 h-3.5" />
                                                                        <span>Close</span>
                                                                    </>
                                                                ) : record.status === "GENERATED" || record.status === "PENDING" ? (
                                                                    <>
                                                                        {
                                                                            canInitiate ?
                                                                                <>
                                                                                    <Eye className="w-3.5 h-3.5" />
                                                                                    <span>View & Initiate</span>
                                                                                </>
                                                                                :
                                                                                canDispatch ?
                                                                                    <>
                                                                                        <Clock className="w-3.5 h-3.5" />
                                                                                        <span>Waiting for Initiate</span>
                                                                                    </>
                                                                                    :
                                                                                    <>
                                                                                        <Eye className="w-3.5 h-3.5" />
                                                                                        <span>View Payslip</span>
                                                                                    </>
                                                                        }
                                                                    </>
                                                                ) : record.status === "INITIATED" ? (
                                                                    <>
                                                                        {
                                                                            canDispatch ?
                                                                                <>
                                                                                    <Eye className="w-3.5 h-3.5" />
                                                                                    <span>View & Disburse</span>
                                                                                </>
                                                                                :
                                                                                <>
                                                                                    <Eye className="w-3.5 h-3.5" />
                                                                                    <span>View Payslip</span>
                                                                                </>
                                                                        }

                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        <span>View Details</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Inline Expandable Section Under the Employee Row */}
                                                {isExpanded && (
                                                    <tr className="border-b-2 border-slate-300 bg-slate-50/70 transition-all">
                                                        <td colSpan={9} className="p-0 border-r border-l border-slate-200">
                                                            <div className="border-l-4 border-l-amber-500 bg-white shadow-inner">
                                                                {/* Header bar of the section */}
                                                                <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/80">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                                            <Banknote className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                                                                <span>Payslip Breakdown & Review — {detailRecord.users?.name || detailRecord.empid}</span>
                                                                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                                                                                    {detailRecord.empid}
                                                                                </span>
                                                                                <StatusBadge status={detailRecord.status} />
                                                                            </div>
                                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                                                Period: {detailRecord.period_name} • Payment Date: {formatDate(detailRecord.salary_payment_date)}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {loadingDetailItem && (
                                                                            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-medium mr-2">
                                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                                Loading details...
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleExpand(record.uid)}
                                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                                                                            title="Close section"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Main Content inside the section (Card layout) */}
                                                                <div className="p-6 space-y-6 text-xs">
                                                                    {/* 1. Employee & Organization Dark Banner */}
                                                                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <h3 className="text-lg font-bold text-white">
                                                                                        {detailRecord.users?.name || "Employee"}
                                                                                    </h3>
                                                                                    <StatusBadge status={detailRecord.status} />
                                                                                </div>
                                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-xs text-slate-300">
                                                                                    <div>
                                                                                        <span className="text-slate-400">Employee ID: </span>
                                                                                        <span className="font-semibold text-white font-mono">{detailRecord.empid}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-slate-400">Designation: </span>
                                                                                        <span className="font-semibold text-white">{detailRecord.users?.position || "--"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-slate-400">Type: </span>
                                                                                        <span className="font-semibold text-white">{detailRecord.users?.employee_type || "Full-time"}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-slate-400">Joined: </span>
                                                                                        <span className="font-semibold text-white">
                                                                                            {detailRecord.users?.date_of_joining ? formatDate(detailRecord.users.date_of_joining) : "--"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-slate-400">Pay Date: </span>
                                                                                        <span className="font-semibold text-white">{formatDate(detailRecord.salary_payment_date)}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-slate-400">Company: </span>
                                                                                        <span className="font-semibold text-white">{detailRecord.company?.name || "--"}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="sm:text-right bg-white/10 p-3 rounded-lg backdrop-blur-xs">
                                                                                <span className="text-[11px] text-slate-300 uppercase tracking-wider block">Net Payable</span>
                                                                                <span className="text-2xl font-extrabold text-white">
                                                                                    {formatCurrency(detailRecord.total_payable_amount || detailRecord.net_salary)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 2. Bank Details & Attendance Grid */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {/* Bank Details */}
                                                                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                                                                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                                                                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                                                                <span>Disbursement Bank Account</span>
                                                                            </h4>
                                                                            <div className="space-y-1.5 text-xs text-slate-600">
                                                                                {bank?.account_holder_name && (
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Account Holder:</span>
                                                                                        <span className="font-semibold text-slate-800">
                                                                                            {bank.account_holder_name.trim()}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Bank Name:</span>
                                                                                    <span className="font-semibold text-slate-800">
                                                                                        {bank?.bank_name ? bank.bank_name.trim() : "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Account Number:</span>
                                                                                    <span className="font-mono font-semibold text-slate-800">
                                                                                        {bank?.account_number || "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">IFSC Code:</span>
                                                                                    <span className="font-mono font-semibold text-slate-800">
                                                                                        {bank?.ifsc_code || "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Branch:</span>
                                                                                    <span className="font-semibold text-slate-800">
                                                                                        {bank?.branch_name ? bank.branch_name.trim() : "N/A"}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Attendance Summary */}
                                                                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                                                                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                                                                                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                                                                                <span>Attendance & Duty Details</span>
                                                                            </h4>
                                                                            <div className="grid grid-cols-2 gap-2 text-center">
                                                                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                                                                    <span className="text-[10px] text-slate-400 block">Total Month Days</span>
                                                                                    <span className="font-bold text-slate-800 text-sm">{detailRecord.total_working_days}</span>
                                                                                </div>
                                                                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                                                                    <span className="text-[10px] text-slate-400 block">Days Worked</span>
                                                                                    <span className="font-bold text-emerald-600 text-sm">{detailRecord.days_worked}</span>
                                                                                </div>
                                                                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                                                                    <span className="text-[10px] text-slate-400 block">Days Absent</span>
                                                                                    <span className="font-bold text-rose-600 text-sm">{detailRecord.days_absent}</span>
                                                                                </div>
                                                                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                                                                    <span className="text-[10px] text-slate-400 block">Overtime</span>
                                                                                    <span className="font-bold text-indigo-600 text-sm">
                                                                                        {detailRecord.overtime_hours}h
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 3. Components Breakdown: Earnings vs Deductions */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {/* Earnings */}
                                                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                                            <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between">
                                                                                <span className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                                                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                                                                                    Earnings
                                                                                </span>
                                                                                <span className="font-bold text-emerald-700">
                                                                                    {formatCurrency(detailRecord.gross_salary)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                                                                                {detailRecord.components &&
                                                                                    detailRecord.components.filter((c) => c.component_type === "EARNING").length > 0 ? (
                                                                                    detailRecord.components
                                                                                        .filter((c) => c.component_type === "EARNING")
                                                                                        .map((c) => (
                                                                                            <div key={c.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50">
                                                                                                <div>
                                                                                                    <span className="font-medium text-slate-800">{c.component_name}</span>
                                                                                                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                                                                                                        ({c.component_code})
                                                                                                    </span>
                                                                                                </div>
                                                                                                <span className="font-semibold text-slate-900">
                                                                                                    {formatCurrency(c.component_ammount)}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))
                                                                                ) : (
                                                                                    <div className="px-4 py-3 text-slate-400 text-center">
                                                                                        Gross Amount: {formatCurrency(detailRecord.gross_salary)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Deductions */}
                                                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                                            <div className="bg-rose-50/70 border-b border-rose-100 px-4 py-2.5 flex items-center justify-between">
                                                                                <span className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                                                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                                                                                    Deductions
                                                                                </span>
                                                                                <span className="font-bold text-rose-700">
                                                                                    {formatCurrency(detailRecord.total_deduction)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                                                                                {detailRecord.components &&
                                                                                    detailRecord.components.filter((c) => c.component_type === "DEDUCTION").length > 0 ? (
                                                                                    detailRecord.components
                                                                                        .filter((c) => c.component_type === "DEDUCTION")
                                                                                        .map((c) => (
                                                                                            <div key={c.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50">
                                                                                                <div>
                                                                                                    <span className="font-medium text-slate-800">{c.component_name}</span>
                                                                                                    <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                                                                                                        ({c.component_code})
                                                                                                    </span>
                                                                                                </div>
                                                                                                <span className="font-semibold text-rose-600">
                                                                                                    -{formatCurrency(c.component_ammount)}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))
                                                                                ) : (
                                                                                    <div className="px-4 py-3 text-slate-400 text-center">
                                                                                        Total Deductions: {formatCurrency(detailRecord.total_deduction)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Footer Bar inside the section */}
                                                                <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleExpand(record.uid)}
                                                                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                                                    >
                                                                        Close
                                                                    </button>

                                                                    <div className="flex items-center gap-2">
                                                                        {/* Initiate Button inside section for GENERATED / PENDING */}
                                                                        {canInitiate &&
                                                                            (detailRecord.status === "GENERATED" || detailRecord.status === "PENDING") && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setConfirmModal({
                                                                                            isOpen: true,
                                                                                            action: "INITIATE",
                                                                                            title: `Initiate Salary for ${detailRecord.users?.name || detailRecord.empid}`,
                                                                                            description: `Are you sure you want to initiate salary disbursement of ${formatCurrency(
                                                                                                detailRecord.total_payable_amount || detailRecord.net_salary
                                                                                            )}?`,
                                                                                            targetRecord: detailRecord,
                                                                                        })
                                                                                    }
                                                                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                                                                                >
                                                                                    <Clock className="w-4 h-4" />
                                                                                    <span>Initiate Salary</span>
                                                                                </button>
                                                                            )}

                                                                        {/* Disburse and Reject buttons for INITIATED */}
                                                                        {canDispatch && detailRecord.status === "INITIATED" && (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setConfirmModal({
                                                                                            isOpen: true,
                                                                                            action: "REJECT",
                                                                                            title: `Reject Salary for ${detailRecord.users?.name || detailRecord.empid}`,
                                                                                            description: `Are you sure you want to REJECT this initiated payout of ${formatCurrency(
                                                                                                detailRecord.total_payable_amount || detailRecord.net_salary
                                                                                            )}?`,
                                                                                            targetRecord: detailRecord,
                                                                                        })
                                                                                    }
                                                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                                                                >
                                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                                    <span>Reject Payout</span>
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setConfirmModal({
                                                                                            isOpen: true,
                                                                                            action: "DISBURSE",
                                                                                            title: `Disburse Salary for ${detailRecord.users?.name || detailRecord.empid}`,
                                                                                            description: `Confirm that salary payout of ${formatCurrency(
                                                                                                detailRecord.total_payable_amount || detailRecord.net_salary
                                                                                            )} has been disbursed.`,
                                                                                            targetRecord: detailRecord,
                                                                                        })
                                                                                    }
                                                                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                                                                                >
                                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                                    <span>Authorize Disbursement</span>
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {/* Download Payslip Button if DISBURSED */}
                                                                        {detailRecord.status === "DISBURSED" && (
                                                                            <a
                                                                                href={detailRecord.payslip_url || `/uploads/payslips/${detailRecord.empid}_${detailRecord.period_id}.pdf`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                download={`Payslip_${detailRecord.empid}_${detailRecord.period_name.replace(/\s+/g, "_")}.pdf`}
                                                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                <FileText className="w-3.5 h-3.5" />
                                                                                <span>Download Payslip PDF</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            )}
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {!loadingPayrolls && filteredPayrolls.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                                <span>Showing</span>
                                <span className="font-semibold text-slate-900">
                                    {(currentPage - 1) * pageSize + 1} -{" "}
                                    {Math.min(currentPage * pageSize, filteredPayrolls.length)}
                                </span>
                                <span>of</span>
                                <span className="font-semibold text-slate-900">{filteredPayrolls.length}</span>
                                <span>records</span>

                                <span className="mx-2 text-slate-300">|</span>

                                <div className="flex items-center gap-1">
                                    <span>Rows:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <span className="px-2 font-medium text-slate-700">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && confirmModal.isOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-4">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.action === "DISBURSE" || confirmModal.action === "BATCH_DISBURSE"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : confirmModal.action === "REJECT" || confirmModal.action === "BATCH_REJECT"
                                        ? "bg-rose-100 text-rose-600"
                                        : "bg-amber-100 text-amber-600"
                                    }`}
                            >
                                {confirmModal.action === "DISBURSE" || confirmModal.action === "BATCH_DISBURSE" ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                ) : confirmModal.action === "REJECT" || confirmModal.action === "BATCH_REJECT" ? (
                                    <AlertCircle className="w-6 h-6" />
                                ) : (
                                    <Clock className="w-6 h-6" />
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    {confirmModal.description}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                    if (confirmModal.action === "INITIATE" && confirmModal.targetRecord) {
                                        executeInitiate(confirmModal.targetRecord.uid);
                                    } else if (confirmModal.action === "DISBURSE" && confirmModal.targetRecord) {
                                        executeDisburseOrReject(confirmModal.targetRecord.uid, "DISBURSED");
                                    } else if (confirmModal.action === "REJECT" && confirmModal.targetRecord) {
                                        executeDisburseOrReject(confirmModal.targetRecord.uid, "REJECTED");
                                    } else if (confirmModal.action === "BATCH_INITIATE" && confirmModal.targetUids) {
                                        executeBatch(confirmModal.targetUids, "INITIATE");
                                    } else if (confirmModal.action === "BATCH_DISBURSE" && confirmModal.targetUids) {
                                        executeBatch(confirmModal.targetUids, "DISBURSED");
                                    } else if (confirmModal.action === "BATCH_REJECT" && confirmModal.targetUids) {
                                        executeBatch(confirmModal.targetUids, "REJECTED");
                                    }
                                }}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${confirmModal.action === "DISBURSE" || confirmModal.action === "BATCH_DISBURSE"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : confirmModal.action === "REJECT" || confirmModal.action === "BATCH_REJECT"
                                        ? "bg-rose-600 hover:bg-rose-700"
                                        : "bg-amber-500 hover:bg-amber-600"
                                    }`}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>
                                        {confirmModal.action.includes("DISBURSE")
                                            ? "Confirm Disbursement"
                                            : confirmModal.action.includes("REJECT")
                                                ? "Confirm Rejection"
                                                : "Confirm Initiation"}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}