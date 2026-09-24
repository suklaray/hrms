"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import { TableSkeleton } from "@/Components/Skeletons";
import { toast } from "react-toastify";
import Link from "next/link";
import {
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    Filter,
    Layers,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react";

// Format date helper (UTC safe)
function formatDisplayDate(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

// Static status badge styling definitions (read-only)
const PERIOD_STATUSES = [
    { value: "OPEN", label: "Open", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { value: "PROCESSING", label: "Processing", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { value: "COMPLETED", label: "Completed", dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { value: "CLOSED", label: "Closed", dot: "bg-slate-500", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
];

function PeriodStatusBadge({ value }: { value: string }) {
    const currentStatus =
        PERIOD_STATUSES.find((s) => s.value === value) || {
            value,
            label: value || "Unknown",
            dot: "bg-gray-400",
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
        };

    return (
        <span
            className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border select-none
                ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}
            `}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
            <span>{currentStatus.label}</span>
        </span>
    );
}

function PayrollGetPeriods() {
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const [selectedFyUid, setSelectedFyUid] = useState<string>("");
    const [loadingFy, setLoadingFy] = useState(false);

    const [periods, setPeriods] = useState<any[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);

    // Filter states
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // 1. Fetch available financial years
    const fetchFinancialYears = async () => {
        setLoadingFy(true);
        try {
            const res = await fetch("/api/payroll/financial-year");
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setFinancialYears(result.data);
                if (result.data.length > 0) {
                    // Default to ACTIVE financial year, otherwise select first available
                    const activeFy = result.data.find((f: any) => f.status === "ACTIVE");
                    setSelectedFyUid(activeFy ? activeFy.uid : result.data[0].uid);
                }
            } else {
                toast.error(result.message || "Failed to load financial years");
            }
        } catch (err: any) {
            console.error("Error loading financial years:", err);
            toast.error("Failed to load financial years");
        } finally {
            setLoadingFy(false);
        }
    };

    // 2. Fetch periods strictly for the selected financial year UID
    const fetchPeriods = async (fyUid: string) => {
        if (!fyUid) {
            setPeriods([]);
            return;
        }
        setLoadingPeriods(true);
        try {
            const res = await fetch(`/api/payroll/periods?financial_year_id=${encodeURIComponent(fyUid)}`);
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setPeriods(result.data);
            } else {
                setPeriods([]);
                toast.error(result.message || "Failed to fetch payroll periods");
            }
        } catch (err: any) {
            console.error("Error fetching payroll periods:", err);
            setPeriods([]);
            toast.error(err.message || "An error occurred while fetching payroll periods");
        } finally {
            setLoadingPeriods(false);
        }
    };

    useEffect(() => {
        fetchFinancialYears();
    }, []);

    useEffect(() => {
        if (selectedFyUid) {
            fetchPeriods(selectedFyUid);
        } else {
            setPeriods([]);
        }
    }, [selectedFyUid]);

    // Active selected financial year object
    const selectedFy = useMemo(() => {
        return financialYears.find((fy) => fy.uid === selectedFyUid);
    }, [financialYears, selectedFyUid]);

    // Filtered data based on search and status filter
    const filteredPeriods = useMemo(() => {
        return periods.filter((p) => {
            // Status Filter
            if (selectedStatusFilter !== "ALL" && p.status !== selectedStatusFilter) {
                return false;
            }

            // Search Filter
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const periodName = (p.period_name || "").toLowerCase();
                const cycle = (p.payroll_configuration?.payroll_cycle || "").toLowerCase();
                return periodName.includes(q) || cycle.includes(q);
            }

            return true;
        });
    }, [periods, selectedStatusFilter, searchQuery]);

    // Metrics for summary cards (based on selected FY's periods)
    const totalPeriodsCount = periods.length;
    const openCount = periods.filter((p) => p.status === "OPEN").length;
    const processingCount = periods.filter((p) => p.status === "PROCESSING").length;
    const completedCount = periods.filter((p) => p.status === "COMPLETED" || p.status === "CLOSED").length;

    return (
        <>
            <Head>
                <title>Manage Payroll Periods - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <SideBar />

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Manage Payroll Periods"
                        description="View and monitor official payroll periods generated for each financial year."
                        href="/dashboard"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-4">
                        <Link
                            href="/payroll/payroll-setup/payroll-create-periods"
                            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                            <Plus size={14} />
                            <span>Generate Periods</span>
                        </Link>
                    </div>

                    {/* ========================================================= */}
                    {/* METRIC STATS OVERVIEW FOR SELECTED FY */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Total Periods
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-gray-900">{totalPeriodsCount}</span>
                                <Layers size={16} className="text-indigo-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                                Open Periods
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-emerald-700">{openCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                                Processing
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-blue-700">{processingCount}</span>
                                <Clock size={16} className="text-blue-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
                                Completed / Closed
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-purple-700">{completedCount}</span>
                                <CheckCircle2 size={16} className="text-purple-400" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* FINANCIAL YEAR TABS (STYLE MATCHING IMAGE 2) */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-t-lg px-4 pt-3 border-b-0">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                            {loadingFy ? (
                                <div className="flex items-center gap-2 animate-pulse">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 w-28 bg-gray-100 rounded-md" />
                                    ))}
                                </div>
                            ) : financialYears.length === 0 ? (
                                <div className="text-[12px] text-gray-500 py-1">
                                    No Financial Years found.{" "}
                                    <Link
                                        href="/payroll/financial-year-setup/payroll-create-financial-year"
                                        className="text-indigo-600 font-semibold hover:underline"
                                    >
                                        Create one
                                    </Link>
                                </div>
                            ) : (
                                financialYears.map((fy) => {
                                    const isSelected = fy.uid === selectedFyUid;
                                    return (
                                        <button
                                            key={fy.uid}
                                            type="button"
                                            onClick={() => setSelectedFyUid(fy.uid)}
                                            className={`
                                                inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border
                                                ${isSelected
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                }
                                            `}
                                        >
                                            <span>{fy.name}</span>
                                            {fy.status && (
                                                <span
                                                    className={`
                                                        px-1.5 py-0.2 rounded-full text-[10px] font-medium
                                                        ${isSelected
                                                            ? "bg-indigo-800 text-indigo-100"
                                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                                        }
                                                    `}
                                                >
                                                    {fy.status}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SEARCH & FILTERS TOOLBAR (STYLE MATCHING IMAGE 2) */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search period name or cycle..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                                <Filter size={13} />
                                <span>Status:</span>
                            </div>

                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                className="text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="OPEN">Open</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CLOSED">Closed</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => fetchPeriods(selectedFyUid)}
                                title="Refresh periods"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={loadingPeriods ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* PERIODS TABLE / FALLBACK DISPLAY */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-b-lg overflow-hidden border-t-0 mb-8">
                        {loadingPeriods ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {["#", "Period Name", "Start Date", "End Date", "Salary Payment", "Cycle", "Status"].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <TableSkeleton rows={6} columns={7} />
                            </table>
                        ) : periods.length === 0 ? (
                            /* FALLBACK EMPTY STATE IF NO PERIODS GENERATED FOR THIS FY */
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3.5">
                                    <CalendarDays className="w-7 h-7" />
                                </div>
                                <h3 className="text-[15px] font-bold text-gray-900">
                                    No Payroll Periods Generated for {selectedFy?.name || "Selected Financial Year"}
                                </h3>
                                <p className="text-[12px] text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                                    There are currently no payroll periods generated for {selectedFy?.name || "this financial year"}
                                    {selectedFy?.start_date && selectedFy?.end_date ? ` (${formatDisplayDate(selectedFy.start_date)} to ${formatDisplayDate(selectedFy.end_date)})` : ""}.
                                    Generate them automatically using your active payroll configuration.
                                </p>
                                <div className="mt-5">
                                    <Link
                                        href="/payroll/payroll-setup/payroll-create-periods"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        <span>Generate Periods for {selectedFy?.name || "this FY"}</span>
                                    </Link>
                                </div>
                            </div>
                        ) : filteredPeriods.length === 0 ? (
                            /* FALLBACK IF FILTER MATCHES NOTHING */
                            <div className="p-10 text-center">
                                <Search className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                <h4 className="text-[13px] font-semibold text-gray-800">No Matching Periods</h4>
                                <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">
                                    No periods match "{searchQuery}" {selectedStatusFilter !== "ALL" ? `with status ${selectedStatusFilter}` : ""}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedStatusFilter("ALL");
                                    }}
                                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-semibold rounded-md transition-colors cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            /* PERIODS TABLE WITH READ-ONLY STATUS BADGES */
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50/70">
                                        <tr>
                                            {["#", "Period Name", "Start Date", "End Date", "Salary Payment", "Cycle", "Status"].map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredPeriods.map((period, index) => {
                                            const cycle = period.payroll_configuration?.payroll_cycle || "MONTHLY";

                                            return (
                                                <tr
                                                    key={period.uid || period.id || index}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="text-[12px] font-semibold text-gray-900 flex items-center gap-2">
                                                            <Calendar size={13} className="text-indigo-500 shrink-0" />
                                                            <span>{period.period_name}</span>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-700">
                                                        {formatDisplayDate(period.period_start)}
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-700">
                                                        {formatDisplayDate(period.period_end)}
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                            <Clock size={11} />
                                                            {formatDisplayDate(period.salary_payment_date)}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <span
                                                            className={`
                                                                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                                ${cycle === "MONTHLY"
                                                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                                    : cycle === "WEEKLY"
                                                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                                        : "bg-teal-50 text-teal-700 border border-teal-200"
                                                                }
                                                            `}
                                                        >
                                                            {cycle}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <PeriodStatusBadge value={period.status} />
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
            </div>
        </>
    );
}

export default function ClientPageWrapper(props: any) {
    return (
        <Suspense fallback={null}>
            <PayrollGetPeriods {...props} />
        </Suspense>
    );
}
