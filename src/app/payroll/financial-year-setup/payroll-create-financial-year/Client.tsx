"use client";

import Pageheader from "@/Components/PageHeader";
import SideBar from "@/Components/SideBar";
import Head from "@/lib/compatHead";
import getFinancialYear from "@/lib/financialYearCalculation";
import { Check, ChevronDown, RotateCcw, Search, Send } from "lucide-react";
import { useRouter } from "@/lib/compatRouter";
import { Suspense, useEffect, useState } from "react";
import { toast } from "react-toastify";

const FinancialYearSetup = () => {
    const router = useRouter();
    const [companies, setCompanies] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        company_id: "",
        start_date: "",
        end_date: "",
        status: "DRAFT"
    });
    const [fy, setFy] = useState('Select the valid dates to calculate FY');
    const [loading, setLoading] = useState(false);

    // Fetch all data for form dropdowns
    useEffect(() => {
        // Fetch all companies
        const fetchCompanies = async () => {
            try {
                const res = await fetch("/api/company/companies");
                if (res.ok) {
                    const result = await res.json();
                    setCompanies(result.data || []);
                }
            } catch (error) {
                console.error("Error fetching companies:", error);
            }
        };
        fetchCompanies();
    }, []);

    // Financial year validation at the time of creation
    function validateFinancialYear({ startMonth, endMonth }: { startMonth: string, endMonth: string }) {
        if (!startMonth) {
            toast.error("Please select a financial year start month.");
            return false;
        }

        if (!endMonth) {
            toast.error("Please select a financial year end month.");
            return false;
        }

        const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

        if (!monthRegex.test(startMonth)) {
            toast.error("Invalid financial year start month.");
            return false;
        }

        if (!monthRegex.test(endMonth)) {
            toast.error("Invalid financial year end month.");
            return false;
        }

        const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
        const [endYear, endMonthNumber] = endMonth.split("-").map(Number);

        const start = startYear * 12 + startMonthNumber;
        const end = endYear * 12 + endMonthNumber;

        if (start === end) {
            toast.error("Financial year start and end month cannot be the same.");
            return false;
        }

        if (end < start) {
            toast.error("Financial year end cannot be before the start.");
            return false;
        }

        if (end - start > 11) {
            toast.error("Financial year cannot be more than 12 months.");
            return false;
        }

        return true;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/payroll/financial-year", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const result = await res.json();
                toast.error(result?.message || "Something went wrong");
                return;
            }

            const result = await res.json();
            toast.success(result?.message || "Financial year created successfully");
            handleReset();
            setTimeout(() => {
                router.push("/payroll/financial-year-setup/payroll-get-financial-years");
            }, 1000);
        } catch (error) {
            console.error("Error creating financial year:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const handleReset = () => {
        setForm({
            company_id: "",
            start_date: "",
            end_date: "",
            status: "DRAFT"
        });
        setFy('Select the valid dates to calculate FY');
    }

    return (
        <>
            <Head>
                <title>Financial Year Setup - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <SideBar />
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Financial Year Setup"
                        description="Fill in all required information for financial year setup"
                        href="/dashboard"
                    />

                    {/* Payroll Financial Year Setup Form */}
                    <div className="bg-white border border-[#d4d8dd] shadow-sm mb-6">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-[#d4d8dd]">
                            <div className="flex items-center justify-between">

                                <div>
                                    <h2 className="text-[14px] font-semibold text-[#2f3a45]">
                                        Create Financial Year
                                    </h2>

                                    <p className="text-[11px] text-[#6b7280] mt-1">
                                        Configure financial year settings.
                                    </p>
                                </div>

                                <div className="text-[10px] text-[#7a838d]">
                                    Fields marked with
                                    <span className="text-red-500 font-semibold ml-1">*</span>
                                    are required
                                </div>

                            </div>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="border border-[#d9dde2] mb-5">
                                <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                    <div className="w-1 h-4 bg-indigo-400 rounded-full mr-3" />

                                    <div>
                                        <h3 className="text-[12px] font-semibold text-[#374151]">
                                            Basic Payroll Financial Year Information
                                        </h3>

                                        <p className="text-[10px] text-[#7b8490]">
                                            Company, Start year & month, End year & month
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4">

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">


                                        {/* Company */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                Select Company
                                                <span className="text-red-500 ml-0.5">*</span>
                                            </label>

                                            <div className="relative">

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsDropdownOpen(!isDropdownOpen);
                                                    }}
                                                    className="
                                                        w-full
                                                        h-[38px]
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        bg-white
                                                        text-left
                                                        text-[12px]
                                                        text-[#374151]
                                                        hover:border-[#aeb7c1]
                                                        focus:outline-none
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                        focus:border-indigo-400
                                                        flex
                                                        items-center
                                                        justify-between
                                                        transition
                                                        cursor-pointer
                                                    "
                                                >
                                                    <span className="truncate">
                                                        {companies?.find(
                                                            (c) => String(c.uid) === String(form.company_id)
                                                        )
                                                            ? companies.find(
                                                                (c) => String(c.uid) === String(form.company_id)
                                                            ).name
                                                            : "— No company selected —"}
                                                    </span>

                                                    <ChevronDown
                                                        className={`w-4 h-4 text-[#8b949e] transition-transform ${isDropdownOpen ? "rotate-180" : ""
                                                            }`}
                                                    />
                                                </button>

                                                {isDropdownOpen && (
                                                    <div className="
                                                        absolute
                                                        z-50
                                                        mt-1
                                                        w-full
                                                        bg-white
                                                        border
                                                        border-[#d5dbe1]
                                                        rounded-md
                                                        shadow-lg
                                                        overflow-hidden
                                                    ">

                                                        <div className="p-2 border-b border-[#e8ebee] bg-[#f8f9fa]">
                                                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#d9dde2] rounded-sm">

                                                                <Search className="w-3.5 h-3.5 text-[#8b949e]" />

                                                                <input
                                                                    type="text"
                                                                    placeholder="Search company..."
                                                                    value={searchTerm}
                                                                    onChange={(e) =>
                                                                        setSearchTerm(e.target.value)
                                                                    }
                                                                    className="
                                                                        w-full
                                                                        text-[11px]
                                                                        text-[#374151]
                                                                        bg-transparent
                                                                        focus:outline-none
                                                                    "
                                                                    autoFocus
                                                                />

                                                            </div>
                                                        </div>

                                                        <div className="overflow-y-auto max-h-56">

                                                            {companies?.filter(
                                                                (c) =>
                                                                    (c?.name || "")
                                                                        .toLowerCase()
                                                                        .includes(searchTerm.toLowerCase())
                                                            ).length === 0 ? (

                                                                <div className="p-4 text-[11px] text-[#7b8490] text-center">
                                                                    No matching companies found
                                                                </div>

                                                            ) : (

                                                                companies
                                                                    ?.filter((c) =>
                                                                        (c?.name || "")
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                searchTerm.toLowerCase()
                                                                            )
                                                                    )
                                                                    .map((c) => (

                                                                        <button
                                                                            key={c.uid}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setForm((p) => ({
                                                                                    ...p,
                                                                                    company_id: c.uid,
                                                                                }));
                                                                                setIsDropdownOpen(false);
                                                                                setSearchTerm("");
                                                                            }}
                                                                            className={`
                                                                                w-full
                                                                                px-3
                                                                                py-2.5
                                                                                text-left
                                                                                text-[11px]
                                                                                flex
                                                                                items-center
                                                                                justify-between
                                                                                border-b
                                                                                border-[#f0f2f4]
                                                                                last:border-0
                                                                                transition-colors
                                                                                ${String(form.company_id) ===
                                                                                    String(c.uid)
                                                                                    ? "bg-[#edf4f9] text-[#3f6f91]"
                                                                                    : "text-[#4b5563] hover:bg-[#f6f8fa]"
                                                                                }
                                                                            `}
                                                                        >

                                                                            <span className="font-medium">
                                                                                {c.name}
                                                                            </span>

                                                                            {String(form.company_id) ===
                                                                                String(c.uid) && (
                                                                                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                                                                                )}

                                                                        </button>

                                                                    ))

                                                            )}

                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>

                                        {/* Start Date and End Date */}
                                        <div className="flex gap-8">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-gray-900 mb-2">
                                                    Start Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="month"
                                                        value={form.start_date}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                start_date: value
                                                            }));
                                                        }}
                                                        onFocus={() => { }} // Add focus styles if needed
                                                        className="block w-full px-3 py-2.5 text-[11px] text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                        placeholder="Select start date"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-gray-900 mb-2">
                                                    End Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="month"
                                                        value={form.end_date}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (validateFinancialYear({ startMonth: form.start_date, endMonth: value })) {
                                                                setFy(getFinancialYear(form.start_date, value));
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    end_date: value
                                                                }));
                                                            }
                                                        }}
                                                        onFocus={() => { }} // Add focus styles if needed
                                                        className="block w-full px-3 py-2.5 text-[11px] text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                        placeholder="Select end date"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Show the financial year */}
                                        <div className="flex gap-8">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-semibold text-gray-900 mb-2">
                                                    Calculate Financial year
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={fy}
                                                        readOnly
                                                        className="block w-full px-3 py-2.5 text-[11px] text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                        placeholder="Select financial year"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ===================================================== */}
                            {/* ACTION BAR */}
                            {/* ===================================================== */}

                            <div className="
                                border
                                border-[#d9dde2]
                                bg-[#f7f8fa]
                                px-4
                                py-3
                                flex
                                flex-col
                                sm:flex-row
                                gap-3
                                justify-end
                            ">

                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    h-[38px]
                                    px-5
                                    border
                                    border-[#cbd1d7]
                                    bg-white
                                    text-[#4b5563]
                                    hover:bg-[#f1f3f5]
                                    hover:border-[#b8c0c8]
                                    rounded-md
                                    text-[12px]
                                    font-semibold
                                    transition-colors
                                    cursor-pointer
                                "
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-[#6b7280]" />
                                    Reset Form
                                </button>


                                <button
                                    type="submit"
                                    className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    h-[38px]
                                    px-6
                                    bg-indigo-500
                                    hover:bg-indigo-600
                                    active:bg-[#395f7d]
                                    text-white
                                    rounded-md
                                    text-[12px]
                                    font-semibold
                                    transition-colors
                                    cursor-pointer
                                    shadow-sm
                                "
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-1.5">

                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />

                                        </div>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            Create Financial year
                                        </>
                                    )}
                                </button>

                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function ClientPageWrapper(props: any) {
    return (
        <Suspense fallback={null}>
            <FinancialYearSetup {...props} />
        </Suspense>
    );
}