"use client";

import { Suspense, useEffect, useState } from "react";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import { toast } from "react-toastify";
import {
    AlertCircle,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    DollarSign,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    Globe,
    Hash,
    Info,
    Lock,
    LockOpen,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    Sliders,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getOrdinal } from "@/lib/getNumberordinal";
import getMonthName from "@/lib/monthPicker";

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

function PayrollCreatePeriods() {
    // Data states
    const [company, setCompany] = useState<any>(null);
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const [configurations, setConfigurations] = useState<any[]>([]);

    // Selection states
    const [selectedFyUid, setSelectedFyUid] = useState<string>("");
    const [selectedConfigUid, setSelectedConfigUid] = useState<string>("");

    // Loading states
    const [loadingCompany, setLoadingCompany] = useState(false);
    const [loadingFy, setLoadingFy] = useState(false);
    const [loadingConfigs, setLoadingConfigs] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Generated result state
    const [generatedPeriods, setGeneratedPeriods] = useState<any[]>([]);
    const [generationSuccessInfo, setGenerationSuccessInfo] = useState<string | null>(null);

    // Load initial data
    const fetchCompany = async () => {
        setLoadingCompany(true);
        try {
            const res = await fetch("/api/company/companies");
            const data = await res.json();
            if (data?.data && data.data.length > 0) {
                setCompany(data.data[0]);
            }
        } catch (err) {
            console.error("Error fetching company details:", err);
        } finally {
            setLoadingCompany(false);
        }
    };

    const fetchFinancialYears = async () => {
        setLoadingFy(true);
        try {
            const res = await fetch("/api/payroll/financial-year");
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setFinancialYears(result.data);
                // Pre-select active FY if available
                const activeFy = result.data.find((f: any) => f.status === "ACTIVE" && !f.lock);
                if (activeFy) {
                    setSelectedFyUid(activeFy.uid);
                } else if (result.data.length > 0) {
                    setSelectedFyUid(result.data[0].uid);
                }
            }
        } catch (err) {
            console.error("Error fetching financial years:", err);
        } finally {
            setLoadingFy(false);
        }
    };

    const fetchConfigurations = async () => {
        setLoadingConfigs(true);
        try {
            const res = await fetch("/api/payroll/configurations");
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setConfigurations(result.data);
                // Pre-select active config if available
                const activeConfig = result.data.find((c: any) => c.status === "ACTIVE");
                if (activeConfig) {
                    setSelectedConfigUid(activeConfig.uid);
                } else if (result.data.length > 0) {
                    setSelectedConfigUid(result.data[0].uid);
                }
            }
        } catch (err) {
            console.error("Error fetching configurations:", err);
        } finally {
            setLoadingConfigs(false);
        }
    };

    useEffect(() => {
        fetchCompany();
        fetchFinancialYears();
        fetchConfigurations();
    }, []);

    // Derived selected objects
    const selectedFy = financialYears.find((fy) => fy.uid === selectedFyUid);
    const selectedConfig = configurations.find((cfg) => cfg.uid === selectedConfigUid);

    // Auto-align configuration when FY is selected if config is linked to that FY
    useEffect(() => {
        if (selectedFyUid && configurations.length > 0) {
            const matchingConfig = configurations.find(
                (c) => c.financial_year_id === selectedFyUid && c.status === "ACTIVE"
            );
            if (matchingConfig) {
                setSelectedConfigUid(matchingConfig.uid);
            }
        }
    }, [selectedFyUid, configurations]);

    // Validation flags for generation
    const isFyValid = selectedFy && selectedFy.status === "ACTIVE" && !selectedFy.lock;
    const isConfigValid = selectedConfig && selectedConfig.status === "ACTIVE";
    const canGenerate = isFyValid && isConfigValid && !generating;

    // Handle Generation Action
    const handleGenerate = async () => {
        if (!selectedFy || !selectedConfig) {
            toast.warning("Please select both a Financial Year and a Configuration.");
            return;
        }

        if (selectedFy.status !== "ACTIVE") {
            toast.error("Selected Financial Year is not ACTIVE. Only active financial years can have periods generated.");
            return;
        }

        if (selectedFy.lock) {
            toast.error("Selected Financial Year is locked.");
            return;
        }

        if (selectedConfig.status !== "ACTIVE") {
            toast.error("Selected Payroll Configuration is not active.");
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch("/api/payroll/periods/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    financial_year_id: selectedFy.uid,
                    configuration_id: selectedConfig.uid,
                }),
            });

            const result = await res.json();

            if (result.success) {
                toast.success(result.message || "Payroll periods generated successfully!");
                setGeneratedPeriods(result.data || []);
                setGenerationSuccessInfo(
                    `Generated ${result.createdCount || (result.data?.length ?? 0)} periods for ${selectedFy.name} (${selectedConfig.payroll_cycle})`
                );
            } else {
                toast.error(result.message || "Failed to generate payroll periods");
                if (result.data && Array.isArray(result.data)) {
                    setGeneratedPeriods(result.data);
                }
            }
        } catch (err: any) {
            console.error("Error generating payroll periods:", err);
            toast.error(err.message || "An unexpected error occurred while generating periods");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Head>
                <title>Generate Payroll Periods - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
                <SideBar />

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Generate Payroll Periods"
                        description="Select an active financial year and payroll configuration to generate official payroll periods."
                        href="/dashboard"
                    />

                    {/* ========================================================= */}
                    {/* 1. TOP SECTION: COMPANY DETAILS CARD */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 mb-6 overflow-hidden">
                        {/* Company Header Strip */}
                        <div className="h-11 bg-gradient-to-r from-gray-50 to-slate-100 border-b border-gray-200 flex items-center justify-between px-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                                    <Building2 size={13} />
                                </div>
                                <span className="text-[13px] font-semibold text-gray-900 tracking-tight">
                                    {company?.name || "Company Overview"}
                                </span>
                                {company?.uid && (
                                    <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-200/70 text-gray-600 rounded">
                                        {company.uid}
                                    </span>
                                )}
                            </div>

                            <span className="text-[11px] font-medium text-gray-500 bg-white px-2.5 py-0.5 rounded border border-gray-200">
                                Primary Entity
                            </span>
                        </div>

                        {/* Company Metadata Grid */}
                        {loadingCompany ? (
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-12 bg-gray-100 rounded" />
                                ))}
                            </div>
                        ) : company ? (
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[12px]">
                                {/* CIN & GSTIN */}
                                <div className="space-y-1 bg-slate-50/60 p-3 rounded border border-slate-100">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                        Statutory Identifiers
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">CIN:</span>
                                        <span className="font-mono text-gray-800 font-medium">{company.cin || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">GSTIN:</span>
                                        <span className="font-mono text-gray-800 font-medium">{company.gstin || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">PAN:</span>
                                        <span className="font-mono text-gray-800 font-medium">{company.pan || "-"}</span>
                                    </div>
                                </div>

                                {/* EPFO & ESIC */}
                                <div className="space-y-1 bg-slate-50/60 p-3 rounded border border-slate-100">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                        Compliance Codes
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">EPFO Est. ID:</span>
                                        <span className="font-mono text-gray-800 font-medium">{company.epfoEstablishmentId || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">ESIC Employer:</span>
                                        <span className="font-mono text-gray-800 font-medium">{company.esicEmployerCode || "-"}</span>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-1 bg-slate-50/60 p-3 rounded border border-slate-100">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin size={11} className="text-gray-400" /> Registered Location
                                    </span>
                                    <p className="text-gray-700 leading-relaxed text-[11px] line-clamp-3">
                                        {[company.address, company.city, company.state, company.pinCode].filter(Boolean).join(", ") || "-"}
                                    </p>
                                </div>

                                {/* Contact info */}
                                <div className="space-y-1 bg-slate-50/60 p-3 rounded border border-slate-100">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                        Communication
                                    </span>
                                    <div className="flex items-center gap-1.5 text-gray-700 truncate">
                                        <Mail size={12} className="text-gray-400 shrink-0" />
                                        <span className="truncate">{company.email || "-"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                        <Phone size={12} className="text-gray-400 shrink-0" />
                                        <span>{company.phone || "-"}</span>
                                    </div>
                                    {company.website && (
                                        <div className="flex items-center gap-1.5 text-indigo-600 truncate">
                                            <Globe size={12} className="shrink-0" />
                                            <a href={company.website} target="_blank" rel="noreferrer" className="truncate hover:underline">
                                                {company.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500 text-[12px]">
                                No company records found in database.
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* 2. TWO SECTIONS: FINANCIAL YEAR & CONFIGURATION */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* ─────────────────────────────────────────────────────── */}
                        {/* LEFT SECTION: FINANCIAL YEAR SELECTOR & DETAILS */}
                        {/* ─────────────────────────────────────────────────────── */}
                        <div className="bg-white shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            <div className="h-11 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4">
                                <div className="flex items-center gap-2">
                                    <Calendar size={15} className="text-indigo-600" />
                                    <span className="text-[13px] font-semibold text-gray-900">
                                        1. Select Financial Year
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {financialYears.length} Available
                                </span>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <p className="text-[12px] text-gray-600 mb-3">
                                    Choose the financial year for which payroll periods will be partitioned:
                                </p>

                                {/* List of FY cards */}
                                {loadingFy ? (
                                    <div className="space-y-2 mb-4 animate-pulse">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-14 bg-gray-100 rounded-lg border border-gray-200" />
                                        ))}
                                    </div>
                                ) : financialYears.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg mb-4">
                                        <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                        <p className="text-[12px]">No financial years found.</p>
                                        <Link
                                            href="/payroll/financial-year-setup/payroll-create-financial-year"
                                            className="text-indigo-600 font-semibold text-[12px] hover:underline mt-1 inline-block"
                                        >
                                            + Create Financial Year
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 mb-4">
                                        {financialYears.map((fy) => {
                                            const isSelected = fy.uid === selectedFyUid;
                                            const isActive = fy.status === "ACTIVE";

                                            return (
                                                <div
                                                    key={fy.uid}
                                                    onClick={() => setSelectedFyUid(fy.uid)}
                                                    className={`
                                                        p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between
                                                        ${isSelected
                                                            ? "bg-indigo-50/70 border-indigo-500 shadow-sm ring-1 ring-indigo-500"
                                                            : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`
                                                                w-4 h-4 rounded-full border flex items-center justify-center
                                                                ${isSelected
                                                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                                                    : "border-gray-300 bg-white"
                                                                }
                                                            `}
                                                        >
                                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-semibold text-gray-900">
                                                                    {fy.name}
                                                                </span>
                                                                {fy.lock ? (
                                                                    <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-medium">
                                                                        <Lock size={10} /> Locked
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                                                                        <LockOpen size={10} /> Unlocked
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                                                {getMonthName(fy.start_date)} &nbsp;→&nbsp; {getMonthName(fy.end_date)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <span
                                                            className={`
                                                                px-2 py-0.5 text-[11px] font-semibold rounded-full border
                                                                ${fy.status === "ACTIVE"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : fy.status === "CLOSED"
                                                                        ? "bg-slate-100 text-slate-700 border-slate-200"
                                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                                }
                                                            `}
                                                        >
                                                            {fy.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Selected Financial Year Details breakdown */}
                                {selectedFy && (
                                    <div className="mt-auto bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                                <Info size={12} className="text-indigo-600" />
                                                Selected Financial Year Overview
                                            </span>
                                            <span className="text-[11px] font-mono text-gray-500">
                                                {selectedFy.uid}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                                            <div>
                                                <span className="text-gray-500 block">Cycle Range:</span>
                                                <span className="font-semibold text-gray-800">
                                                    {formatDisplayDate(selectedFy.start_date)} – {formatDisplayDate(selectedFy.end_date)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Status:</span>
                                                <span
                                                    className={`font-semibold ${selectedFy.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"}`}
                                                >
                                                    {selectedFy.status}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Lock State:</span>
                                                <span
                                                    className={`font-semibold flex items-center gap-1 ${selectedFy.lock ? "text-red-600" : "text-emerald-600"}`}
                                                >
                                                    {selectedFy.lock ? "Locked (Restricted)" : "Open for Generation"}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedFy.lock && (
                                            <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-100">
                                                <AlertCircle size={12} className="shrink-0" />
                                                This financial year is locked. Please unlock it before generating periods.
                                            </div>
                                        )}
                                        {selectedFy.status !== "ACTIVE" && (
                                            <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1 bg-amber-50 p-1.5 rounded border border-amber-100">
                                                <AlertCircle size={12} className="shrink-0" />
                                                Only ACTIVE financial years can be used to generate payroll periods.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─────────────────────────────────────────────────────── */}
                        {/* RIGHT SECTION: CONFIGURATION SELECTOR & DETAILS */}
                        {/* ─────────────────────────────────────────────────────── */}
                        <div className="bg-white shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            <div className="h-11 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4">
                                <div className="flex items-center gap-2">
                                    <Sliders size={15} className="text-indigo-600" />
                                    <span className="text-[13px] font-semibold text-gray-900">
                                        2. Select Payroll Configuration
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {configurations.length} Available
                                </span>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <p className="text-[12px] text-gray-600 mb-3">
                                    Choose the active configuration that defines period cycle, cutoff, and payment date:
                                </p>

                                {/* List of Configuration cards */}
                                {loadingConfigs ? (
                                    <div className="space-y-2 mb-4 animate-pulse">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-14 bg-gray-100 rounded-lg border border-gray-200" />
                                        ))}
                                    </div>
                                ) : configurations.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg mb-4">
                                        <Sliders className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                        <p className="text-[12px]">No payroll configurations found.</p>
                                        <Link
                                            href="/payroll/payroll-setup/payroll-create-config"
                                            className="text-indigo-600 font-semibold text-[12px] hover:underline mt-1 inline-block"
                                        >
                                            + Create Payroll Configuration
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 mb-4">
                                        {configurations.map((cfg) => {
                                            const isSelected = cfg.uid === selectedConfigUid;
                                            const cycle = cfg.payroll_cycle;

                                            return (
                                                <div
                                                    key={cfg.uid}
                                                    onClick={() => setSelectedConfigUid(cfg.uid)}
                                                    className={`
                                                        p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between
                                                        ${isSelected
                                                            ? "bg-indigo-50/70 border-indigo-500 shadow-sm ring-1 ring-indigo-500"
                                                            : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`
                                                                w-4 h-4 rounded-full border flex items-center justify-center
                                                                ${isSelected
                                                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                                                    : "border-gray-300 bg-white"
                                                                }
                                                            `}
                                                        >
                                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                                        </div>

                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`
                                                                        px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider
                                                                        ${cycle === "MONTHLY"
                                                                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                                                            : cycle === "WEEKLY"
                                                                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                                                                : "bg-teal-100 text-teal-700 border border-teal-200"
                                                                        }
                                                                    `}
                                                                >
                                                                    {cycle}
                                                                </span>

                                                                <span className="text-[12px] font-semibold text-gray-800">
                                                                    Salary on {getOrdinal(cfg.salary_payment_date)}
                                                                </span>
                                                            </div>

                                                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                                                <span>Country: {cfg.payroll_country}</span>
                                                                <span>•</span>
                                                                <span>Currency: {cfg.currency}</span>
                                                                {cfg.financial_year?.name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="text-gray-600">FY: {cfg.financial_year.name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <span
                                                            className={`
                                                                px-2 py-0.5 text-[11px] font-semibold rounded-full border
                                                                ${cfg.status === "ACTIVE"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-red-50 text-red-700 border-red-200"
                                                                }
                                                            `}
                                                        >
                                                            {cfg.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Selected Configuration Details breakdown */}
                                {selectedConfig && (
                                    <div className="mt-auto bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                                <Info size={12} className="text-indigo-600" />
                                                Selected Configuration Overview
                                            </span>
                                            <span className="text-[11px] font-mono text-gray-500">
                                                {selectedConfig.uid}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                                            <div>
                                                <span className="text-gray-500 block">Cycle:</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedConfig.payroll_cycle}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Salary Payment:</span>
                                                <span className="font-semibold text-gray-800">
                                                    Every {getOrdinal(selectedConfig.salary_payment_date)} of month
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Working Days:</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedConfig.working_days} Days
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Leave Cut-off:</span>
                                                <span className="font-semibold text-gray-800">
                                                    Day {selectedConfig.leave_cut_off}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Calendar Type:</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedConfig.salary_calendar}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedConfig.status !== "ACTIVE" && (
                                            <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-100">
                                                <AlertCircle size={12} className="shrink-0" />
                                                This configuration is not ACTIVE. Only active configurations can be used.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* 3. GENERATION ACTION BAR */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[12px] text-gray-700">
                            <span className="font-semibold text-gray-900 block sm:inline">
                                Ready to initialize payroll periods:
                            </span>{" "}
                            {selectedFy && selectedConfig ? (
                                <span className="text-gray-600">
                                    Generating for <strong className="text-indigo-700">{selectedFy.name}</strong> using{" "}
                                    <strong className="text-indigo-700">{selectedConfig.payroll_cycle}</strong> cycle.
                                </span>
                            ) : (
                                <span className="text-amber-600">
                                    Please select both Financial Year and Configuration above.
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`
                                inline-flex items-center justify-center gap-2
                                h-[38px] px-6 text-[12px] font-semibold rounded-md
                                transition-all shadow-sm
                                ${canGenerate
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99]"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200"
                                }
                            `}
                        >
                            {generating ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                </div>
                            ) : (
                                <>
                                    <Sparkles size={14} />
                                    <span>Generate Payroll Periods</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* ========================================================= */}
                    {/* 4. TEMPORARY DATA TABLE OF GENERATED PERIODS */}
                    {/* ========================================================= */}
                    {generatedPeriods.length > 0 && (
                        <div className="bg-white shadow-sm border border-gray-200 mb-6 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-emerald-50/50 to-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <div>
                                        <h2 className="text-[14px] font-semibold text-gray-900">
                                            Generated Payroll Periods
                                        </h2>
                                        {generationSuccessInfo && (
                                            <p className="text-[11px] text-gray-500">{generationSuccessInfo}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] font-medium bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        {generatedPeriods.length} Periods Initialized
                                    </span>
                                    <Link
                                        href="/payroll/payroll-setup/payroll-get-periods"
                                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        <span>Manage Periods</span>
                                        <ExternalLink size={12} />
                                    </Link>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {["#", "Period Name", "Start Date", "End Date", "Salary Payment Date", "Status"].map((h) => (
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
                                        {generatedPeriods.map((period, index) => (
                                            <tr key={period.uid || period.id || index} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                    {String(index + 1).padStart(2, "0")}
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <div className="text-[12px] font-semibold text-gray-900 flex items-center gap-2">
                                                        <FileSpreadsheet size={13} className="text-indigo-500" />
                                                        {period.period_name}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-700">
                                                    {formatDisplayDate(period.period_start)}
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-700">
                                                    {formatDisplayDate(period.period_end)}
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                        <Clock size={11} />
                                                        {formatDisplayDate(period.salary_payment_date)}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        {period.status || "OPEN"}
                                                    </span>
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
        </>
    );
}

export default function ClientPageWrapper(props: any) {
    return (
        <Suspense fallback={null}>
            <PayrollCreatePeriods {...props} />
        </Suspense>
    );
}
