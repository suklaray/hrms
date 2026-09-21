import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import SideBar from '@/Components/SideBar';
import OnlyPaymentDayPicker from "@/Components/DateOnlyCalenderSelector";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { ChevronDown, Search, Check, RotateCcw, Save } from "lucide-react";
import { toast } from "react-toastify";
import Pageheader from '@/Components/PageHeader';
import { PayrollDetailsSkeleton } from '@/Components/Skeletons';
import { swalConfirm } from '@/utils/confirmDialog';

export async function getServerSideProps(context) {
    const { req } = context;
    const token = req?.cookies?.token || "";
    const user = getUserFromToken(token);

    if (!user) {
        return { redirect: { destination: "/login", permanent: false } };
    }

    const hasPayrollGenerateAccess = await checkPermission(
        user,
        PERMISSION_KEYS.PAYROLL_GENERATE
    );

    if (!hasPayrollGenerateAccess) {
        return {
            redirect: {
                destination: "/403",
                permanent: false,
            },
        };
    }

    return { props: { user } };
}

const formatDateForInput = (val) => {
    if (!val) return "";
    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        if (val.includes('T')) return val.split('T')[0];
    }
    try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch {
        return "";
    }
};

const PayrollEditConfig = () => {
    const router = useRouter();
    const { id } = router.query;

    const [companies, setCompanies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [currencies, setCurrencies] = useState([]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchCountryTerm, setSearchCountryTerm] = useState('');
    const [searchCurrencyTerm, setSearchCurrencyTerm] = useState('');

    const [initialLoading, setInitialLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currencyLoading, setCurrencyLoading] = useState(false);

    const [configMeta, setConfigMeta] = useState({
        id: null,
        uid: null,
        company: null,
    });

    const [form, setForm] = useState({
        company_id: "",
        payroll_country: "",
        currency: "",
        payroll_effective_date: "",
        payroll_cycle: "",
        working_days: "",
        attendance_cut_off: "",
        leave_cut_off: "",
        overtime_cut_off: null,
        salary_payment_date: "",
        financial_year_start_month: "",
        financial_year_end_month: "",
        salary_calendar: "",
        status: "ACTIVE",
        remarks: "",
    });

    const [initialForm, setInitialForm] = useState(null);

    // Fetch lookup datasets (companies, countries, currencies)
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

        // Get all countries
        fetch("https://countries.dev/countries")
            .then((res) => res.json())
            .then((data) => {
                setCountries(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error("Error fetching countries:", err);
            });

        // Get all currencies
        setCurrencyLoading(true);
        fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setCurrencies(data);
                } else if (data && typeof data === 'object') {
                    const formatted = Object.entries(data).map(([code, name]) => {
                        const upperCode = code.toUpperCase();
                        const displayName = typeof name === 'string' && name.trim() ? name.trim() : upperCode;
                        return {
                            code: upperCode,
                            name: displayName,
                        };
                    });
                    setCurrencies(formatted);
                }
            })
            .catch((err) => {
                console.error("Error fetching currencies:", err);
            })
            .finally(() => {
                setCurrencyLoading(false);
            });
    }, []);

    // Fetch specific configuration data to edit
    useEffect(() => {
        if (!id) return;

        let isMounted = true;
        setInitialLoading(true);

        fetch(`/api/payroll/configuration?id=${encodeURIComponent(id)}`)
            .then(async (res) => {
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || `Request failed with status ${res.status}`);
                }
                return result;
            })
            .then((resData) => {
                if (!isMounted) return;
                if (resData.success && resData.data) {
                    const c = resData.data;

                    setConfigMeta({
                        id: c.id,
                        uid: c.uid,
                        company: c.company,
                    });

                    const loadedForm = {
                        company_id: c.company_id ?? "",
                        payroll_country: c.payroll_country ?? "",
                        currency: c.currency ?? "",
                        payroll_effective_date: c.payroll_effective_date ? formatDateForInput(c.payroll_effective_date) : "",
                        payroll_cycle: c.payroll_cycle ?? "",
                        working_days: c.working_days != null ? String(c.working_days) : "",
                        attendance_cut_off: c.attendance_cut_off != null ? String(c.attendance_cut_off) : "",
                        leave_cut_off: c.leave_cut_off != null ? String(c.leave_cut_off) : "Leave rejection",
                        overtime_cut_off: c.overtime_cut_off != null ? String(c.overtime_cut_off) : null,
                        salary_payment_date: c.salary_payment_date ?? "",
                        financial_year_start_month: c.financial_year_start_month ?? "",
                        financial_year_end_month: c.financial_year_end_month ?? "",
                        salary_calendar: c.salary_calendar ?? "",
                        status: c.status ?? "ACTIVE",
                        remarks: c.remarks ?? "",
                    };

                    setForm(loadedForm);
                    setInitialForm(loadedForm);
                } else {
                    toast.error(resData.message || "Failed to load payroll configuration");
                }
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("Error fetching payroll configuration:", err);
                toast.error(err.message || "Failed to load payroll configuration");
            })
            .finally(() => {
                if (isMounted) {
                    setInitialLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [id]);

    const filteredCurrencies = Array.isArray(currencies)
        ? currencies.filter((c) => {
            const term = (searchCurrencyTerm || '').toLowerCase().trim();
            if (!term) return true;
            return (
                (c?.code || '').toLowerCase().includes(term) ||
                (c?.name || '').toLowerCase().includes(term)
            );
        })
        : [];

    // Reset the form back to initial preloaded values
    const handleReset = () => {
        if (initialForm) {
            setForm({ ...initialForm });
            toast.info("Changes reverted to saved configuration");
        }
        setSearchTerm('');
        setSearchCountryTerm('');
        setSearchCurrencyTerm('');
        setIsDropdownOpen(false);
        setIsCountryDropdownOpen(false);
        setIsCurrencyDropdownOpen(false);
    };

    // Calculate changed fields between current form and initialForm
    const getChangedFields = (current, initial) => {
        if (!initial) return {};
        const changes = {};

        // Numeric fields
        const numericFields = [
            'company_id',
            'salary_payment_date'
        ];
        numericFields.forEach((field) => {
            if (current[field] !== "" && current[field] !== undefined) {
                if (Number(current[field]) !== Number(initial[field])) {
                    changes[field] = Number(current[field]);
                }
            }
        });

        // Date field
        if (formatDateForInput(current.payroll_effective_date) !== formatDateForInput(initial.payroll_effective_date)) {
            changes.payroll_effective_date = current.payroll_effective_date;
        }

        // Decimal fields
        const decimalFields = [
            'working_days',
            'attendance_cut_off'
        ];
        decimalFields.forEach((field) => {
            if (current[field] !== "" && current[field] !== undefined) {
                if (Number(current[field]) !== Number(initial[field])) {
                    changes[field] = current[field];
                }
            }
        });

        // Overtime cut-off (can be null)
        const curOT = (current.overtime_cut_off === "" || current.overtime_cut_off === null) ? null : current.overtime_cut_off;
        const initOT = (initial.overtime_cut_off === "" || initial.overtime_cut_off === null) ? null : initial.overtime_cut_off;
        if (curOT !== initOT) {
            if (curOT === null || initOT === null) {
                changes.overtime_cut_off = curOT;
            } else if (Number(curOT) !== Number(initOT)) {
                changes.overtime_cut_off = curOT;
            }
        }

        // String / enum fields
        const stringFields = [
            'payroll_country',
            'currency',
            'payroll_cycle',
            'leave_cut_off',
            'financial_year_start_month',
            'financial_year_end_month',
            'salary_calendar',
            'status'
        ];
        stringFields.forEach((field) => {
            if (String(current[field] || '') !== String(initial[field] || '')) {
                changes[field] = current[field];
            }
        });

        // Remarks
        if (String(current.remarks || '').trim() !== String(initial.remarks || '').trim()) {
            changes.remarks = current.remarks;
        }

        return changes;
    };

    // Submit the edited configuration
    const handleSubmit = async (e) => {
        e.preventDefault();

        const confirmed = await swalConfirm(`Are you sure you want to update this payroll configuration?`, `Update`);
        if (!confirmed) return;

        if (!configMeta.id) {
            toast.error("Configuration record ID is missing");
            return;
        }

        const changes = getChangedFields(form, initialForm);
        if (Object.keys(changes).length === 0) {
            toast.info("No changes were made to update.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/payroll/configuration", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: configMeta.id,
                    ...changes,
                }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success(result.message || "Payroll configuration updated successfully");
                // Update baseline state to current state
                setInitialForm({ ...form });
                // Return to configurations list
                setTimeout(() => {
                    router.push("/payroll/payroll-setup/payroll-get-configs");
                }, 1000);
            } else {
                toast.error(result.message || "Failed to update payroll configuration");
            }
        } catch (err) {
            console.error("Error updating payroll configuration:", err);
            toast.error(err.message || "An error occurred while updating configuration");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Head>
                <title>Edit Payroll Configuration - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <SideBar />
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Edit Payroll Configuration"
                        description="Modify payroll processing rules and company payroll settings"
                        href="/payroll/payroll-setup/payroll-get-configs"
                    />

                    {/* Payroll config edit form */}
                    <div className="bg-white border border-[#d4d8dd] shadow-sm mb-6">

                        {/* Header */}
                        <div className="px-5 py-4 border-b border-[#d4d8dd]">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[14px] font-semibold text-[#2f3a45]">
                                            Edit Payroll Configuration
                                        </h2>
                                        {configMeta.uid && (
                                            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {configMeta.uid}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-[#6b7280] mt-1">
                                        Modify required settings below. Only changed values will be updated in the system.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-[10px] text-[#7a838d]">
                                        Fields marked with
                                        <span className="text-red-500 font-semibold ml-1">*</span>
                                        are required
                                    </div>
                                </div>
                            </div>
                        </div>

                        {initialLoading ? (
                            <PayrollDetailsSkeleton />
                        ) : (
                            <form onSubmit={handleSubmit}>

                                {/* ===================================================== */}
                                {/* BASIC PAYROLL INFORMATION */}
                                {/* ===================================================== */}

                                <div className="border border-[#d9dde2] m-5 mb-5">

                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-indigo-400 rounded-full mr-3" />

                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Basic Payroll Information
                                            </h3>

                                            <p className="text-[10px] text-[#7b8490]">
                                                Company, country, currency and payroll cycle
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
                                                            setIsCountryDropdownOpen(false);
                                                            setIsCurrencyDropdownOpen(false);
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
                                                                (c) => String(c.id) === String(form.company_id)
                                                            )?.name || configMeta.company?.name || "— No company selected —"}
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
                                                                                key={c.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setForm((p) => ({
                                                                                        ...p,
                                                                                        company_id: c.id,
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
                                                                                        String(c.id)
                                                                                        ? "bg-[#edf4f9] text-[#3f6f91]"
                                                                                        : "text-[#4b5563] hover:bg-[#f6f8fa]"
                                                                                    }
                                                                                `}
                                                                            >

                                                                                <span className="font-medium">
                                                                                    {c.name}
                                                                                </span>

                                                                                {String(form.company_id) ===
                                                                                    String(c.id) && (
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

                                            {/* Country */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Select Country
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <div className="relative">

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsCountryDropdownOpen(
                                                                !isCountryDropdownOpen
                                                            );
                                                            setIsDropdownOpen(false);
                                                            setIsCurrencyDropdownOpen(false);
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
                                                            {countries?.find(
                                                                (c) =>
                                                                    String(c.name) ===
                                                                    String(form.payroll_country)
                                                            )
                                                                ? countries.find(
                                                                    (c) =>
                                                                        String(c.name) ===
                                                                        String(form.payroll_country)
                                                                ).name
                                                                : form.payroll_country || "— No country selected —"}
                                                        </span>

                                                        <ChevronDown
                                                            className={`w-4 h-4 text-[#8b949e] transition-transform ${isCountryDropdownOpen
                                                                ? "rotate-180"
                                                                : ""
                                                                }`}
                                                        />

                                                    </button>

                                                    {isCountryDropdownOpen && (
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
                                                                        placeholder="Search country..."
                                                                        value={searchCountryTerm}
                                                                        onChange={(e) =>
                                                                            setSearchCountryTerm(
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="
                                                                            w-full
                                                                            text-[11px]
                                                                            bg-transparent
                                                                            focus:outline-none
                                                                        "
                                                                        autoFocus
                                                                    />

                                                                </div>
                                                            </div>

                                                            <div className="overflow-y-auto max-h-56">

                                                                {countries?.filter(
                                                                    (c) =>
                                                                        (c?.name || "")
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                searchCountryTerm.toLowerCase()
                                                                            )
                                                                ).length === 0 ? (

                                                                    <div className="p-4 text-[11px] text-[#7b8490] text-center">
                                                                        No matching countries found
                                                                    </div>

                                                                ) : (

                                                                    countries
                                                                        ?.filter((c) =>
                                                                            (c?.name || "")
                                                                                .toLowerCase()
                                                                                .includes(
                                                                                    searchCountryTerm.toLowerCase()
                                                                                )
                                                                        )
                                                                        .map((c) => (

                                                                            <button
                                                                                key={c.name}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setForm((p) => ({
                                                                                        ...p,
                                                                                        payroll_country:
                                                                                            c.name,
                                                                                    }));
                                                                                    setIsCountryDropdownOpen(
                                                                                        false
                                                                                    );
                                                                                    setSearchCountryTerm(
                                                                                        ""
                                                                                    );
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
                                                                                    ${String(
                                                                                    form.payroll_country
                                                                                ) ===
                                                                                        String(c.name)
                                                                                        ? "bg-[#edf4f9] text-[#3f6f91]"
                                                                                        : "text-[#4b5563] hover:bg-[#f6f8fa]"
                                                                                    }
                                                                                `}
                                                                            >

                                                                                <div>
                                                                                    <div className="font-medium">
                                                                                        {c.name}
                                                                                    </div>

                                                                                    {c.region && (
                                                                                        <div className="text-[10px] text-[#9aa1a9] mt-0.5">
                                                                                            {c.region}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {String(
                                                                                    form.payroll_country
                                                                                ) === String(c.name) && (
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

                                            {/* Currency */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Select Currency
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <div className="relative">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setIsCurrencyDropdownOpen(
                                                                !isCurrencyDropdownOpen
                                                            )
                                                        }
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
                                                            {(() => {
                                                                const selected = currencies?.find(
                                                                    (c) =>
                                                                        String(c.code).toUpperCase() ===
                                                                        String(
                                                                            form.currency
                                                                        ).toUpperCase() ||
                                                                        String(c.name).toLowerCase() ===
                                                                        String(
                                                                            form.currency
                                                                        ).toLowerCase()
                                                                );

                                                                if (selected) {
                                                                    return selected.name &&
                                                                        selected.name.toUpperCase() !==
                                                                        selected.code.toUpperCase()
                                                                        ? `${selected.code} - ${selected.name}`
                                                                        : selected.code;
                                                                }

                                                                return (
                                                                    form.currency ||
                                                                    "— No currency selected —"
                                                                );
                                                            })()}
                                                        </span>

                                                        <ChevronDown
                                                            className={`w-4 h-4 text-[#8b949e] transition-transform ${isCurrencyDropdownOpen
                                                                ? "rotate-180"
                                                                : ""
                                                                }`}
                                                        />

                                                    </button>

                                                    {isCurrencyDropdownOpen && (
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
                                                                        placeholder="Search currency..."
                                                                        value={searchCurrencyTerm}
                                                                        onChange={(e) =>
                                                                            setSearchCurrencyTerm(
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="
                                                                            w-full
                                                                            text-[11px]
                                                                            bg-transparent
                                                                            focus:outline-none
                                                                        "
                                                                        autoFocus
                                                                    />

                                                                </div>

                                                            </div>

                                                            <div className="overflow-y-auto max-h-56">

                                                                {currencyLoading ? (

                                                                    <div className="p-4 text-[11px] text-[#7b8490] text-center">
                                                                        Loading...
                                                                    </div>

                                                                ) : filteredCurrencies.length === 0 ? (

                                                                    <div className="p-4 text-[11px] text-[#7b8490] text-center">
                                                                        No matching currencies found
                                                                    </div>

                                                                ) : (

                                                                    filteredCurrencies.map((c) => {

                                                                        const isSelected =
                                                                            String(
                                                                                form.currency
                                                                            ).toUpperCase() ===
                                                                            String(c.code).toUpperCase();

                                                                        return (
                                                                            <button
                                                                                key={c.code}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setForm((p) => ({
                                                                                        ...p,
                                                                                        currency:
                                                                                            c.code,
                                                                                    }));
                                                                                    setIsCurrencyDropdownOpen(
                                                                                        false
                                                                                    );
                                                                                    setSearchCurrencyTerm(
                                                                                        ""
                                                                                    );
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
                                                                                    ${isSelected
                                                                                        ? "bg-[#edf4f9] text-[#3f6f91]"
                                                                                        : "text-[#4b5563] hover:bg-[#f6f8fa]"
                                                                                    }
                                                                                `}
                                                                            >

                                                                                <div className="flex items-center gap-2 min-w-0">

                                                                                    <span className="font-semibold">
                                                                                        {c.code}
                                                                                    </span>

                                                                                    {c.name &&
                                                                                        c.name.toUpperCase() !==
                                                                                        c.code.toUpperCase() && (
                                                                                            <span className="text-[#8b949e] truncate">
                                                                                                ({c.name})
                                                                                            </span>
                                                                                        )}

                                                                                </div>

                                                                                {isSelected && (
                                                                                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                                                                                )}

                                                                            </button>
                                                                        );

                                                                    })

                                                                )}

                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                            </div>

                                            {/* Effective Date */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Payroll Effective Date
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="date"
                                                    name="payroll_effective_date"
                                                    value={formatDateForInput(form.payroll_effective_date)}
                                                    onChange={(e) => setForm((p) => ({ ...p, payroll_effective_date: e.target.value }))}
                                                    className="w-full px-3 py-2.5 text-[11px] border border-[#e5e7eb] rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>

                                            {/* Payroll Cycle */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Payroll Cycle
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <select
                                                    value={form.payroll_cycle}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            payroll_cycle: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full
                                                        h-[38px]
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        text-[12px]
                                                        text-[#374151]
                                                        bg-white
                                                        hover:border-[#aeb7c1]
                                                        focus:outline-none
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                        focus:border-indigo-400
                                                        transition
                                                    "
                                                >
                                                    <option value="" disabled>
                                                        — No payroll cycle selected —
                                                    </option>

                                                    {[
                                                        { value: "MONTHLY", label: "Monthly" },
                                                        { value: "WEEKLY", label: "Weekly" },
                                                        {
                                                            value: "BI_WEEKLY",
                                                            label: "Bi Weekly",
                                                        },
                                                    ].map((o) => (
                                                        <option key={o.value} value={o.value}>
                                                            {o.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Working Days */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Working Days
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="number"
                                                    value={form.working_days}
                                                    min={1}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            working_days: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full
                                                        h-[38px]
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        text-[12px]
                                                        text-[#374151]
                                                        bg-white
                                                        hover:border-[#aeb7c1]
                                                        focus:outline-none
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                        focus:border-indigo-400
                                                        transition
                                                    "
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* CUT-OFF & PAYMENT */}
                                {/* ===================================================== */}

                                <div className="border border-[#d9dde2] m-5 mb-5">

                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-indigo-400 rounded-full mr-3" />

                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Cut-off & Payment
                                            </h3>

                                            <p className="text-[10px] text-[#7b8490]">
                                                Attendance, leave, overtime and salary payment dates
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4">

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                                            {/* Attendance */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Attendance Cut Off
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="number"
                                                    value={form.attendance_cut_off}
                                                    min={0}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            attendance_cut_off: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full h-[38px]
                                                        border border-[#cfd5db]
                                                        rounded-md px-3
                                                        text-[12px]
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                />
                                            </div>

                                            {/* Leave */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Leave Cut Off
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="text"
                                                    value={form.leave_cut_off}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            leave_cut_off: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full h-[38px]
                                                        border border-[#cfd5db]
                                                        rounded-md px-3
                                                        text-[12px]
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                />
                                            </div>

                                            {/* Overtime */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Overtime Cut Off
                                                </label>

                                                <input
                                                    type="number"
                                                    value={form.overtime_cut_off ?? ""}
                                                    min={0}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setForm((p) => ({
                                                            ...p,
                                                            overtime_cut_off:
                                                                val === "" ? null : val,
                                                        }));
                                                    }}
                                                    className="
                                                        w-full h-[38px]
                                                        border border-[#cfd5db]
                                                        rounded-md px-3
                                                        text-[12px]
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                />
                                            </div>

                                            {/* Salary Payment */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Salary Payment Date
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <OnlyPaymentDayPicker
                                                    name="salary_payment_date"
                                                    form={form}
                                                    setForm={setForm}
                                                    formData={form.salary_payment_date}
                                                    headerText="Salary Payment Day"
                                                    footerText="Salary will be paid on the selected day each month."
                                                    placeholder="Select payment day"
                                                />
                                            </div>

                                        </div>

                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* FINANCIAL YEAR & SALARY CALENDAR */}
                                {/* ===================================================== */}

                                <div className="border border-[#d9dde2] m-5 mb-5">

                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-indigo-400 rounded-full mr-3" />

                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Financial Year & Salary Calendar
                                            </h3>

                                            <p className="text-[10px] text-[#7b8490]">
                                                Define the financial year and payroll calendar
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4">

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                            {/* FY Start */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Financial Year Start Month
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="month"
                                                    value={form.financial_year_start_month}
                                                    onChange={(e) => setForm((p) => ({ ...p, financial_year_start_month: e.target.value }))}
                                                    className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 text-[12px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10"
                                                />
                                            </div>

                                            {/* FY End */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Financial Year End Month
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <input
                                                    type="month"
                                                    value={form.financial_year_end_month}
                                                    onChange={(e) => setForm((p) => ({ ...p, financial_year_end_month: e.target.value }))}
                                                    className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 text-[12px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10"
                                                />
                                            </div>

                                            {/* Salary Calendar */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Salary Calendar
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <select
                                                    value={form.salary_calendar}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            salary_calendar: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full
                                                        h-[38px]
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        text-[12px]
                                                        text-[#374151]
                                                        bg-white
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                >
                                                    <option value="" disabled>
                                                        — No salary calendar selected —
                                                    </option>

                                                    {[
                                                        {
                                                            value: "CALENDAR_MONTH",
                                                            label: "Calendar Month",
                                                        },
                                                        {
                                                            value: "FINANCIAL_MONTH",
                                                            label: "Financial Month",
                                                        },
                                                        {
                                                            value: "CUSTOM",
                                                            label: "Custom",
                                                        },
                                                    ].map((o) => (
                                                        <option key={o.value} value={o.value}>
                                                            {o.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                        </div>

                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* STATUS & REMARKS */}
                                {/* ===================================================== */}

                                <div className="border border-[#d9dde2] m-5 mb-5">

                                    <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                                        <div className="w-1 h-4 bg-indigo-400 rounded-full mr-3" />

                                        <div>
                                            <h3 className="text-[12px] font-semibold text-[#374151]">
                                                Status & Additional Information
                                            </h3>

                                            <p className="text-[10px] text-[#7b8490]">
                                                Set configuration status and add optional remarks
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4">

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                            {/* Status */}
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Status
                                                    <span className="text-red-500 ml-0.5">*</span>
                                                </label>

                                                <select
                                                    value={form.status}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            status: e.target.value,
                                                        }))
                                                    }
                                                    className="
                                                        w-full
                                                        h-[38px]
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        text-[12px]
                                                        bg-white
                                                        text-[#374151]
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                >
                                                    {[
                                                        {
                                                            value: "ACTIVE",
                                                            label: "Active",
                                                        },
                                                        {
                                                            value: "DRAFT",
                                                            label: "Draft",
                                                        },
                                                        {
                                                            value: "INACTIVE",
                                                            label: "Inactive",
                                                        },
                                                    ].map((o) => (
                                                        <option key={o.value} value={o.value}>
                                                            {o.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Remarks */}
                                            <div className="md:col-span-2">

                                                <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                                                    Remarks
                                                </label>

                                                <textarea
                                                    value={form.remarks}
                                                    onChange={(e) =>
                                                        setForm((p) => ({
                                                            ...p,
                                                            remarks: e.target.value,
                                                        }))
                                                    }
                                                    rows={3}
                                                    placeholder="Enter any additional payroll configuration remarks..."
                                                    className="
                                                        w-full
                                                        border
                                                        border-[#cfd5db]
                                                        rounded-md
                                                        px-3
                                                        py-2
                                                        text-[12px]
                                                        text-[#374151]
                                                        placeholder:text-[#a1a8b0]
                                                        resize-none
                                                        focus:outline-none
                                                        focus:border-indigo-400
                                                        focus:ring-2
                                                        focus:ring-indigo-400/10
                                                    "
                                                />

                                            </div>

                                        </div>

                                    </div>
                                </div>

                                {/* ===================================================== */}
                                {/* ACTION BAR */}
                                {/* ===================================================== */}

                                <div className="
                                    border-t
                                    border-[#d9dde2]
                                    bg-[#f7f8fa]
                                    px-5
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
                                        Reset Changes
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="
                                        inline-flex
                                        items-center
                                        justify-center
                                        gap-2
                                        h-[38px]
                                        px-6
                                        bg-indigo-600
                                        hover:bg-indigo-700
                                        active:bg-indigo-800
                                        disabled:opacity-60
                                        disabled:cursor-not-allowed
                                        text-white
                                        rounded-md
                                        text-[12px]
                                        font-semibold
                                        transition-colors
                                        cursor-pointer
                                        shadow-sm
                                    "
                                    >
                                        {submitting ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                            </div>
                                        ) : (
                                            <>
                                                <Save className="w-3.5 h-3.5" />
                                                Update Configuration
                                            </>
                                        )}
                                    </button>

                                </div>

                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PayrollEditConfig;
