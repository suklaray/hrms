"use client";

import { useEffect, useState } from "react";
import Head from "@/lib/compatHead";
import Pageheader from "@/Components/PageHeader";
import { useRouter } from "@/lib/compatRouter";
import { toast } from "react-toastify";
import Link from "next/link";
import {
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    Calculator,
    Check,
    ChevronDown,
    FileText,
    HelpCircle,
    Info,
    Percent,
    Plus,
    RotateCcw,
    Search,
    Shield,
    X,
} from "lucide-react";

interface Company {
    id: number;
    uid: string;
    name: string;
}

export default function SalaryCreateComponentClient() {
    const router = useRouter();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Company dropdown search state
    const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
    const [companySearch, setCompanySearch] = useState("");

    // Form state
    const [form, setForm] = useState({
        company_id: "",
        name: "",
        code: "",
        type: "EARNING", // "EARNING" | "DEDUCTION"
        calculation_type: "FIXED", // "FIXED" | "PERCENTAGE" | "FORMULA"
        formula: "",
        taxable: false,
        statutory: false,
        active: true,
    });

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            setLoadingCompanies(true);
            try {
                const res = await fetch("/api/company/companies");
                if (res.ok) {
                    const json = await res.json();
                    const list = json.data || [];
                    setCompanies(list);
                    if (list.length === 1) {
                        setForm((prev) => ({ ...prev, company_id: list[0].uid }));
                    }
                } else {
                    console.error("Failed to load companies");
                }
            } catch (err) {
                console.error("Error loading companies:", err);
            } finally {
                setLoadingCompanies(false);
            }
        };

        fetchCompanies();
    }, []);

    // Filter companies for searchable dropdown
    const filteredCompanies = companies.filter((c) =>
        (c.name || "").toLowerCase().includes(companySearch.toLowerCase())
    );

    const selectedCompany = companies.find((c) => c.uid === form.company_id);

    // Reset form handler
    const handleReset = () => {
        setForm({
            company_id: companies.length === 1 ? companies[0].uid : "",
            name: "",
            code: "",
            type: "EARNING",
            calculation_type: "FIXED",
            formula: "",
            taxable: false,
            statutory: false,
            active: true,
        });
        setCompanySearch("");
        setCompanyDropdownOpen(false);
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!form.company_id) {
            toast.error("Please select a company");
            return;
        }
        if (!form.name.trim()) {
            toast.error("Please enter a component name");
            return;
        }
        if (!form.code.trim()) {
            toast.error("Please enter a component code");
            return;
        }
        if (
            (form.calculation_type === "PERCENTAGE" || form.calculation_type === "FORMULA") &&
            !form.formula.trim()
        ) {
            toast.error(`Please provide a formula or calculation expression for ${form.calculation_type}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                company_id: form.company_id,
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                type: form.type,
                calculation_type: form.calculation_type,
                formula: form.formula.trim() || null,
                taxable: Boolean(form.taxable),
                statutory: Boolean(form.statutory),
                active: Boolean(form.active),
            };

            const res = await fetch("/api/payroll/salary/component", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(data.message || "Salary component created successfully");
                handleReset();
                setTimeout(() => {
                    router.push("/payroll/salary/salary-components/salary-get-components");
                }, 800);
            } else {
                toast.error(data.message || "Failed to create salary component");
            }
        } catch (err: any) {
            console.error("Error creating salary component:", err);
            toast.error(err?.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Head>
                <title>Create Salary Component - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    {/* Header with Title and Back Action */}
                    <Pageheader
                        title="Create Salary Component"
                        description="Configure earnings, deductions, calculation rules, taxability, and compliance settings."
                        href="/payroll/salary/salary-components/salary-get-components"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 mb-4">
                        <Link
                            href="/payroll/salary/salary-components/salary-get-components"
                            className="inline-flex items-center gap-2 h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 text-[12px] font-semibold rounded-md border border-gray-200 shadow-sm transition-colors cursor-pointer shrink-0"
                        >
                            <span>Manage All Components</span>
                        </Link>
                    </div>

                    {/* Main Form Container */}
                    <div className="bg-white border border-[#d4d8dd] shadow-sm rounded-lg mb-6">
                        {/* Form Card Header */}
                        <div className="px-5 py-4 border-b border-[#d4d8dd] bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-[14px] font-semibold text-[#2f3a45]">
                                        New Salary Component Details
                                    </h2>
                                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                                        Set up component identifiers, calculation type, and tax compliance behavior.
                                    </p>
                                </div>
                                <div className="text-[10px] text-[#7a838d]">
                                    Fields marked with <span className="text-red-500 font-bold ml-0.5">*</span> are required
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-5 space-y-6">
                                {/* ===================================================== */}
                                {/* SECTION 1: BASIC IDENTIFICATION */}
                                {/* ===================================================== */}
                                <div className="border border-[#d9dde2] rounded-md overflow-hidden">
                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-indigo-500 rounded-full mr-3" />
                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Component Identification
                                            </h3>
                                            <p className="text-[10px] text-[#7b8490]">
                                                Target company, display label, and unique alphanumeric code
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Company Dropdown */}
                                        <div className="relative">
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                Company <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                                                className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-left text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center justify-between transition cursor-pointer"
                                            >
                                                <span className="truncate flex items-center gap-2">
                                                    <Building2 size={13} className="text-gray-400 shrink-0" />
                                                    {selectedCompany
                                                        ? selectedCompany.name
                                                        : loadingCompanies
                                                            ? "Loading companies..."
                                                            : "Select Company"}
                                                </span>
                                                <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
                                            </button>

                                            {companyDropdownOpen && (
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-[#cfd5db] rounded-md shadow-lg py-1 max-h-60 overflow-auto">
                                                    <div className="p-2 border-b border-gray-100">
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                value={companySearch}
                                                                onChange={(e) => setCompanySearch(e.target.value)}
                                                                placeholder="Search company..."
                                                                className="w-full pl-7 pr-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded focus:outline-none focus:bg-white text-gray-800"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    {filteredCompanies.length === 0 ? (
                                                        <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
                                                            No companies found
                                                        </div>
                                                    ) : (
                                                        filteredCompanies.map((c) => (
                                                            <button
                                                                type="button"
                                                                key={c.uid}
                                                                onClick={() => {
                                                                    setForm((p) => ({ ...p, company_id: c.uid }));
                                                                    setCompanyDropdownOpen(false);
                                                                    setCompanySearch("");
                                                                }}
                                                                className={`w-full px-3 py-2 text-left text-[12px] flex items-center justify-between hover:bg-indigo-50 cursor-pointer ${form.company_id === c.uid ? "bg-indigo-50/70 font-semibold text-indigo-700" : "text-gray-700"
                                                                    }`}
                                                            >
                                                                <span className="truncate">{c.name}</span>
                                                                {form.company_id === c.uid && (
                                                                    <Check size={13} className="text-indigo-600 shrink-0" />
                                                                )}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Component Name */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                Component Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) =>
                                                    setForm((p) => ({ ...p, name: e.target.value }))
                                                }
                                                placeholder="e.g. Basic Salary, House Rent Allowance"
                                                className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 text-[12px] text-[#374151] placeholder:text-[#a1a8b0] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>

                                        {/* Component Code */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                Component Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.code}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                                                    }))
                                                }
                                                placeholder="e.g. BASIC, HRA, PF_DEDUCTION"
                                                className="w-full h-[38px] font-mono border border-[#cfd5db] rounded-md px-3 text-[12px] text-[#374151] placeholder:text-[#a1a8b0] uppercase focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                required
                                            />
                                            <span className="text-[10px] text-gray-400 mt-1 block">
                                                Unique uppercase code (e.g. BASIC, HRA, SPECIAL)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* SECTION 2: CLASSIFICATION & CALCULATION */}
                                {/* ===================================================== */}
                                <div className="border border-[#d9dde2] rounded-md overflow-hidden">
                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-purple-500 rounded-full mr-3" />
                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Classification & Calculation Method
                                            </h3>
                                            <p className="text-[10px] text-[#7b8490]">
                                                Choose whether component is Earning or Deduction, and define computation rule
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Component Type (Earning vs Deduction) */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-2">
                                                Component Type <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, type: "EARNING" }))}
                                                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer ${form.type === "EARNING"
                                                            ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                                                            : "border-gray-200 bg-white hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.type === "EARNING"
                                                                ? "bg-emerald-500 text-white"
                                                                : "bg-gray-100 text-gray-500"
                                                            }`}
                                                    >
                                                        <ArrowUpRight size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[12px] font-bold text-gray-900">
                                                                EARNING
                                                            </span>
                                                            {form.type === "EARNING" && (
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            Increases total gross salary (e.g. Basic Pay, HRA, Medical, Bonus)
                                                        </p>
                                                    </div>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, type: "DEDUCTION" }))}
                                                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all cursor-pointer ${form.type === "DEDUCTION"
                                                            ? "border-amber-500 bg-amber-50/40 shadow-sm"
                                                            : "border-gray-200 bg-white hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${form.type === "DEDUCTION"
                                                                ? "bg-amber-500 text-white"
                                                                : "bg-gray-100 text-gray-500"
                                                            }`}
                                                    >
                                                        <ArrowDownRight size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[12px] font-bold text-gray-900">
                                                                DEDUCTION
                                                            </span>
                                                            {form.type === "DEDUCTION" && (
                                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                            Decreases take-home payout (e.g. Provident Fund, Tax TDS, ESIC)
                                                        </p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Calculation Type */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-2">
                                                Calculation Type <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {[
                                                    {
                                                        key: "FIXED",
                                                        label: "Fixed Amount",
                                                        icon: FileText,
                                                        desc: "Direct flat numeric amount per pay run (e.g. ₹25,000)",
                                                    },
                                                    {
                                                        key: "PERCENTAGE",
                                                        label: "Percentage (%)",
                                                        icon: Percent,
                                                        desc: "Calculated as percentage of basic or base component",
                                                    },
                                                    // {
                                                    //     key: "FORMULA",
                                                    //     label: "Formula Expression",
                                                    //     icon: Calculator,
                                                    //     desc: "Custom mathematical formula based on other components",
                                                    // },
                                                ].map((c) => {
                                                    const isSelected = form.calculation_type === c.key;
                                                    const IconComponent = c.icon;
                                                    return (
                                                        <button
                                                            key={c.key}
                                                            type="button"
                                                            onClick={() =>
                                                                setForm((p) => ({ ...p, calculation_type: c.key }))
                                                            }
                                                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${isSelected
                                                                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                                                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-[12px] font-semibold text-gray-800 flex items-center gap-1.5">
                                                                    <IconComponent
                                                                        size={14}
                                                                        className={isSelected ? "text-indigo-600" : "text-gray-400"}
                                                                    />
                                                                    {c.label}
                                                                </span>
                                                                {isSelected && (
                                                                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-500">{c.desc}</p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Formula field (shown or prioritized for PERCENTAGE & FORMULA) */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-[11px] font-semibold text-[#4b5563]">
                                                    Calculation Formula / Expression
                                                    {form.calculation_type !== "FIXED" && (
                                                        <span className="text-red-500 ml-1">*</span>
                                                    )}
                                                </label>
                                                {form.calculation_type === "FIXED" && (
                                                    <span className="text-[10px] text-gray-400">
                                                        Optional for Fixed amount
                                                    </span>
                                                )}
                                            </div>

                                            <input
                                                type="text"
                                                value={form.formula}
                                                onChange={(e) =>
                                                    setForm((p) => ({ ...p, formula: e.target.value }))
                                                }
                                                placeholder={
                                                    form.calculation_type === "PERCENTAGE"
                                                        ? "e.g. 50% of BASIC or BASIC * 0.50"
                                                        : form.calculation_type === "FORMULA"
                                                            ? "e.g. BASIC * 0.12 or (BASIC + DA) * 0.40"
                                                            : "e.g. Flat monthly allowance (optional)"
                                                }
                                                className="w-full h-[38px] font-mono border border-[#cfd5db] rounded-md px-3 text-[12px] text-[#374151] placeholder:text-[#a1a8b0] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />

                                            {/* Formula helpers */}
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Info size={11} /> Quick templates:
                                                </span>
                                                {[
                                                    "BASIC * 0.50",
                                                    "BASIC * 0.12",
                                                    "(BASIC + HRA) * 0.10",
                                                    "GROSS * 0.05",
                                                ].map((tpl) => (
                                                    <button
                                                        key={tpl}
                                                        type="button"
                                                        onClick={() => setForm((p) => ({ ...p, formula: tpl }))}
                                                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 border border-gray-200 transition-colors cursor-pointer"
                                                    >
                                                        {tpl}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* SECTION 3: TAX & STATUTORY SETTINGS */}
                                {/* ===================================================== */}
                                <div className="border border-[#d9dde2] rounded-md overflow-hidden">
                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-emerald-500 rounded-full mr-3" />
                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Taxation, Statutory Compliance & Status
                                            </h3>
                                            <p className="text-[10px] text-[#7b8490]">
                                                Define tax deduction impact and statutory requirements
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Taxable Toggle */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                                            <div>
                                                <span className="text-[12px] font-semibold text-gray-800 block">
                                                    Taxable Component
                                                </span>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Subject to payroll income tax computation
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((p) => ({ ...p, taxable: !p.taxable }))
                                                }
                                                className={`relative w-[46px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${form.taxable ? "bg-[#78c267]" : "bg-gray-300"
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${form.taxable ? "left-1.5" : "right-1.5"
                                                        }`}
                                                >
                                                    {form.taxable ? (
                                                        <Check size={11} strokeWidth={3} />
                                                    ) : (
                                                        <X size={11} strokeWidth={3} />
                                                    )}
                                                </span>
                                                <span
                                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${form.taxable ? "right-1" : "left-1"
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Statutory Toggle */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                                            <div>
                                                <span className="text-[12px] font-semibold text-gray-800 block">
                                                    Statutory Component
                                                </span>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Mandatory statutory deduction (e.g. PF, ESI)
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((p) => ({ ...p, statutory: !p.statutory }))
                                                }
                                                className={`relative w-[46px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${form.statutory ? "bg-purple-600" : "bg-gray-300"
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${form.statutory ? "left-1.5" : "right-1.5"
                                                        }`}
                                                >
                                                    {form.statutory ? (
                                                        <Check size={11} strokeWidth={3} />
                                                    ) : (
                                                        <X size={11} strokeWidth={3} />
                                                    )}
                                                </span>
                                                <span
                                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${form.statutory ? "right-1" : "left-1"
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Active Status Toggle */}
                                        <div className="p-3.5 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                                            <div>
                                                <span className="text-[12px] font-semibold text-gray-800 block">
                                                    Active Status
                                                </span>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Available for employee salary structures
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((p) => ({ ...p, active: !p.active }))
                                                }
                                                className={`relative w-[46px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer shadow-inner shrink-0 ${form.active ? "bg-[#78c267]" : "bg-[#ef3519]"
                                                    }`}
                                            >
                                                <span
                                                    className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${form.active ? "left-1.5" : "right-1.5"
                                                        }`}
                                                >
                                                    {form.active ? (
                                                        <Check size={11} strokeWidth={3} />
                                                    ) : (
                                                        <X size={11} strokeWidth={3} />
                                                    )}
                                                </span>
                                                <span
                                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${form.active ? "right-1" : "left-1"
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ===================================================== */}
                            {/* ACTION FOOTER */}
                            {/* ===================================================== */}
                            <div className="border-t border-[#d9dde2] bg-[#f7f8fa] px-5 py-3.5 flex flex-col sm:flex-row gap-3 justify-end rounded-b-lg">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center gap-2 h-[38px] px-5 border border-[#cbd1d7] bg-white text-[#4b5563] hover:bg-[#f1f3f5] hover:border-[#b8c0c8] rounded-md text-[12px] font-semibold transition-colors cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-[#6b7280]" />
                                    <span>Reset Form</span>
                                </button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center justify-center gap-2 h-[38px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[12px] font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>{submitting ? "Creating Component..." : "Create Component"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
