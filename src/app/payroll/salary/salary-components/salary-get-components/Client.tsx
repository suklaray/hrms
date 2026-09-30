"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import Pageheader from "@/Components/PageHeader";
import { TableSkeleton } from "@/Components/Skeletons";
import { swalConfirm } from "@/utils/confirmDialog";
import { toast } from "react-toastify";
import Link from "next/link";
import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Building2,
    Calculator,
    Calendar,
    Check,
    CheckCircle2,
    Eye,
    FileText,
    Filter,
    PenIcon,
    Percent,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Sliders,
    X,
} from "lucide-react";

interface SalaryComponent {
    id: number;
    uid: string;
    company_id: string;
    company?: {
        id: number;
        uid: string;
        name: string;
    };
    name: string;
    code: string;
    type: "EARNING" | "DEDUCTION";
    calculation_type: "FIXED" | "PERCENTAGE" | "FORMULA";
    taxable: boolean;
    statutory: boolean;
    active: boolean;
    formula?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export default function SalaryGetComponentsClient() {
    const [data, setData] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(false);
    const [togglingUid, setTogglingUid] = useState<string | null>(null);

    // Filters & Search
    const [typeFilter, setTypeFilter] = useState<string>("ALL"); // "ALL" | "EARNING" | "DEDUCTION"
    const [statusFilter, setStatusFilter] = useState<string>("ALL"); // "ALL" | "ACTIVE" | "INACTIVE"
    const [calcFilter, setCalcFilter] = useState<string>("ALL"); // "ALL" | "FIXED" | "PERCENTAGE" | "FORMULA"
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modals
    const [viewingComponent, setViewingComponent] = useState<SalaryComponent | null>(null);
    const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
    const [editSaving, setEditSaving] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        uid: "",
        name: "",
        code: "",
        type: "EARNING" as "EARNING" | "DEDUCTION",
        calculation_type: "FIXED" as "FIXED" | "PERCENTAGE" | "FORMULA",
        formula: "",
        taxable: false,
        statutory: false,
        active: true,
    });

    const fetchComponents = () => {
        setLoading(true);
        fetch("/api/payroll/salary/components")
            .then(async (res) => {
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || `Request failed with status ${res.status}`);
                }
                return result;
            })
            .then((resData) => {
                if (resData.success) {
                    setData(resData.salaryComponents || []);
                } else {
                    toast.error(resData.message || "Failed to fetch salary components");
                }
            })
            .catch((err) => {
                console.error("Error fetching salary components:", err);
                toast.error(err.message || "Failed to fetch salary components");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchComponents();
    }, []);

    // Handle Quick Status Toggle
    const handleStatusToggle = async (comp: SalaryComponent) => {
        const nextActive = !comp.active;

        if (comp.active) {
            const confirmed = await swalConfirm(
                `Are you sure you want to deactivate "${comp.name}"? It will no longer be available in new salary structures.`,
                "Deactivate"
            );
            if (!confirmed) return;
        }

        setTogglingUid(comp.uid);
        try {
            const res = await fetch("/api/payroll/salary/component", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: comp.uid,
                    active: nextActive,
                }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success(
                    `Component "${comp.name}" marked as ${nextActive ? "Active" : "Inactive"}`
                );
                setData((prev) =>
                    prev.map((c) => (c.uid === comp.uid ? { ...c, active: nextActive } : c))
                );
                if (viewingComponent && viewingComponent.uid === comp.uid) {
                    setViewingComponent((prev) => (prev ? { ...prev, active: nextActive } : null));
                }
            } else {
                toast.error(result.message || "Failed to update component status");
            }
        } catch (err: any) {
            console.error("Error updating status:", err);
            toast.error(err?.message || "An error occurred while updating status");
        } finally {
            setTogglingUid(null);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (comp: SalaryComponent) => {
        setEditForm({
            uid: comp.uid,
            name: comp.name || "",
            code: comp.code || "",
            type: comp.type || "EARNING",
            calculation_type: comp.calculation_type || "FIXED",
            formula: comp.formula || "",
            taxable: Boolean(comp.taxable),
            statutory: Boolean(comp.statutory),
            active: Boolean(comp.active),
        });
        setEditingComponent(comp);
    };

    // Save Edit Form
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editForm.name.trim()) {
            toast.error("Component name is required");
            return;
        }
        if (!editForm.code.trim()) {
            toast.error("Component code is required");
            return;
        }
        if (
            (editForm.calculation_type === "PERCENTAGE" || editForm.calculation_type === "FORMULA") &&
            !editForm.formula.trim()
        ) {
            toast.error(`Formula is required for ${editForm.calculation_type} calculation`);
            return;
        }

        setEditSaving(true);
        try {
            const payload = {
                uid: editForm.uid,
                name: editForm.name.trim(),
                code: editForm.code.trim().toUpperCase(),
                type: editForm.type,
                calculation_type: editForm.calculation_type,
                formula: editForm.formula.trim() || null,
                taxable: Boolean(editForm.taxable),
                statutory: Boolean(editForm.statutory),
                active: Boolean(editForm.active),
            };

            const res = await fetch("/api/payroll/salary/component", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success("Salary component updated successfully");
                setData((prev) =>
                    prev.map((c) =>
                        c.uid === editForm.uid
                            ? {
                                  ...c,
                                  ...payload,
                                  company: c.company,
                                  updatedAt: new Date().toISOString(),
                              }
                            : c
                    )
                );
                if (viewingComponent && viewingComponent.uid === editForm.uid) {
                    setViewingComponent((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  ...payload,
                                  company: prev.company,
                                  updatedAt: new Date().toISOString(),
                              }
                            : null
                    );
                }
                setEditingComponent(null);
            } else {
                toast.error(result.message || "Failed to update salary component");
            }
        } catch (err: any) {
            console.error("Error saving salary component:", err);
            toast.error(err?.message || "An unexpected error occurred");
        } finally {
            setEditSaving(false);
        }
    };

    // Filtered data calculation
    const filteredData = useMemo(() => {
        return data.filter((comp) => {
            // Type Filter
            if (typeFilter !== "ALL" && comp.type !== typeFilter) {
                return false;
            }

            // Status Filter
            if (statusFilter === "ACTIVE" && !comp.active) {
                return false;
            }
            if (statusFilter === "INACTIVE" && comp.active) {
                return false;
            }

            // Calculation Type Filter
            if (calcFilter !== "ALL" && comp.calculation_type !== calcFilter) {
                return false;
            }

            // Search Query
            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const name = (comp.name || "").toLowerCase();
                const code = (comp.code || "").toLowerCase();
                const companyName = (comp.company?.name || "").toLowerCase();
                const formula = (comp.formula || "").toLowerCase();
                const uid = (comp.uid || "").toLowerCase();

                return (
                    name.includes(q) ||
                    code.includes(q) ||
                    companyName.includes(q) ||
                    formula.includes(q) ||
                    uid.includes(q)
                );
            }

            return true;
        });
    }, [data, typeFilter, statusFilter, calcFilter, searchQuery]);

    // Metric counters
    const totalCount = data.length;
    const activeCount = data.filter((c) => c.active).length;
    const earningsCount = data.filter((c) => c.type === "EARNING").length;
    const deductionsCount = data.filter((c) => c.type === "DEDUCTION").length;

    const formatDate = (isoString?: string) => {
        if (!isoString) return "-";
        try {
            return new Date(isoString).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return isoString;
        }
    };

    return (
        <>
            <Head>
                <title>Manage Salary Components - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    {/* Header */}
                    <Pageheader
                        title="Manage Salary Components"
                        description="Configure earnings, deductions, calculation rules, taxability, and statutory compliance."
                        href="/dashboard"
                    />

                    {/* Top Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-4">
                        <Link
                            href="/payroll/salary/salary-components/salary-create-component"
                            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                            <Plus size={14} />
                            <span>Create Component</span>
                        </Link>
                    </div>

                    {/* ========================================================= */}
                    {/* METRIC STATS OVERVIEW */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Total Components
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
                                <Banknote size={16} className="text-indigo-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                                Active Components
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
                                Total Earnings
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-indigo-700">{earningsCount}</span>
                                <ArrowUpRight size={16} className="text-indigo-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                                Total Deductions
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-amber-700">{deductionsCount}</span>
                                <ArrowDownRight size={16} className="text-amber-500" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* TYPE FILTER TABS */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-t-lg px-4 pt-3 border-b-0">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                            {[
                                { key: "ALL", label: "All Components", count: totalCount },
                                { key: "EARNING", label: "Earnings", count: earningsCount },
                                { key: "DEDUCTION", label: "Deductions", count: deductionsCount },
                            ].map((tab) => {
                                const isSelected = typeFilter === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setTypeFilter(tab.key)}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border ${
                                            isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                                                isSelected
                                                    ? "bg-indigo-800 text-indigo-100"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                            }`}
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
                                placeholder="Search component, code, company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
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

                            <select
                                value={calcFilter}
                                onChange={(e) => setCalcFilter(e.target.value)}
                                className="text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Calculations</option>
                                <option value="FIXED">Fixed</option>
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FORMULA">Formula</option>
                            </select>

                            <button
                                type="button"
                                onClick={fetchComponents}
                                title="Refresh"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* SALARY COMPONENTS DATA TABLE */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-b-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        {[
                                            "#",
                                            "Component Name",
                                            "Code",
                                            "Company",
                                            "Type",
                                            "Calculation",
                                            "Taxable",
                                            "Statutory",
                                            "Status",
                                            "Actions",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                {loading ? (
                                    <TableSkeleton rows={5} columns={10} />
                                ) : filteredData.length === 0 ? (
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center">
                                                <Banknote className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                <h3 className="text-[13px] font-semibold text-gray-800">
                                                    No Salary Components Found
                                                </h3>
                                                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                                                    {searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL" || calcFilter !== "ALL"
                                                        ? "No components match your search or filter criteria. Try resetting filters."
                                                        : "You haven't defined any salary components yet."}
                                                </p>
                                                <div className="mt-3">
                                                    <Link
                                                        href="/payroll/salary/salary-components/salary-create-component"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Create Component</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {filteredData.map((comp, index) => {
                                            const isEarning = comp.type === "EARNING";

                                            return (
                                                <tr
                                                    key={comp.uid || index}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    {/* Index */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </td>

                                                    {/* Component Name */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                                                                    isEarning
                                                                        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                                        : "bg-amber-50 border-amber-100 text-amber-600"
                                                                }`}
                                                            >
                                                                {isEarning ? (
                                                                    <ArrowUpRight size={14} />
                                                                ) : (
                                                                    <ArrowDownRight size={14} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-[12px] font-semibold text-gray-900">
                                                                    {comp.name}
                                                                </div>
                                                                <span className="text-[10px] font-mono text-gray-400">
                                                                    {comp.uid}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Code */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                            {comp.code}
                                                        </span>
                                                    </td>

                                                    {/* Company */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-[12px] text-gray-700">
                                                            <Building2 size={13} className="text-gray-400 shrink-0" />
                                                            <span className="truncate max-w-[150px]">
                                                                {comp.company?.name || comp.company_id || "-"}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                                isEarning
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}
                                                        >
                                                            {comp.type}
                                                        </span>
                                                    </td>

                                                    {/* Calculation */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                                                                {comp.calculation_type === "PERCENTAGE" ? (
                                                                    <Percent size={11} className="text-indigo-500" />
                                                                ) : comp.calculation_type === "FORMULA" ? (
                                                                    <Calculator size={11} className="text-purple-500" />
                                                                ) : (
                                                                    <FileText size={11} className="text-gray-400" />
                                                                )}
                                                                {comp.calculation_type}
                                                            </span>
                                                            {comp.formula && (
                                                                <span
                                                                    title={comp.formula}
                                                                    className="text-[10px] font-mono text-gray-500 truncate max-w-[120px]"
                                                                >
                                                                    {comp.formula}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Taxable */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                comp.taxable
                                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                                            }`}
                                                        >
                                                            {comp.taxable ? "Yes" : "No"}
                                                        </span>
                                                    </td>

                                                    {/* Statutory */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                comp.statutory
                                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                                            }`}
                                                        >
                                                            {comp.statutory ? "Yes" : "No"}
                                                        </span>
                                                    </td>

                                                    {/* Status Toggle Switch */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            title={comp.active ? "Click to deactivate" : "Click to activate"}
                                                            disabled={togglingUid === comp.uid}
                                                            onClick={() => handleStatusToggle(comp)}
                                                            className={`relative w-[50px] h-[25px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner ${
                                                                comp.active ? "bg-[#78c267]" : "bg-[#ef3519]"
                                                            } ${togglingUid === comp.uid ? "opacity-50 cursor-wait" : ""}`}
                                                        >
                                                            {/* Status Icon */}
                                                            <span
                                                                className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${
                                                                    comp.active ? "left-2" : "right-2"
                                                                }`}
                                                            >
                                                                {comp.active ? (
                                                                    <Check size={12} strokeWidth={3} />
                                                                ) : (
                                                                    <X size={12} strokeWidth={3} />
                                                                )}
                                                            </span>

                                                            {/* White Toggle Knob */}
                                                            <span
                                                                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                                                    comp.active ? "right-1" : "left-1"
                                                                }`}
                                                            />
                                                        </button>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewingComponent(comp)}
                                                                title="View Details"
                                                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(comp)}
                                                                title="Edit Component"
                                                                className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors cursor-pointer"
                                                            >
                                                                <PenIcon size={13} />
                                                            </button>
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

                    {/* ========================================================= */}
                    {/* VIEW DETAILS MODAL */}
                    {/* ========================================================= */}
                    {viewingComponent && (
                        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                viewingComponent.type === "EARNING"
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-amber-500 text-white"
                                            }`}
                                        >
                                            {viewingComponent.type === "EARNING" ? (
                                                <ArrowUpRight size={16} />
                                            ) : (
                                                <ArrowDownRight size={16} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-gray-900">
                                                {viewingComponent.name}
                                            </h3>
                                            <span className="text-[11px] font-mono text-gray-400">
                                                {viewingComponent.uid}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setViewingComponent(null)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Code
                                            </span>
                                            <span className="text-[13px] font-bold font-mono text-gray-800">
                                                {viewingComponent.code}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Company
                                            </span>
                                            <span className="text-[13px] font-semibold text-gray-800 truncate block">
                                                {viewingComponent.company?.name || viewingComponent.company_id || "-"}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Type
                                            </span>
                                            <span
                                                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                                                    viewingComponent.type === "EARNING"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {viewingComponent.type}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Calculation Type
                                            </span>
                                            <span className="text-[12px] font-bold text-gray-800">
                                                {viewingComponent.calculation_type}
                                            </span>
                                        </div>
                                    </div>

                                    {viewingComponent.formula && (
                                        <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                                            <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">
                                                Formula / Expression
                                            </span>
                                            <span className="text-[12px] font-mono text-indigo-900 font-medium">
                                                {viewingComponent.formula}
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 border border-gray-200 rounded-lg text-center">
                                            <span className="text-[10px] text-gray-500 block">Taxable</span>
                                            <span
                                                className={`text-[12px] font-bold ${
                                                    viewingComponent.taxable ? "text-blue-600" : "text-gray-400"
                                                }`}
                                            >
                                                {viewingComponent.taxable ? "Yes" : "No"}
                                            </span>
                                        </div>

                                        <div className="p-3 border border-gray-200 rounded-lg text-center">
                                            <span className="text-[10px] text-gray-500 block">Statutory</span>
                                            <span
                                                className={`text-[12px] font-bold ${
                                                    viewingComponent.statutory ? "text-purple-600" : "text-gray-400"
                                                }`}
                                            >
                                                {viewingComponent.statutory ? "Yes" : "No"}
                                            </span>
                                        </div>

                                        <div className="p-3 border border-gray-200 rounded-lg text-center">
                                            <span className="text-[10px] text-gray-500 block">Status</span>
                                            <span
                                                className={`text-[12px] font-bold ${
                                                    viewingComponent.active ? "text-emerald-600" : "text-red-500"
                                                }`}
                                            >
                                                {viewingComponent.active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-100">
                                        <span>Created: {formatDate(viewingComponent.createdAt)}</span>
                                        <span>Updated: {formatDate(viewingComponent.updatedAt)}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const comp = viewingComponent;
                                            setViewingComponent(null);
                                            handleOpenEdit(comp);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                    >
                                        <PenIcon size={12} />
                                        <span>Edit Component</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewingComponent(null)}
                                        className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-[12px] font-semibold rounded-md transition-colors cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* EDIT COMPONENT MODAL */}
                    {/* ========================================================= */}
                    {editingComponent && (
                        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                            <PenIcon size={13} />
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-gray-900">
                                                Edit Salary Component
                                            </h3>
                                            <p className="text-[11px] text-gray-500">
                                                Update name, code, calculation type, and parameters
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditingComponent(null)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSaveEdit}>
                                    <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Component Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) =>
                                                    setEditForm((p) => ({ ...p, name: e.target.value }))
                                                }
                                                className="w-full h-[36px] border border-gray-300 rounded-md px-3 text-[12px] text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>

                                        {/* Code */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Component Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.code}
                                                onChange={(e) =>
                                                    setEditForm((p) => ({
                                                        ...p,
                                                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                                                    }))
                                                }
                                                className="w-full h-[36px] font-mono border border-gray-300 rounded-md px-3 text-[12px] text-gray-800 uppercase focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>

                                        {/* Type */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Component Type <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm((p) => ({ ...p, type: "EARNING" }))}
                                                    className={`py-2 px-3 rounded-md border text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        editForm.type === "EARNING"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-500"
                                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <ArrowUpRight size={13} />
                                                    <span>EARNING</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditForm((p) => ({ ...p, type: "DEDUCTION" }))
                                                    }
                                                    className={`py-2 px-3 rounded-md border text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        editForm.type === "DEDUCTION"
                                                            ? "bg-amber-50 text-amber-700 border-amber-500"
                                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <ArrowDownRight size={13} />
                                                    <span>DEDUCTION</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Calculation Type */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Calculation Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={editForm.calculation_type}
                                                onChange={(e: any) =>
                                                    setEditForm((p) => ({
                                                        ...p,
                                                        calculation_type: e.target.value,
                                                    }))
                                                }
                                                className="w-full h-[36px] border border-gray-300 rounded-md px-3 text-[12px] text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option value="FIXED">FIXED (Flat Amount)</option>
                                                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                                                <option value="FORMULA">FORMULA (Expression)</option>
                                            </select>
                                        </div>

                                        {/* Formula */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                Formula / Expression
                                                {editForm.calculation_type !== "FIXED" && (
                                                    <span className="text-red-500 ml-1">*</span>
                                                )}
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.formula}
                                                onChange={(e) =>
                                                    setEditForm((p) => ({ ...p, formula: e.target.value }))
                                                }
                                                placeholder="e.g. BASIC * 0.50"
                                                className="w-full h-[36px] font-mono border border-gray-300 rounded-md px-3 text-[12px] text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>

                                        {/* Toggles (Taxable, Statutory, Active) */}
                                        <div className="grid grid-cols-3 gap-2.5 pt-2">
                                            {/* Taxable */}
                                            <div className="p-2.5 border border-gray-200 rounded-lg flex flex-col items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-gray-700">
                                                    Taxable
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditForm((p) => ({ ...p, taxable: !p.taxable }))
                                                    }
                                                    className={`relative w-[44px] h-[22px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${
                                                        editForm.taxable ? "bg-[#78c267]" : "bg-gray-300"
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                                            editForm.taxable ? "right-1" : "left-1"
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Statutory */}
                                            <div className="p-2.5 border border-gray-200 rounded-lg flex flex-col items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-gray-700">
                                                    Statutory
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditForm((p) => ({ ...p, statutory: !p.statutory }))
                                                    }
                                                    className={`relative w-[44px] h-[22px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${
                                                        editForm.statutory ? "bg-purple-600" : "bg-gray-300"
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                                            editForm.statutory ? "right-1" : "left-1"
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Active */}
                                            <div className="p-2.5 border border-gray-200 rounded-lg flex flex-col items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-gray-700">
                                                    Active
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditForm((p) => ({ ...p, active: !p.active }))
                                                    }
                                                    className={`relative w-[44px] h-[22px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${
                                                        editForm.active ? "bg-[#78c267]" : "bg-[#ef3519]"
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                                            editForm.active ? "right-1" : "left-1"
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setEditingComponent(null)}
                                            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-[12px] font-semibold rounded-md transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={editSaving}
                                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <Check size={13} />
                                            <span>{editSaving ? "Saving..." : "Save Changes"}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
