"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Head from "@/lib/compatHead";
import {
    Download,
    Printer,
    ArrowLeft,
    Building2,
    Calendar,
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    User,
    ShieldCheck,
    Phone,
    Mail,
    MapPin,
    Loader2,
    ChevronDown,
    ChevronUp,
    Search,
    RefreshCw,
    Wallet,
    Layers,
    Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Helper: Format Date ──────────────────────────────────────────────────────
function formatDate(dateInput?: string | Date | null): string {
    if (!dateInput) return "--";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ─── Helper: Format Currency ──────────────────────────────────────────────────
function formatCurrency(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined || amount === "") return "₹0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₹0.00";
    return "₹" + num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ─── Helper: Convert Number to Words (Indian Numbering System) ────────────────
function numberToWords(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return "Zero Rupees Only";
    const num = Math.floor(Math.abs(Number(amount) || 0));
    if (num === 0) return "Zero Rupees Only";

    const a = [
        "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
        "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(n: number): string {
        if (n === 0) return "";
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
        if (n < 1000) return inWords(Math.floor(n / 100)) + "Hundred " + inWords(n % 100);
        if (n < 100000) return inWords(Math.floor(n / 1000)) + "Thousand " + inWords(n % 1000);
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + "Lakh " + inWords(n % 100000);
        return inWords(Math.floor(n / 10000000)) + "Crore " + inWords(n % 10000000);
    }

    const words = inWords(num).trim();
    return words ? `${words} Rupees Only` : "Zero Rupees Only";
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function DisbursedStatusBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Disbursed</span>
        </span>
    );
}

export default function MyPayslipsClient() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // ─── Fetch All Disbursed Payslips ───────────────────────────────────────────
    const fetchPayslips = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Strictly request list of DISBURSED payslips for the authenticated employee
            const res = await fetch("/api/payslip/get-payslip?list=true&status=DISBURSED");
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to load payslips");
            }

            const rawList = Array.isArray(data.data) ? data.data : [];
            // Extra client-side guarantee: Only DISBURSED payslips can be displayed
            const disbursedList = rawList.filter(
                (p: any) => (p.status || "").toUpperCase() === "DISBURSED"
            );

            setPayslips(disbursedList);

            // Auto-expand the latest (first) payslip by default for convenience
            if (disbursedList.length > 0) {
                const latestId = disbursedList[0].uid || String(disbursedList[0].id);
                setExpandedIds(new Set([latestId]));
            } else {
                setExpandedIds(new Set());
            }
        } catch (err) {
            console.error("Error fetching my payslips:", err);
            setError(err instanceof Error ? err.message : "Failed to load payslips");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayslips();
    }, [fetchPayslips]);

    // ─── Toggle Accordion / Expansion ───────────────────────────────────────────
    const toggleExpand = (identifier: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(identifier)) {
                next.delete(identifier);
            } else {
                next.add(identifier);
            }
            return next;
        });
    };

    const handleExpandAll = () => {
        const allIds = new Set<string>();
        payslips.forEach((p) => {
            const id = p.uid || String(p.id);
            if (id) allIds.add(id);
        });
        setExpandedIds(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedIds(new Set());
    };

    // ─── Download PDF Handler ───────────────────────────────────────────────────
    const handleDownloadPdf = async (payroll: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const downloadTargetId = payroll.uid || payroll.id;
        if (!downloadTargetId) return;

        setDownloadingId(downloadTargetId);
        const toastId = toast.loading(`Preparing PDF for ${payroll.period_name || "payslip"}...`);
        try {
            const res = await fetch(
                `/api/payslip/get-payslip?id=${encodeURIComponent(downloadTargetId)}&download=true`
            );

            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                throw new Error(errJson?.error || "Failed to download PDF statement.");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payslip_${payroll.empid}_${payroll.period_name || "statement"}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Payslip statement downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error("PDF download error:", err);
            toast.error(err instanceof Error ? err.message : "Download failed", { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    // ─── Filtered Payslips List ─────────────────────────────────────────────────
    const filteredPayslips = useMemo(() => {
        if (!searchQuery.trim()) return payslips;
        const q = searchQuery.toLowerCase().trim();
        return payslips.filter((p) => {
            const period = (p.period_name || "").toLowerCase();
            const dateStr = formatDate(p.salary_payment_date).toLowerCase();
            const gross = String(p.gross_salary || "");
            const net = String(p.total_payable_amount || p.net_salary || "");
            return period.includes(q) || dateStr.includes(q) || gross.includes(q) || net.includes(q);
        });
    }, [payslips, searchQuery]);

    // ─── Summary Metrics ────────────────────────────────────────────────────────
    const latestPayslip = payslips.length > 0 ? payslips[0] : null;
    const latestNetPay = latestPayslip
        ? Number(latestPayslip.total_payable_amount || latestPayslip.net_salary || 0)
        : 0;

    return (
        <>
            <Head>
                <title>My Payslips - HRMS</title>
            </Head>

            <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 text-slate-800">
                {/* ── Breadcrumb & Top Navigation ────────────────────────────────────── */}
                <div className="mx-auto mb-6 print:hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
                                Dashboard
                            </Link>
                            <span>/</span>
                            <span className="text-slate-800 font-semibold">My Payslips</span>
                        </div>

                        <button
                            type="button"
                            onClick={fetchPayslips}
                            title="Refresh statements"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {/* ── Page Header Banner ─────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                        My Payslips
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-500">
                                        View and download your official monthly salary disbursement statements.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Metrics Strip */}
                        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 md:pb-0">
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 min-w-[130px]">
                                <span className="text-[11px] text-slate-500 font-medium block">
                                    Disbursed Slips
                                </span>
                                <span className="text-base font-bold text-slate-900">
                                    {payslips.length} {payslips.length === 1 ? "Slip" : "Slips"}
                                </span>
                            </div>

                            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-2.5 min-w-[140px]">
                                <span className="text-[11px] text-emerald-700 font-medium block">
                                    Latest Period
                                </span>
                                <span className="text-base font-bold text-emerald-950 truncate block">
                                    {latestPayslip?.period_name || "--"}
                                </span>
                            </div>

                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-2.5 min-w-[150px]">
                                <span className="text-[11px] text-indigo-700 font-medium block">
                                    Latest Net Pay
                                </span>
                                <span className="text-base font-extrabold text-indigo-950 block">
                                    {latestNetPay > 0 ? formatCurrency(latestNetPay) : "--"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Search & Batch Expand Toolbar ──────────────────────────────── */}
                    {payslips.length > 0 && (
                        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search by pay period or date..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 justify-end text-xs">
                                <button
                                    type="button"
                                    onClick={handleExpandAll}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                    Expand All
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCollapseAll}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                    Collapse All
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Main Content Container ────────────────────────────────────────── */}
                <div className="mx-auto space-y-5">
                    {/* Loading State Skeleton */}
                    {loading && (
                        <div className="space-y-4">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs animate-pulse space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                                            <div className="space-y-1.5">
                                                <div className="w-32 h-4 bg-slate-200 rounded" />
                                                <div className="w-24 h-3 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-24 h-8 bg-slate-200 rounded-lg" />
                                            <div className="w-28 h-8 bg-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">
                                Unable to Load Payslips
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                                {error}
                            </p>
                            <button
                                type="button"
                                onClick={fetchPayslips}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Empty State: No Disbursed Payslips Found */}
                    {!loading && !error && filteredPayslips.length === 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-xs">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                                {searchQuery ? "No Matching Payslips Found" : "No Disbursed Payslips Available"}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                                {searchQuery
                                    ? `No disbursed payslips matched "${searchQuery}". Try searching with a different pay period name.`
                                    : "Only officially disbursed payslips appear here. Once payroll is processed and salary is disbursed by HR, your official salary slip and detailed breakdown will be visible."
                                }
                            </p>
                            <div className="flex gap-3 justify-center">
                                {searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                        Clear Search
                                    </button>
                                ) : (
                                    <Link
                                        href="/dashboard"
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors inline-block"
                                    >
                                        Back to Dashboard
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Payslips Accordion / Collapsible Cards ─────────────────────── */}
                    {!loading && !error && filteredPayslips.map((payroll, index) => {
                        const itemIdentifier = payroll.uid || String(payroll.id || index);
                        const isExpanded = expandedIds.has(itemIdentifier);
                        const isDownloadingThis = downloadingId === (payroll.uid || payroll.id);

                        const company = payroll.company || {};
                        const user = payroll.users || {};
                        const employeeProfile = user.employeeProfile || {};
                        const bankDetails =
                            Array.isArray(employeeProfile.bank_details) && employeeProfile.bank_details.length > 0
                                ? employeeProfile.bank_details[0]
                                : null;

                        const components = Array.isArray(payroll.components) ? payroll.components : [];
                        const earnings = components.filter((c: any) => c.component_type === "EARNING");
                        const deductions = components.filter((c: any) => c.component_type === "DEDUCTION");

                        const grossSalary = Number(payroll.gross_salary || 0);
                        const totalDeduction = Number(payroll.total_deduction || 0);
                        const netPayable = Number(payroll.total_payable_amount || payroll.net_salary || 0);

                        const earningsSum = earnings.reduce(
                            (acc: number, c: any) => acc + Number(c.component_ammount || 0),
                            0
                        );
                        const deductionsSum = deductions.reduce(
                            (acc: number, c: any) => acc + Number(c.component_ammount || 0),
                            0
                        );

                        const totalEarningsDisplay = earningsSum > 0 ? earningsSum : grossSalary;
                        const totalDeductionsDisplay = deductionsSum > 0 ? deductionsSum : totalDeduction;

                        const totalWorkingDays = payroll.total_working_days ?? 0;
                        const daysWorked = payroll.days_worked ?? 0;
                        const daysAbsent = payroll.days_absent ?? 0;
                        const overtimeHours = payroll.overtime_hours ?? 0;

                        return (
                            <div
                                key={itemIdentifier}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                            >
                                {/* ── Collapsed / Summary Row (Click to toggle) ──────────── */}
                                <div
                                    onClick={() => toggleExpand(itemIdentifier)}
                                    className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 cursor-pointer transition-colors select-none ${isExpanded ? "bg-slate-50/70 border-b border-slate-200/80" : "hover:bg-slate-50/50"
                                        }`}
                                >
                                    {/* Left: Period & Payment Date Info */}
                                    <div className="flex items-center gap-3.5 min-w-[220px]">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isExpanded
                                            ? "bg-indigo-600 text-white shadow-xs"
                                            : "bg-emerald-50 border border-emerald-100 text-emerald-700"
                                            }`}>
                                            <Calendar className="w-5 h-5" />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                                    {payroll.period_name || "Monthly Salary"}
                                                </h3>
                                                <DisbursedStatusBadge />
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Disbursed on: <span className="font-semibold text-slate-700">{formatDate(payroll.salary_payment_date)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle: Salary Key Figures Strip */}
                                    <div className="grid grid-cols-3 gap-2 sm:gap-6 text-left sm:text-center py-2 lg:py-0 border-y lg:border-y-0 border-slate-100">
                                        <div className="text-left sm:text-center">
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                                Gross Salary
                                            </span>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800">
                                                {formatCurrency(totalEarningsDisplay)}
                                            </span>
                                        </div>

                                        <div className="text-left sm:text-center">
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                                Deductions
                                            </span>
                                            <span className="text-xs sm:text-sm font-semibold text-rose-600">
                                                -{formatCurrency(totalDeductionsDisplay)}
                                            </span>
                                        </div>

                                        <div className="text-left sm:text-center">
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                                                Net Take-Home
                                            </span>
                                            <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                                                {formatCurrency(netPayable)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Actions & Expand / Collapse Toggle */}
                                    <div className="flex items-center justify-between lg:justify-end gap-2.5">
                                        <button
                                            type="button"
                                            onClick={(e) => handleDownloadPdf(payroll, e)}
                                            disabled={isDownloadingThis}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
                                            title="Download official PDF salary slip"
                                        >
                                            {isDownloadingThis ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Downloading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download PDF</span>
                                                </>
                                            )}
                                        </button>

                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                            <span>{isExpanded ? "Collapse" : "View Details"}</span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Uncollapsed / Detailed Payslip View ────────────────── */}
                                {isExpanded && (
                                    <div className="p-4 sm:p-8 bg-white border-t border-slate-100 space-y-6 animate-in fade-in-50 duration-200">
                                        {/* Decorative Top Accent */}
                                        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-full" />

                                        {/* Header: Company Details & Payslip Period */}
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-slate-200 pb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                                                        {company.name ? company.name.charAt(0).toUpperCase() : "H"}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                                            {company.name || "Enterprise Company"}
                                                        </h2>
                                                        <p className="text-xs text-slate-500 font-medium">Human Resources & Payroll</p>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-slate-600 space-y-0.5 pt-2 max-w-md">
                                                    {company.address && (
                                                        <p className="flex items-start gap-1">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                            <span>
                                                                {company.address}
                                                                {company.city ? `, ${company.city}` : ""}
                                                                {company.state ? `, ${company.state}` : ""}
                                                                {company.pinCode ? ` - ${company.pinCode}` : ""}
                                                            </span>
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5 text-slate-500">
                                                        {company.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                                {company.email}
                                                            </span>
                                                        )}
                                                        {company.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                                {company.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sm:text-right shrink-0">
                                                <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-100">
                                                    Salary Slip
                                                </span>
                                                <p className="text-lg font-extrabold text-slate-900 mt-2">
                                                    {payroll.period_name || "Monthly Salary"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Payment Date: <span className="font-semibold text-slate-700">{formatDate(payroll.salary_payment_date)}</span>
                                                </p>
                                                {payroll.uid && (
                                                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                                                        REF: {payroll.uid}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Statutory Compliance Bar */}
                                        {(company.cin || company.pan || company.gstin || company.epfoEstablishmentId || company.esicEmployerCode) && (
                                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {company.cin && (
                                                    <div>
                                                        <span className="text-slate-400 block font-medium">CIN:</span>
                                                        <span className="font-mono font-semibold text-slate-800">{company.cin}</span>
                                                    </div>
                                                )}
                                                {company.pan && (
                                                    <div>
                                                        <span className="text-slate-400 block font-medium">Company PAN:</span>
                                                        <span className="font-mono font-semibold text-slate-800">{company.pan}</span>
                                                    </div>
                                                )}
                                                {company.gstin && (
                                                    <div>
                                                        <span className="text-slate-400 block font-medium">GSTIN:</span>
                                                        <span className="font-mono font-semibold text-slate-800">{company.gstin}</span>
                                                    </div>
                                                )}
                                                {company.epfoEstablishmentId && (
                                                    <div>
                                                        <span className="text-slate-400 block font-medium">EPFO Est. ID:</span>
                                                        <span className="font-mono font-semibold text-slate-800">{company.epfoEstablishmentId}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Employee Profile & Bank Details Card */}
                                        <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-indigo-600" />
                                                    Employee Profile & Bank Account
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                                                    ID: {payroll.empid}
                                                </span>
                                            </div>

                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-500 block">Employee Name</span>
                                                    <span className="font-bold text-slate-900 text-sm">{user.name || payroll.empid}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Designation</span>
                                                    <span className="font-semibold text-slate-800">{user.position || "--"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Employment Type</span>
                                                    <span className="font-semibold text-slate-800">{user.employee_type || "Full Time"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Joining Date</span>
                                                    <span className="font-semibold text-slate-800">{formatDate(user.date_of_joining)}</span>
                                                </div>

                                                <div>
                                                    <span className="text-slate-500 block">Bank Name</span>
                                                    <span className="font-semibold text-slate-800">{bankDetails?.bank_name || "--"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Account Number</span>
                                                    <span className="font-mono font-semibold text-slate-800">
                                                        {bankDetails?.account_number
                                                            ? `•••• ${String(bankDetails.account_number).slice(-4)}`
                                                            : "--"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">IFSC Code</span>
                                                    <span className="font-mono font-semibold text-slate-800">{bankDetails?.ifsc_code || "--"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Employee PAN</span>
                                                    <span className="font-mono font-semibold text-slate-800">{employeeProfile?.pan_number || "--"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attendance & Days Worked Summary */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-center">
                                                <span className="text-[11px] font-medium text-slate-500 block">Working Days</span>
                                                <span className="text-lg font-bold text-slate-900">{totalWorkingDays}</span>
                                            </div>
                                            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100 text-center">
                                                <span className="text-[11px] font-medium text-emerald-700 block">Days Worked</span>
                                                <span className="text-lg font-bold text-emerald-900">{daysWorked}</span>
                                            </div>
                                            <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-100 text-center">
                                                <span className="text-[11px] font-medium text-rose-700 block">Days Absent / LOP</span>
                                                <span className="text-lg font-bold text-rose-900">{daysAbsent}</span>
                                            </div>
                                            <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 text-center">
                                                <span className="text-[11px] font-medium text-indigo-700 block">Overtime Hours</span>
                                                <span className="text-lg font-bold text-indigo-900">{overtimeHours} hrs</span>
                                            </div>
                                        </div>

                                        {/* Earnings & Deductions Tables (Side by Side) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Earnings Column */}
                                            <div className="rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                                                <div>
                                                    <div className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                                                        <span>Earnings Breakdown</span>
                                                        <span>Amount (INR)</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {earnings.length > 0 ? (
                                                            earnings.map((e: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors"
                                                                >
                                                                    <span className="font-medium text-slate-700">{e.component_name}</span>
                                                                    <span className="font-semibold text-slate-900">
                                                                        {formatCurrency(e.component_ammount)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                                                                <span className="font-medium text-slate-700">Gross Salary</span>
                                                                <span className="font-semibold text-slate-900">{formatCurrency(grossSalary)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900 mt-2">
                                                    <span>Total Gross Earnings</span>
                                                    <span className="text-sm font-extrabold">{formatCurrency(totalEarningsDisplay)}</span>
                                                </div>
                                            </div>

                                            {/* Deductions Column */}
                                            <div className="rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                                                <div>
                                                    <div className="px-4 py-2.5 bg-rose-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                                                        <span>Deductions Breakdown</span>
                                                        <span>Amount (INR)</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {deductions.length > 0 ? (
                                                            deductions.map((d: any, idx: number) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors"
                                                                >
                                                                    <span className="font-medium text-slate-700">{d.component_name}</span>
                                                                    <span className="font-semibold text-rose-600">
                                                                        -{formatCurrency(d.component_ammount)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                                                                <span>No deductions recorded</span>
                                                                <span>₹0.00</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="px-4 py-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs font-bold text-rose-900 mt-2">
                                                    <span>Total Deductions</span>
                                                    <span className="text-sm font-extrabold text-rose-700">
                                                        -{formatCurrency(totalDeductionsDisplay)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Net Payable Salary Banner */}
                                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div>
                                                    <span className="text-xs uppercase tracking-widest text-indigo-300 font-semibold block">
                                                        Net Payable Salary
                                                    </span>
                                                    <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                                                        {formatCurrency(netPayable)}
                                                    </div>
                                                    <p className="text-xs text-slate-300 italic mt-2">
                                                        <span className="font-medium text-indigo-200">Amount in Words: </span>
                                                        {numberToWords(netPayable)}
                                                    </p>
                                                </div>

                                                <div className="sm:text-right bg-white/10 rounded-xl p-3.5 backdrop-blur-xs border border-white/10 shrink-0">
                                                    <span className="text-[11px] text-slate-300 uppercase tracking-wider block">
                                                        Disbursement Status
                                                    </span>
                                                    <span className="text-sm font-bold text-emerald-400 uppercase mt-0.5 block">
                                                        DISBURSED
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 block mt-1">
                                                        Bank Transfer / Direct Deposit
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Signatures & Disclaimer Footer */}
                                        <div className="pt-6 border-t border-slate-200 space-y-5">
                                            <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
                                                <div>
                                                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end pb-1 font-semibold text-slate-800">
                                                        {company.name || "HR Department"}
                                                    </div>
                                                    <p className="pt-1 font-medium text-slate-500">Authorized Signatory</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-end pb-1 font-semibold text-slate-800">
                                                        {user.name || payroll.empid}
                                                    </div>
                                                    <p className="pt-1 font-medium text-slate-500">Employee Signature</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-center text-[11px] text-slate-500">
                                                <p className="font-semibold text-slate-600">
                                                    Note: This is a system-generated salary slip and does not require a physical signature.
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    For any discrepancy regarding salary computation or tax deductions, please contact the HR & Payroll desk.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom Action Controls */}
                                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(itemIdentifier)}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                            >
                                                Collapse Statement
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => handleDownloadPdf(payroll, e)}
                                                disabled={isDownloadingThis}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
                                            >
                                                {isDownloadingThis ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Preparing PDF...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Download Official PDF</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
