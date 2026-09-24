"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import { TableSkeleton } from "@/Components/Skeletons";
import { getOrdinal } from "@/lib/getNumberordinal";
import { swalConfirm } from "@/utils/confirmDialog";
import { toast } from "react-toastify";
import Link from "next/link";
import {
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Coins,
    Eye,
    Filter,
    Globe,
    Layers,
    PenIcon,
    Plus,
    RefreshCw,
    Search,
    Sliders,
    X,
} from "lucide-react";

const PayrollGetConfigs = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | number | null>(null);

    // Filter & Search states
    const [cycleFilter, setCycleFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const fetchConfigs = () => {
        setLoading(true);
        fetch("/api/payroll/configurations")
            .then(async (res) => {
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || `Request failed with status ${res.status}`);
                }
                return result;
            })
            .then((data) => {
                if (data.success) {
                    setData(data.data || []);
                } else {
                    toast.error(data.message || "Failed to fetch payroll configurations");
                }
            })
            .catch((err) => {
                console.error("Error fetching payroll configurations:", err);
                toast.error(err.message || "Failed to fetch payroll configurations");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    // Handle status toggle with confirmation
    const handleStatusToggle = async (uid: string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        const res = await fetch(`/api/payroll/periods?payroll_configuration_id=${encodeURIComponent(uid)}&status=OPEN`);
        const data = await res.json();

        console.log("Data:", data)

        let confirmed = true;
        if (newStatus === "INACTIVE" && data.success && data.count > 0) {
            confirmed = await swalConfirm(
                `Are you sure you want to deactivate this payroll configuration? There are ${data.count} OPEN periods already exist under this configuration.`,
                "Deactivate"
            );
        }
        if (!confirmed) return;

        setTogglingId(uid);
        try {
            const res = await fetch("/api/payroll/configuration", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid, id: uid, status: newStatus }),
            });
            const result = await res.json();

            if (result.success) {
                toast.success(`Configuration marked as ${newStatus}`);
                setData((prev) =>
                    prev.map((c) => (c.uid === uid || c.id === uid ? { ...c, status: newStatus } : c))
                );
            } else {
                toast.error(result.message || "Failed to update status");
            }
        } catch (err) {
            toast.error("An error occurred while updating status");
        } finally {
            setTogglingId(null);
        }
    };

    // Filtered configurations
    const filteredData = useMemo(() => {
        return data.filter((config) => {
            // Cycle Filter
            if (cycleFilter !== "ALL" && config.payroll_cycle !== cycleFilter) {
                return false;
            }

            // Status Filter
            if (statusFilter !== "ALL" && config.status !== statusFilter) {
                return false;
            }

            // Search Filter
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const companyName = (config.company?.name || "").toLowerCase();
                const country = (config.payroll_country || "").toLowerCase();
                const currency = (config.currency || "").toLowerCase();
                const cycle = (config.payroll_cycle || "").toLowerCase();
                const fyName = (config.financial_year?.name || "").toLowerCase();
                const uid = (config.uid || "").toLowerCase();
                return (
                    companyName.includes(q) ||
                    country.includes(q) ||
                    currency.includes(q) ||
                    cycle.includes(q) ||
                    fyName.includes(q) ||
                    uid.includes(q)
                );
            }

            return true;
        });
    }, [data, cycleFilter, statusFilter, searchQuery]);

    // Metrics for summary cards
    const totalCount = data.length;
    const activeCount = data.filter((c) => c.status === "ACTIVE").length;
    const inactiveCount = data.filter((c) => c.status !== "ACTIVE").length;
    const monthlyCount = data.filter((c) => c.payroll_cycle === "MONTHLY").length;
    const weeklyCount = data.filter((c) => c.payroll_cycle === "WEEKLY").length;
    const biWeeklyCount = data.filter((c) => c.payroll_cycle === "BI_WEEKLY").length;

    return (
        <>
            <Head>
                <title>Manage Payroll Configurations - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <SideBar />

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    {/* Header with Title and Create Action */}
                    <Pageheader
                        title="Manage Configurations"
                        description="Configure payroll cycle rules, cut-off parameters, currency, and payment schedules."
                        href="/dashboard"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-4">
                        <Link
                            href="/payroll/payroll-setup/payroll-create-config"
                            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                            <Plus size={14} />
                            <span>Create Configuration</span>
                        </Link>
                    </div>

                    {/* ========================================================= */}
                    {/* METRIC STATS OVERVIEW */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Total Configurations
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
                                <Sliders size={16} className="text-indigo-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                                Active Configurations
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
                                Inactive / Draft
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-red-700">{inactiveCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
                                Monthly Cycles
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-purple-700">{monthlyCount}</span>
                                <Calendar size={16} className="text-purple-400" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* CYCLE FILTER TABS */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-t-lg px-4 pt-3 border-b-0">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                            {[
                                { key: "ALL", label: "All Configurations", count: totalCount },
                                { key: "MONTHLY", label: "Monthly", count: monthlyCount },
                                { key: "WEEKLY", label: "Weekly", count: weeklyCount },
                                { key: "BI_WEEKLY", label: "Bi-Weekly", count: biWeeklyCount },
                            ].map((tab) => {
                                const isSelected = cycleFilter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setCycleFilter(tab.key)}
                                        className={`
                                            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border
                                            ${isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`
                                                px-1.5 py-0.2 rounded-full text-[10px] font-medium
                                                ${isSelected
                                                    ? "bg-indigo-800 text-indigo-100"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                                }
                                            `}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SEARCH & FILTERS TOOLBAR */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search company, country, cycle, FY..."
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
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="INACTIVE">Inactive Only</option>
                            </select>

                            <button
                                type="button"
                                onClick={fetchConfigs}
                                title="Refresh"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* CONFIGURATIONS DATA TABLE */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-b-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        {["#", "Company", "Region & Currency", "Payroll Cycle", "Salary Payment", "Financial Year", "Status", "Approval", "Actions"].map((h) => (
                                            <th
                                                key={h}
                                                className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                {loading ? (
                                    <TableSkeleton rows={5} columns={9} />
                                ) : filteredData.length === 0 ? (
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center">
                                                <Sliders className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                <h3 className="text-[13px] font-semibold text-gray-800">
                                                    No Configurations Found
                                                </h3>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    {searchQuery || cycleFilter !== "ALL" || statusFilter !== "ALL"
                                                        ? "No configurations match your search or filter criteria. Try resetting filters."
                                                        : "You haven't created any payroll configurations yet."
                                                    }
                                                </p>
                                                <div className="mt-3">
                                                    <Link
                                                        href="/payroll/payroll-setup/payroll-create-config"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Create Configuration</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredData.map((config, index) => {
                                            const cycle = config.payroll_cycle;

                                            return (
                                                <tr key={config.uid || index} className="hover:bg-slate-50/70 transition-colors">
                                                    {/* Index */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </td>

                                                    {/* Company */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                                <Building2 size={13} />
                                                            </div>
                                                            <div>
                                                                <div className="text-[12px] font-semibold text-gray-900">
                                                                    {config.company?.name || "-"}
                                                                </div>
                                                                {config.uid && (
                                                                    <span className="text-[10px] font-mono text-gray-400">
                                                                        {config.uid}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Region & Currency */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[12px] text-gray-700 font-medium">
                                                                {config.payroll_country}
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                {config.currency}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Payroll Cycle */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <span
                                                            className={`
                                                                px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                                ${cycle === "MONTHLY"
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                    : cycle === "WEEKLY"
                                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                        : "bg-teal-50 text-teal-700 border-teal-200"
                                                                }
                                                            `}
                                                        >
                                                            {cycle}
                                                        </span>
                                                    </td>

                                                    {/* Salary Date */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                                                            <Clock size={11} />
                                                            Every {getOrdinal(config.salary_payment_date)}
                                                        </span>
                                                    </td>

                                                    {/* Financial Year */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-[12px] text-gray-800 font-medium">
                                                            <Calendar size={13} className="text-gray-400" />
                                                            <span>{config.financial_year?.name || "-"}</span>
                                                        </div>
                                                    </td>

                                                    {/* Status Toggle Switch */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            disabled={togglingId === config.uid}
                                                            onClick={() => handleStatusToggle(config.uid, config.status)}
                                                            className={`
                                                                relative w-[50px] h-[25px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner
                                                                ${config.status === "ACTIVE" ? "bg-[#78c267]" : "bg-[#ef3519]"}
                                                                ${togglingId === config.uid ? "opacity-50 cursor-wait" : ""}
                                                            `}
                                                        >
                                                            {/* Status Icon */}
                                                            <span
                                                                className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${config.status === "ACTIVE" ? "left-2" : "right-2"
                                                                    }`}
                                                            >
                                                                {config.status === "ACTIVE" ? (
                                                                    <Check size={12} strokeWidth={3} />
                                                                ) : (
                                                                    <X size={12} strokeWidth={3} />
                                                                )}
                                                            </span>

                                                            {/* White Toggle Knob */}
                                                            <span
                                                                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${config.status === "ACTIVE" ? "right-1" : "left-1"
                                                                    }`}
                                                            />
                                                        </button>
                                                    </td>

                                                    {/* Approval */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        {config.approval === "YES" ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Approved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link
                                                                href={`/payroll/payroll-setup/view-config/${config.uid}`}
                                                                title="View Details"
                                                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                                            >
                                                                <Eye size={13} />
                                                            </Link>
                                                            <Link
                                                                href={`/payroll/payroll-setup/view-config/${config.uid}/edit`}
                                                                title="Edit Configuration"
                                                                className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors cursor-pointer"
                                                            >
                                                                <PenIcon size={13} />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default function PageWrapper(props: any) {
    return (
        <Suspense fallback={null}>
            <PayrollGetConfigs {...props} />
        </Suspense>
    );
}
