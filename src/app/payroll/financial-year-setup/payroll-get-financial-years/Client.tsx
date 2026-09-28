"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import Pageheader from "@/Components/PageHeader";
import SideBar from "@/Components/SideBar";
import { TableSkeleton } from "@/Components/Skeletons";
import StatusSelector from "@/Components/StatusSelector";
import getMonthName from "@/lib/monthPicker";
import { toast } from "react-toastify";
import Link from "next/link";
import {
    Building2,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    Eye,
    Filter,
    Layers,
    Lock,
    LockOpen,
    PenIcon,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react";
import { swalConfirm } from "@/utils/confirmDialog";

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

const GetFinancialYears = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [lockFilter, setLockFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const fetchFinancialYears = () => {
        setLoading(true);
        fetch("/api/payroll/financial-year")
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
                    toast.error(data.message || "Failed to fetch financial years");
                }
            })
            .catch((err) => {
                console.error("Error fetching financial years:", err);
                toast.error(err.message || "Failed to fetch financial years");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchFinancialYears();
    }, []);

    const handleStatusUpdate = async (fy: any, newStatus: string) => {
        if (!fy || fy.status === newStatus) return;

        setUpdatingId(fy.uid);
        try {
            const fyres = await fetch(`/api/payroll/periods?financial_year_id=${encodeURIComponent(fy.uid)}&status=OPEN`);
            const fyresJson = await fyres.json();

            let confirmed = true;
            if (fyresJson.success && fyresJson.count > 0) {
                console.log("fyresJson", fyresJson);
                confirmed = await swalConfirm(
                    `Are you sure you want to continue? There are ${fyresJson.count} OPEN periods already exist under this financial year.`,
                    "Change Status"
                );
            }

            if (!confirmed) return;

            const res = await fetch("/api/payroll/financial-year", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: fy.uid,
                    company_id: fy.company_id || fy.company?.uid,
                    status: newStatus,
                }),
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.message || "Failed to update financial year status");
            }

            toast.success(result.message || "Financial year status updated successfully");
            setData((prev: any[]) =>
                prev.map((item: any) =>
                    item.uid === fy.uid ? { ...item, status: newStatus } : item
                )
            );
        } catch (err: any) {
            console.error("Error updating financial year status:", err);
            toast.error(err.message || "An error occurred while updating status");
        } finally {
            setUpdatingId(null);
        }
    };

    // Filtered data based on search, status tab, and lock filter
    const filteredData = useMemo(() => {
        return data.filter((fy) => {
            // Status Tab Filter
            if (statusFilter !== "ALL" && fy.status !== statusFilter) {
                return false;
            }

            // Lock Filter
            if (lockFilter === "LOCKED" && !fy.lock) return false;
            if (lockFilter === "UNLOCKED" && fy.lock) return false;

            // Search Query
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const name = (fy.name || "").toLowerCase();
                const companyName = (fy.company?.name || "").toLowerCase();
                const uid = (fy.uid || "").toLowerCase();
                return name.includes(q) || companyName.includes(q) || uid.includes(q);
            }

            return true;
        });
    }, [data, statusFilter, lockFilter, searchQuery]);

    // Metrics for summary cards
    const totalCount = data.length;
    const activeCount = data.filter((f) => f.status === "ACTIVE").length;
    const draftCount = data.filter((f) => f.status === "DRAFT").length;
    const lockedCount = data.filter((f) => f.lock).length;

    return (
        <>
            <Head>
                <title>Manage Financial Years - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <SideBar />

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    {/* Header with Title and Create Action */}
                    <Pageheader
                        title="Manage Financial Years"
                        description="Configure, monitor, and manage corporate financial years and activation status."
                        href="/dashboard"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-4">
                        <Link
                            href="/payroll/financial-year-setup/payroll-create-financial-year"
                            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                            <Plus size={14} />
                            <span>Create Financial Year</span>
                        </Link>
                    </div>

                    {/* ========================================================= */}
                    {/* METRIC STATS OVERVIEW */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Total Financial Years
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
                                <Layers size={16} className="text-indigo-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                                Active Years
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                                Draft Years
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-amber-700">{draftCount}</span>
                                <Clock size={16} className="text-amber-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
                                Locked Years
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-red-700">{lockedCount}</span>
                                <Lock size={16} className="text-red-400" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* STATUS FILTER TABS */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-t-lg px-4 pt-3 border-b-0">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                            {[
                                { key: "ALL", label: "All Financial Years", count: totalCount, icon: CalendarDays },
                                { key: "ACTIVE", label: "Active", count: activeCount, color: "emerald" },
                                { key: "DRAFT", label: "Draft", count: draftCount, color: "amber" },
                                { key: "CLOSED", label: "Closed", count: data.filter((f) => f.status === "CLOSED").length, color: "slate" },
                            ].map((tab) => {
                                const isSelected = statusFilter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.key)}
                                        className={`
                                            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border
                                            ${isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        {tab.icon && <tab.icon size={13} />}
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
                                placeholder="Search financial year, company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                                <Filter size={13} />
                                <span>Lock State:</span>
                            </div>

                            <select
                                value={lockFilter}
                                onChange={(e) => setLockFilter(e.target.value)}
                                className="text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All States</option>
                                <option value="UNLOCKED">Unlocked Only</option>
                                <option value="LOCKED">Locked Only</option>
                            </select>

                            <button
                                type="button"
                                onClick={fetchFinancialYears}
                                title="Refresh"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* FINANCIAL YEARS DATA TABLE */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-b-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        {["#", "Financial Year", "Company", "Start Date", "End Date", "Status", "Lock State"].map((h) => (
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
                                    <TableSkeleton rows={5} columns={8} />
                                ) : filteredData.length === 0 ? (
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center">
                                                <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                <h3 className="text-[13px] font-semibold text-gray-800">
                                                    No Financial Years Found
                                                </h3>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    {searchQuery || statusFilter !== "ALL" || lockFilter !== "ALL"
                                                        ? "No financial years match your search or filter criteria. Try resetting filters."
                                                        : "You haven't set up any financial years yet."
                                                    }
                                                </p>
                                                <div className="mt-3">
                                                    <Link
                                                        href="/payroll/financial-year-setup/payroll-create-financial-year"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Create Financial Year</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredData.map((fy, index) => (
                                            <tr key={fy.uid || fy.id || index} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Index */}
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                    {String(index + 1).padStart(2, "0")}
                                                </td>

                                                {/* Financial Year Name & UID */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                            <Calendar size={13} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[12px] font-semibold text-gray-900">
                                                                {fy.name}
                                                            </div>
                                                            {fy.uid && (
                                                                <span className="text-[10px] font-mono text-gray-400">
                                                                    {fy.uid}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Company */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-800">
                                                        <Building2 size={13} className="text-gray-400" />
                                                        <span>{fy?.company?.name || "-"}</span>
                                                    </div>
                                                </td>

                                                {/* Start Date */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="text-[12px] text-gray-700">
                                                        {formatDisplayDate(fy?.start_date)}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">
                                                        {getMonthName(fy?.start_date)}
                                                    </span>
                                                </td>

                                                {/* End Date */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="text-[12px] text-gray-700">
                                                        {formatDisplayDate(fy?.end_date)}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">
                                                        {getMonthName(fy?.end_date)}
                                                    </span>
                                                </td>

                                                {/* Status Selector */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <StatusSelector
                                                        value={fy.status}
                                                        disabled={updatingId === fy.uid}
                                                        onChange={(newVal: string) => {
                                                            handleStatusUpdate(fy, newVal);
                                                        }}
                                                    />
                                                </td>

                                                {/* Lock State */}
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span
                                                        className={`
                                                            inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border
                                                            ${fy.lock
                                                                ? "bg-red-50 text-red-700 border-red-200"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            }
                                                        `}
                                                    >
                                                        {fy.lock ? <Lock size={11} className="text-red-500" /> : <LockOpen size={11} className="text-emerald-500" />}
                                                        <span>{fy.lock ? "Locked" : "Open"}</span>
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                {/* <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Link
                                                            href={`/payroll/financial-year-setup/view-financial-year/${fy.uid}`}
                                                            title="View Details"
                                                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                                        >
                                                            <Eye size={13} />
                                                        </Link>
                                                        <Link
                                                            href={`/payroll/financial-year-setup/view-financial-year/${fy.uid}/edit`}
                                                            title="Edit Financial Year"
                                                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors cursor-pointer"
                                                        >
                                                            <PenIcon size={13} />
                                                        </Link>
                                                    </div>
                                                </td> */}
                                            </tr>
                                        ))}
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

export default function ClientPageWrapper(props: any) {
    return (
        <Suspense fallback={null}>
            <GetFinancialYears {...props} />
        </Suspense>
    );
}