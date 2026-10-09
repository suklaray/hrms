"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
    Briefcase,
    Layers,
} from "lucide-react";
import toast from "react-hot-toast";

interface ClientPageProps {
    id?: string;
}

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

// ─── Helper: Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const normalized = (status || "").toUpperCase();
    if (normalized === "DISBURSED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Disbursed
            </span>
        );
    }
    if (normalized === "INITIATED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Initiated
            </span>
        );
    }
    if (normalized === "GENERATED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Generated
            </span>
        );
    }
    if (normalized === "REJECTED") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Rejected
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {status || "Pending"}
        </span>
    );
}

export default function ClientPage({ id }: ClientPageProps) {
    const router = useRouter();
    const params = useParams();
    const payslipId = id || (params?.id as string);

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payroll, setPayroll] = useState<any>(null);
    const [availablePayslips, setAvailablePayslips] = useState<any[]>([]);

    // ─── Fetch Payslip Record ───────────────────────────────────────────────────
    const fetchPayslip = useCallback(async (targetId?: string) => {
        const queryId = targetId || payslipId;
        if (!queryId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/payslip/get-payslip?id=${encodeURIComponent(queryId)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to load payslip data");
            }

            setPayroll(data.data);
            if (Array.isArray(data.availablePayslips)) {
                setAvailablePayslips(data.availablePayslips);
            }
        } catch (err) {
            console.error("Error fetching payslip:", err);
            setError(err instanceof Error ? err.message : "Failed to load payslip");
        } finally {
            setLoading(false);
        }
    }, [payslipId]);

    useEffect(() => {
        fetchPayslip();
    }, [fetchPayslip]);

    // ─── Download PDF Handler ───────────────────────────────────────────────────
    const handleDownloadPdf = async () => {
        if (!payroll) return;
        const downloadTargetId = payroll.uid || payroll.id || payslipId;
        if (!downloadTargetId) return;

        setDownloading(true);
        const toastId = toast.loading("Generating payslip PDF...");
        try {
            const res = await fetch(
                `/api/payslip/get-payslip?id=${encodeURIComponent(downloadTargetId)}&download=true`
            );

            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                throw new Error(errJson?.error || "Failed to download PDF. Please try again.");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Payslip_${payroll.empid}_${payroll.period_name || "period"}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Payslip downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error("PDF download error:", err);
            toast.error(err instanceof Error ? err.message : "Download failed", { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    // ─── Print Handler ──────────────────────────────────────────────────────────
    const handlePrint = () => {
        window.print();
    };

    // ─── Loading State ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
                        <div className="flex gap-3">
                            <div className="h-10 w-28 bg-slate-200 rounded-lg animate-pulse" />
                            <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6">
                        <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Error / Empty State ────────────────────────────────────────────────────
    if (error || !payroll) {
        const isNotFound = error?.toLowerCase().includes("not found");
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
                <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${isNotFound ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                        {isNotFound ? <FileText className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        {isNotFound ? "No Payslip Available" : "Unable to Load Payslip"}
                    </h2>
                    <p className="text-sm text-slate-600 mb-6">
                        {isNotFound
                            ? "No payslip has been generated for your account yet. Once payroll is processed and released by HR, your payslip and breakdown will be visible here."
                            : (error || "The requested payslip could not be found or you do not have permission to view it.")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                            Go Back
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors inline-block"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Data Extraction & Preparation ──────────────────────────────────────────
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
        <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
            {/* ── Top Bar / Action Controls (Hidden on Print) ────────────────────────── */}
            <div className="mx-auto mb-6 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl p-4 sm:px-6 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                                    Payslip: {payroll.period_name || "Monthly Salary"}
                                </h1>
                                <StatusBadge status={payroll.status} />

                                {availablePayslips.length > 1 && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span className="text-xs text-slate-400 font-medium">Switch Period:</span>
                                        <select
                                            value={payroll.uid || payroll.id}
                                            onChange={(e) => fetchPayslip(e.target.value)}
                                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 hover:border-indigo-400 focus:outline-indigo-500 cursor-pointer"
                                        >
                                            {availablePayslips.map((p) => (
                                                <option key={p.uid || p.id} value={p.uid || p.id}>
                                                    {p.period_name} ({p.status})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Employee: {user.name || payroll.empid} • {payroll.empid}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
                        >
                            <Printer className="w-4 h-4 text-slate-500" />
                            <span>Print</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            {downloading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Preparing PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span>Download PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Official Payslip Document Card ────────────────────────────────────── */}
            <div className="mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-md print:shadow-none print:border-none print:rounded-none print:p-0 overflow-hidden">
                {/* Top Decorative Header Accent */}
                <div className="h-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 print:hidden" />

                <div className="p-6 sm:p-10 space-y-6">
                    {/* ── Header: Company Branding & Payslip Title ─────────────────────── */}
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

                    {/* ── Statutory Compliance Bar ──────────────────────────────────────── */}
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

                    {/* ── Employee Summary & Bank Details ───────────────────────────────── */}
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

                    {/* ── Attendance & Days Worked Summary ──────────────────────────────── */}
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

                    {/* ── Earnings & Deductions Tables (Side by Side) ────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Earnings */}
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

                            {/* Total Earnings Footer */}
                            <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900 mt-2">
                                <span>Total Gross Earnings</span>
                                <span className="text-sm font-extrabold">{formatCurrency(totalEarningsDisplay)}</span>
                            </div>
                        </div>

                        {/* Right Column: Deductions */}
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

                            {/* Total Deductions Footer */}
                            <div className="px-4 py-3 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs font-bold text-rose-900 mt-2">
                                <span>Total Deductions</span>
                                <span className="text-sm font-extrabold text-rose-700">
                                    -{formatCurrency(totalDeductionsDisplay)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Net Payable Salary Banner ──────────────────────────────────────── */}
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
                                <span className="text-sm font-bold text-white uppercase mt-0.5 block">
                                    {payroll.status || "CONFIRMED"}
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-1">
                                    Bank Transfer / Direct Deposit
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Signatures & Disclaimer Footer ─────────────────────────────────── */}
                    <div className="pt-8 border-t border-slate-200 space-y-6">
                        <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
                            <div>
                                <div className="h-12 border-b border-dashed border-slate-300 flex items-end pb-1 font-semibold text-slate-800">
                                    {company.name || "HR Department"}
                                </div>
                                <p className="pt-1.5 font-medium text-slate-500">Authorized Signatory</p>
                            </div>
                            <div className="text-right">
                                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-end pb-1 font-semibold text-slate-800">
                                    {user.name || payroll.empid}
                                </div>
                                <p className="pt-1.5 font-medium text-slate-500">Employee Signature</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-center text-[11px] text-slate-500 space-y-0.5">
                            <p className="font-semibold text-slate-600">
                                Note: This is a system-generated salary slip and does not require a physical signature.
                            </p>
                            <p>
                                For any discrepancy regarding salary computation or tax deductions, please contact the HR & Payroll desk.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
