"use client";

import Pageheader from "@/Components/PageHeader";
import { PayrollDetailsSkeleton } from "@/Components/Skeletons";
import Head from "@/lib/compatHead";
import formatDate from "@/lib/formatDate";
import { getOrdinal } from "@/lib/getNumberordinal";
import { formatLongDate } from "@/utils/dateTime";
import {
    Calculator,
    Search,
    X,
    Calendar,
    CreditCard,
    AlertCircle,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Clock,
    Gift,
    CheckCircle2,
    Code,
    Copy,
    Check,
    Lock,
    Unlock,
    AlertTriangle,
    RotateCcw,
    XCircle,
    MessageSquare,
    Send,
    ShieldAlert,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

function formatCurrency(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount));
}

function isWeekend(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const day = d.getDay(); // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
}

interface GeneratePayslipPageProps {
    id?: string;
    params?: Record<string, string | string[]>;
    user?: {
        id: number;
        empid: string;
        name: string;
        role: string;
        email: string;
    };
    permissions?: string[];
}

export default function GeneratePayslipPage({
    id,
    params: propParams,
    user,
    permissions,
}: GeneratePayslipPageProps) {
    const routeParams = useParams();
    const resolvedId = id || (routeParams?.id as string);

    const [payrollData, setPayrollData] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
    const [calculatedSalary, setCalculatedSalary] = useState<Record<string, any>>({});
    const [loadingEmployees, setLoadingEmployees] = useState<Record<string, boolean>>({});
    const [salaryPaymentDate, setSalaryPaymentDate] = useState<string>("");
    const [otHourlyRates, setOtHourlyRates] = useState<Record<string, number | string>>({});
    const [bonusAmounts, setBonusAmounts] = useState<Record<string, number | string>>({});
    const [submittingEmployees, setSubmittingEmployees] = useState<Record<string, boolean>>({});
    const [submittedPayrolls, setSubmittedPayrolls] = useState<Record<string, any>>({});
    const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
    const [copiedJson, setCopiedJson] = useState<boolean>(false);
    const [activeModalData, setActiveModalData] = useState<{ title: string; data: any; empName?: string; empid?: string } | null>(null);

    // User & RBAC resolution
    const [currentUser, setCurrentUser] = useState(user);
    const [userPermissions, setUserPermissions] = useState<Set<string>>(
        new Set(permissions || [])
    );

    useEffect(() => {
        if (!currentUser || (!permissions && userPermissions.size === 0)) {
            fetch("/api/auth/me")
                .then((res) => res.json())
                .then((d) => {
                    if (d?.user) setCurrentUser(d.user);
                    if (Array.isArray(d?.permissions)) {
                        setUserPermissions(new Set(d.permissions));
                    }
                })
                .catch(() => {});
        }
    }, [currentUser, permissions, userPermissions.size]);

    const isSuperAdmin = currentUser?.role === "super_admin";
    const canGenerate = isSuperAdmin || userPermissions.has(PERMISSION_KEYS.PAYSLIP_GENERATE);
    const canInitiate = isSuperAdmin || userPermissions.has(PERMISSION_KEYS.PAYSLIP_INITIATE);
    const canDisburse = isSuperAdmin || userPermissions.has(PERMISSION_KEYS.PAYSLIP_DISBURSED);

    // Call Back Modal (Request / Re-request)
    const [callbackModal, setCallbackModal] = useState<{
        isOpen: boolean;
        action: "REQUEST" | "RE_REQUEST";
        payrollUid: string;
        empid: string;
        employeeName: string;
        previousRejectNote?: string | null;
    } | null>(null);
    const [callbackReasonInput, setCallbackReasonInput] = useState<string>("");
    const [submittingCallback, setSubmittingCallback] = useState<boolean>(false);

    // Reject Call Back Modal
    const [rejectModal, setRejectModal] = useState<{
        isOpen: boolean;
        payrollUid: string;
        empid: string;
        employeeName: string;
        requestReason?: string | null;
    } | null>(null);
    const [rejectionNoteInput, setRejectionNoteInput] = useState<string>("");
    const [submittingReject, setSubmittingReject] = useState<boolean>(false);

    // Single initiate loading state
    const [initiatingEmployee, setInitiatingEmployee] = useState<Record<string, boolean>>({});

    async function fetchPayrollData() {
        if (!resolvedId) {
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`/api/payslip/generate?periodId=${resolvedId}`);
            const data = await response.json();
            setPayrollData(data);
            if (data?.data?.salary_payment_date) {
                const d = new Date(data.data.salary_payment_date);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setSalaryPaymentDate(`${yyyy}-${mm}-${dd}`);
                }
            }

            // 1. Populate payrolls if directly embedded in generate endpoint response
            const initialMap: Record<string, any> = {};
            if (Array.isArray(data?.data?.payrolls)) {
                data.data.payrolls.forEach((p: any) => {
                    if (p.empid) {
                        initialMap[p.empid] = p;
                        if (p.overtime_rate_perhour !== undefined && p.overtime_rate_perhour !== null) {
                            setOtHourlyRates((prev) => ({
                                ...prev,
                                [p.empid]: Number(p.overtime_rate_perhour),
                            }));
                        }
                        if (p.bonus_amount !== undefined && p.bonus_amount !== null) {
                            setBonusAmounts((prev) => ({
                                ...prev,
                                [p.empid]: Number(p.bonus_amount),
                            }));
                        }
                    }
                });
                setSubmittedPayrolls((prev) => ({ ...prev, ...initialMap }));
            }

            // 2. Query /api/payslip/initiate with periodId and period name for fresh status
            const periodUid = data?.data?.uid || resolvedId;
            const periodName = data?.data?.period_name;
            const queryParams = new URLSearchParams();
            if (periodUid) queryParams.set("periodId", periodUid);
            if (periodName) queryParams.set("period", periodName);

            fetch(`/api/payslip/initiate?${queryParams.toString()}`)
                .then((res) => res.json())
                .then((initData) => {
                    if (initData?.success && Array.isArray(initData.data)) {
                        const map: Record<string, any> = {};
                        initData.data.forEach((p: any) => {
                            if (p.empid) {
                                map[p.empid] = p;
                                if (p.overtime_rate_perhour !== undefined && p.overtime_rate_perhour !== null) {
                                    setOtHourlyRates((prev) => ({
                                        ...prev,
                                        [p.empid]: Number(p.overtime_rate_perhour),
                                    }));
                                }
                                if (p.bonus_amount !== undefined && p.bonus_amount !== null) {
                                    setBonusAmounts((prev) => ({
                                        ...prev,
                                        [p.empid]: Number(p.bonus_amount),
                                    }));
                                }
                            }
                        });
                        setSubmittedPayrolls((prev) => ({ ...prev, ...map }));
                    }
                })
                .catch((err) => console.error("Error fetching initiated payrolls:", err));
        } catch (error) {
            console.error("Error fetching payroll data:", error);
        } finally {
            setLoading(false);
        }
    }

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/auth/employees");
            const data = await res.json();

            if (res.ok && data.success) {
                setEmployees(Array.isArray(data.users) ? data.users : []);
            } else {
                setEmployees([]);
                toast.error(data.error || "Failed to load employees");
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setEmployees([]);
            toast.error("An error occurred while fetching employees");
        }
    };

    useEffect(() => {
        fetchPayrollData();
        fetchEmployees();
    }, []);

    const handleCalculateSalary = async (employeeId: string) => {
        const existing = submittedPayrolls[employeeId];
        const status = existing?.status ? String(existing.status).toUpperCase() : "";
        if (status === "INITIATED" || status === "DISBURSED" || status === "REJECTED") {
            toast.warning(`Payroll for this employee is ${status} and cannot be modified.`);
            return;
        }

        const isCurrentlyOpen = !!expandedEmployees[employeeId];

        setExpandedEmployees((prev) => ({
            ...prev,
            [employeeId]: !isCurrentlyOpen,
        }));

        if (isCurrentlyOpen) {
            return;
        }

        setLoadingEmployees((prev) => ({
            ...prev,
            [employeeId]: true,
        }));

        try {
            const res = await fetch(`/api/payslip/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    periodId: resolvedId,
                    empId: employeeId,
                }),
            });

            const data = await res.json();

            if (res.ok && (data.success || data.employee || data.totalPayableAmount !== undefined)) {
                if (data.message) {
                    toast.success(data.message);
                }
                setCalculatedSalary((prev) => ({
                    ...prev,
                    [employeeId]: data,
                }));
            } else {
                toast.error(data.error || data.message || "Failed to calculate salary");
            }
        } catch (error) {
            console.error("Error fetching payroll data:", error);
            toast.error("An error occurred while fetching payroll data");
        } finally {
            setLoadingEmployees((prev) => ({
                ...prev,
                [employeeId]: false,
            }));
        }
    };

    const generateIndividualPayload = (empid: string) => {
        const emp = employees.find((e) => e.empid === empid);
        const calc = calculatedSalary[empid];
        if (!emp || !calc) return null;

        const existing = submittedPayrolls[empid];
        const otHours = Number(calc.attendance?.overtimeHours || 0);
        const otRate = parseFloat(String(otHourlyRates[empid] ?? (existing?.overtime_rate_perhour ?? 0))) || 0;
        const otTotalPayable = Math.round(otHours * otRate * 100) / 100;
        const basePayableAmount = Number(calc.totalPayableAmount || 0);
        const bonus = parseFloat(String(bonusAmounts[empid] ?? (existing?.bonus_amount ?? 0))) || 0;
        const finalTotalPayableAmount = Math.round((basePayableAmount + otTotalPayable + bonus) * 100) / 100;

        const bankDetails = calc.employee?.employeeProfile?.bank_details?.[0] || emp?.employeeProfile?.bank_details?.[0] || null;

        return {
            uid: existing?.uid || undefined,
            companyInfo: {
                id: payrollData?.data?.company?.uid ?? null,
                name: payrollData?.data?.company?.name ?? "N/A",
                address: payrollData?.data?.company?.address ?? "",
                email: payrollData?.data?.company?.email ?? "",
                contact_number: payrollData?.data?.company?.contact_number ?? "",
                website: payrollData?.data?.company?.website ?? "",
                logo_url: payrollData?.data?.company?.logo_url ?? "",
            },
            employeeInfo: {
                id: calc.employee?.id ?? emp.id,
                empid: calc.employee?.empid ?? emp.empid,
                name: calc.employee?.name ?? emp.name,
                email: calc.employee?.email ?? emp.email,
                position: calc.employee?.position ?? emp.position,
                employeeType: calc.employee?.employeeType ?? emp.employee_type,
                role: calc.employee?.role ?? emp?.rbacRole?.name ?? "Employee",
                dateOfJoining: calc.employee?.dateOfJoining ?? emp.date_of_joining,
            },
            bankDetails: bankDetails
                ? {
                    account_holder_name: bankDetails.account_holder_name,
                    bank_name: bankDetails.bank_name,
                    branch_name: bankDetails.branch_name,
                    account_number: bankDetails.account_number,
                    ifsc_code: bankDetails.ifsc_code,
                    checkbook_document: bankDetails.checkbook_document,
                }
                : null,
            period: {
                name: payrollData?.data?.period_name ?? null,
                uid: payrollData?.data?.uid ?? resolvedId ?? null,
            },
            salaryDetails: {
                structureName: calc.salary?.structureName,
                employeeSalaryStructureId: calc.salary?.employeeSalaryStructureId,
                grossSalary: calc.salary?.grossSalary,
                totalDeductions: calc.salary?.totalDeductions,
                netSalary: calc.salary?.netSalary,
                earnings: calc.salary?.earnings || [],
                deductions: calc.salary?.deductions || [],
                attendance: {
                    totalWorkingDays: calc.attendance?.totalWorkingDays,
                    daysWorked: calc.attendance?.daysWorked,
                    daysAbsent: calc.attendance?.daysAbsent,
                    overtimeHours: calc.attendance?.overtimeHours,
                    weekend: calc.attendance?.weekend,
                },
                leaves: calc.leaves || [],
                overtime: {
                    hours: otHours,
                    ratePerHour: otRate,
                    amount: otTotalPayable,
                },
                bonusAmount: bonus,
                bonus_amount: bonus,
                basePayableAmount: basePayableAmount,
            },
            bonusAmount: bonus,
            bonus_amount: bonus,
            salaryPaymentDate:
                salaryPaymentDate ||
                (payrollData?.data?.salary_payment_date
                    ? payrollData.data.salary_payment_date.split("T")[0]
                    : null),
            totalPayableAmount: finalTotalPayableAmount,
        };
    };

    const handleSubmitIndividualPayroll = async (empid: string) => {
        const existing = submittedPayrolls[empid];
        const currentStatus = existing?.status ? String(existing.status).toUpperCase() : "";
        if (currentStatus === "INITIATED" || currentStatus === "DISBURSED" || currentStatus === "REJECTED") {
            toast.error(`Payroll for this employee is ${currentStatus} and cannot be modified.`);
            return;
        }

        if (currentStatus === "GENERATED") {
            const cbStatus = existing?.callback_status ? String(existing.callback_status).toUpperCase() : "NONE";
            if (cbStatus !== "APPROVED") {
                if (cbStatus === "REQUESTED") {
                    toast.warning("Call back is awaiting initiator approval. Edits are locked until approved.");
                } else {
                    toast.warning("Payroll is generated. You must request a call back and have it approved before updating.");
                }
                return;
            }
        }

        const payload = generateIndividualPayload(empid);
        if (!payload) {
            toast.error("Please calculate salary first before submitting.");
            return;
        }

        try {
            setSubmittingEmployees((prev) => ({ ...prev, [empid]: true }));
            const res = await fetch("/api/payslip/initiate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ payload }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const isUpdate = currentStatus === "GENERATED" || !!existing;
                toast.success(
                    data.message ||
                    (isUpdate
                        ? `Payroll for ${payload.employeeInfo.name} updated & re-generated successfully!`
                        : `Payroll for ${payload.employeeInfo.name} generated successfully!`)
                );
                setSubmittedPayrolls((prev) => ({
                    ...prev,
                    [empid]: {
                        ...data.data,
                        callback_status: "NONE",
                        callback_reason: null,
                        callback_rejection_note: null,
                    },
                }));
            } else {
                toast.error(data.message || data.error || "Failed to process payroll");
            }
        } catch (error: any) {
            console.error("Error submitting payroll:", error);
            toast.error("An error occurred while submitting payroll");
        } finally {
            setSubmittingEmployees((prev) => ({ ...prev, [empid]: false }));
        }
    };

    // 1. Request / Re-request Call Back (Person 1 - Maker / Generator)
    const handleOpenCallbackModal = (
        action: "REQUEST" | "RE_REQUEST",
        payrollUid: string,
        empid: string,
        employeeName: string,
        previousRejectNote?: string | null
    ) => {
        setCallbackModal({
            isOpen: true,
            action,
            payrollUid,
            empid,
            employeeName,
            previousRejectNote,
        });
        setCallbackReasonInput("");
    };

    const submitCallbackRequest = async () => {
        if (!callbackModal) return;
        const { action, payrollUid, empid, employeeName } = callbackModal;
        try {
            setSubmittingCallback(true);
            const res = await fetch("/api/payslip/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    uid: payrollUid,
                    reason: callbackReasonInput.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Call back requested for ${employeeName}`);
                setSubmittedPayrolls((prev) => ({
                    ...prev,
                    [empid]: {
                        ...(prev[empid] || {}),
                        ...data.data,
                        callback_status: "REQUESTED",
                        callback_reason: callbackReasonInput.trim() || null,
                        callback_rejection_note: null,
                    },
                }));
                setCallbackModal(null);
            } else {
                toast.error(data.message || "Failed to request call back");
            }
        } catch (err: unknown) {
            console.error("Error requesting call back:", err);
            toast.error("An error occurred while requesting call back");
        } finally {
            setSubmittingCallback(false);
        }
    };

    // 2. Approve Call Back (Person 2 - Checker / Initiator)
    const handleApproveCallback = async (payrollUid: string, empid: string, employeeName: string) => {
        try {
            const res = await fetch("/api/payslip/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "APPROVE",
                    uid: payrollUid,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Call back approved for ${employeeName}`);
                const newStatus = data.data?.status || "GENERATED";
                const newCallbackStatus = data.data?.callback_status || "NONE";
                setSubmittedPayrolls((prev) => ({
                    ...prev,
                    [empid]: {
                        ...(prev[empid] || {}),
                        ...data.data,
                        status: newStatus,
                        callback_status: newCallbackStatus,
                        callback_reason: null,
                        callback_rejection_note: null,
                    },
                }));
            } else {
                toast.error(data.message || "Failed to approve call back");
            }
        } catch (err: unknown) {
            console.error("Error approving call back:", err);
            toast.error("An error occurred while approving call back");
        }
    };

    // 3. Reject Call Back (Person 2 - Checker / Initiator)
    const handleOpenRejectModal = (
        payrollUid: string,
        empid: string,
        employeeName: string,
        requestReason?: string | null
    ) => {
        setRejectModal({
            isOpen: true,
            payrollUid,
            empid,
            employeeName,
            requestReason,
        });
        setRejectionNoteInput("");
    };

    const submitCallbackRejection = async () => {
        if (!rejectModal) return;
        const { payrollUid, empid, employeeName } = rejectModal;
        if (!rejectionNoteInput.trim()) {
            toast.error("Please provide a reason note for rejecting the call back request.");
            return;
        }
        try {
            setSubmittingReject(true);
            const res = await fetch("/api/payslip/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "REJECT",
                    uid: payrollUid,
                    rejection_note: rejectionNoteInput.trim(),
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Call back rejected for ${employeeName}`);
                setSubmittedPayrolls((prev) => ({
                    ...prev,
                    [empid]: {
                        ...(prev[empid] || {}),
                        ...data.data,
                        callback_status: "REJECTED",
                        callback_rejection_note: rejectionNoteInput.trim(),
                    },
                }));
                setRejectModal(null);
            } else {
                toast.error(data.message || "Failed to reject call back");
            }
        } catch (err: unknown) {
            console.error("Error rejecting call back:", err);
            toast.error("An error occurred while rejecting call back");
        } finally {
            setSubmittingReject(false);
        }
    };

    // 4. Initiate Payroll Single (Person 2 - Initiator)
    const handleInitiateSingle = async (payrollUid: string, empid: string, employeeName: string) => {
        const existing = submittedPayrolls[empid];
        if (existing?.callback_status === "REQUESTED") {
            toast.error("Cannot initiate: A call back request is currently pending approval.");
            return;
        }
        if (existing?.callback_status === "APPROVED") {
            toast.error("Cannot initiate: Call back was approved; waiting for generator to update and re-generate.");
            return;
        }
        try {
            setInitiatingEmployee((prev) => ({ ...prev, [empid]: true }));
            const res = await fetch(`/api/payslip/initiate?uid=${payrollUid}&status=INITIATED`, {
                method: "PUT",
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || `Payroll for ${employeeName} initiated successfully!`);
                setSubmittedPayrolls((prev) => ({
                    ...prev,
                    [empid]: {
                        ...(prev[empid] || {}),
                        ...data.data,
                        status: "INITIATED",
                        callback_status: "NONE",
                    },
                }));
            } else {
                toast.error(data.message || "Failed to initiate payroll");
            }
        } catch (err: unknown) {
            console.error("Error initiating payroll:", err);
            toast.error("An error occurred while initiating payroll");
        } finally {
            setInitiatingEmployee((prev) => ({ ...prev, [empid]: false }));
        }
    };

    return (
        <>
            <Head>
                <title>Manage Payroll Periods - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Salary Initiation"
                        description="Initiate salary for the selected financial year and payroll period."
                        href="/payroll/payroll-setup/payroll-get-periods"
                    />
                    {
                        loading ? (<PayrollDetailsSkeleton />) : (

                            <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="w-full mx-auto border border-slate-300 bg-white text-[12px] text-slate-800 font-sans shadow-sm">

                                    {/* TOP HEADER — CHEQUE / DOCUMENT IDENTITY */}
                                    <div className="relative px-5 py-3 border-b border-slate-300 bg-slate-50">

                                        <div className="flex items-start justify-between gap-8">

                                            {/* Company */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 border border-slate-400 bg-white flex items-center justify-center text-[11px] font-bold text-slate-700">
                                                        AT
                                                    </div>

                                                    <div>
                                                        <div className="text-[14px] font-bold tracking-wide text-slate-900">
                                                            {payrollData?.data?.company?.name}
                                                        </div>

                                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                                            {payrollData?.data?.company?.address}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payroll Period */}
                                            <div className="text-right shrink-0">
                                                <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                                                    Payroll Period
                                                </div>

                                                <div className="text-[14px] font-bold tracking-wide text-slate-900">
                                                    {payrollData?.data?.period_name}
                                                </div>

                                                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                                    {formatDate(payrollData?.data?.period_start)}&nbsp;&nbsp;—&nbsp;&nbsp;{formatDate(payrollData?.data?.period_end)}
                                                </div>
                                            </div>

                                        </div>

                                        {/* Small document reference line */}
                                        <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex justify-between text-[9px] uppercase tracking-wider text-slate-400">
                                            <span>Payroll Configuration Record</span>
                                            <span>Configuration No. {payrollData?.data?.payroll_configuration?.uid}</span>
                                        </div>
                                    </div>


                                    {/* MIDDLE STRIP — CHEQUE DETAILS */}
                                    <div className="relative border-b border-slate-300 bg-white">

                                        {/* Security / MICR-like line */}
                                        <div className="h-1 border-y border-slate-200 bg-slate-100" />

                                        <div className="grid grid-cols-5 divide-x divide-slate-200">

                                            <div className="px-4 py-2.5">
                                                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                    Attendance Cut-off
                                                </div>

                                                <div className="mt-1 font-mono font-semibold text-slate-900">
                                                    {payrollData?.data?.payroll_configuration?.attendance_cut_off}&nbsp;H
                                                </div>
                                            </div>

                                            <div className="px-4 py-2.5">
                                                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                    Leave Cut-off
                                                </div>

                                                <div className="mt-1 font-medium text-slate-900">
                                                    {payrollData?.data?.payroll_configuration?.leave_cut_off}
                                                </div>
                                            </div>

                                            <div className="px-4 py-2.5">
                                                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                    Overtime Cut-off
                                                </div>

                                                <div className="mt-1 font-mono font-semibold text-slate-900">
                                                    {payrollData?.data?.payroll_configuration?.overtime_cut_off}&nbsp;H
                                                </div>
                                            </div>

                                            <div className="px-4 py-2.5">
                                                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                    Salary Calendar
                                                </div>

                                                <div className="mt-1 font-mono font-semibold text-slate-900">
                                                    {payrollData?.data?.payroll_configuration?.salary_calendar}
                                                </div>
                                            </div>

                                            <div className="px-4 py-2.5">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                        Salary Payment Date
                                                    </div>
                                                    {isWeekend(salaryPaymentDate) && (
                                                        <span
                                                            className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                                                            title="Selected date falls on a weekend"
                                                        >
                                                            Weekend
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1 flex items-center gap-1.5">
                                                    <input
                                                        type="date"
                                                        value={salaryPaymentDate}
                                                        onChange={(e) => setSalaryPaymentDate(e.target.value)}
                                                        className={`font-mono text-[11px] font-semibold rounded px-2 py-0.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${isWeekend(salaryPaymentDate)
                                                            ? "bg-amber-50/70 border-amber-300 text-amber-900"
                                                            : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                                                            }`}
                                                    />
                                                </div>

                                                {isWeekend(salaryPaymentDate) ? (
                                                    <div className="text-[8px] text-amber-600 mt-0.5 font-medium">
                                                        Falls on weekend — adjustable
                                                    </div>
                                                ) : (
                                                    <div className="text-[8px] text-slate-400 mt-0.5 font-mono">
                                                        {formatLongDate(salaryPaymentDate || payrollData?.data?.salary_payment_date)}
                                                    </div>
                                                )}
                                            </div>

                                        </div>

                                        {/* Cheque-like perforation */}
                                        <div className="border-t border-dashed border-slate-300" />
                                    </div>


                                    {/* BOTTOM LEDGER SECTION */}
                                    <div className="grid grid-cols-12 divide-x divide-slate-200">

                                        {/* Financial Year */}
                                        <div className="col-span-3 px-4 py-3">

                                            <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                                                Financial Year
                                            </div>

                                            <div className="mt-1 text-[13px] font-bold tracking-wide text-slate-900">
                                                {payrollData?.data?.financial_year?.name}
                                            </div>

                                            <div className="mt-1 text-[10px] font-mono text-slate-500">
                                                {formatDate(payrollData?.data?.financial_year?.start_date)} - {formatDate(payrollData?.data?.financial_year?.end_date)}
                                            </div>

                                        </div>


                                        {/* Approval */}
                                        <div className="col-span-2 px-4 py-3">

                                            <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                                                Approval
                                            </div>

                                            <div className={`${payrollData?.data?.payroll_configuration?.approval === 'pending' ? 'text-amber-600' : 'text-emerald-600'} mt-1 inline-flex items-center gap-1.5 font-semibold`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${payrollData?.data?.payroll_configuration?.approval === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                {payrollData?.data?.payroll_configuration?.approval}
                                            </div>

                                        </div>


                                        {/* Status */}
                                        <div className="col-span-2 px-4 py-3">

                                            <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                                                Status
                                            </div>

                                            <div className="mt-1 inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {payrollData?.data?.payroll_configuration?.status}
                                            </div>

                                        </div>


                                        {/* Remarks */}
                                        <div className="col-span-5 px-4 py-3">

                                            <div className="text-[9px] uppercase tracking-[0.16em] text-slate-400">
                                                Cycle
                                            </div>

                                            <div className="mt-1 text-[11px] text-slate-700">
                                                {payrollData?.data?.payroll_configuration?.payroll_cycle}
                                            </div>

                                        </div>

                                    </div>


                                    {/* BOTTOM CHEQUE / MICR STYLE FOOTER */}
                                    <div className="border-t border-slate-300 px-5 py-2 bg-slate-50/70 flex items-center justify-between">

                                        <div className="font-mono text-[9px] tracking-[0.25em] text-slate-400">
                                            ||| PAYROLL • CONFIGURATION • 2026 |||
                                        </div>

                                        <div className="font-mono text-[9px] tracking-wider text-slate-400">
                                            HR / PAYROLL SYSTEM
                                        </div>

                                    </div>
                                </div>

                                <div className="w-full mx-auto mt-3 border border-slate-300 bg-white text-[12px] text-slate-800 font-sans shadow-sm">

                                    {/* TABLE HEADER / DOCUMENT TITLE */}
                                    <div className="px-5 py-3 border-b border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">
                                                Payroll Register
                                            </div>

                                            <div className="mt-0.5 text-[13px] font-bold tracking-wide text-slate-900 flex items-center gap-2">
                                                <span>Employee Payroll Summary</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap sm:justify-end">
                                            {/* Summary status pill counters */}
                                            {(() => {
                                                const totalEmps = employees.length;
                                                let countGen = 0;
                                                let countInit = 0;
                                                let countDisb = 0;
                                                let countRej = 0;
                                                let countPend = 0;
                                                employees.forEach((emp) => {
                                                    const s = submittedPayrolls[emp.empid]?.status ? String(submittedPayrolls[emp.empid].status).toUpperCase() : "";
                                                    if (s === "GENERATED") countGen++;
                                                    else if (s === "INITIATED") countInit++;
                                                    else if (s === "DISBURSED") countDisb++;
                                                    else if (s === "REJECTED") countRej++;
                                                    else countPend++;
                                                });
                                                return (
                                                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                                                            Total: {totalEmps}
                                                        </span>
                                                        {countGen > 0 && (
                                                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold font-mono">
                                                                Generated: {countGen}
                                                            </span>
                                                        )}
                                                        {countInit > 0 && (
                                                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold font-mono">
                                                                Initiated: {countInit}
                                                            </span>
                                                        )}
                                                        {countDisb > 0 && (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                                                                Disbursed: {countDisb}
                                                            </span>
                                                        )}
                                                        {countRej > 0 && (
                                                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold font-mono">
                                                                Rejected: {countRej}
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 font-mono">
                                                            Pending: {countPend}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            <div className="text-right pl-3 sm:border-l border-slate-200">
                                                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                                                    Period
                                                </div>

                                                <div className="font-mono text-[11px] font-semibold text-slate-700">
                                                    {payrollData?.data?.period_name}
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* LEDGER TABLE */}
                                    <div className="overflow-x-auto">

                                        <table className="w-full border-collapse">

                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-300">

                                                    <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        #
                                                    </th>

                                                    <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        Employee
                                                    </th>

                                                    <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        Employee ID
                                                    </th>

                                                    <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        Employee Type
                                                    </th>

                                                    <th className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        Role
                                                    </th>

                                                    <th className="px-4 py-2.5 text-center text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500 border-r border-slate-200">
                                                        Status
                                                    </th>

                                                    <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">
                                                        Action
                                                    </th>

                                                </tr>
                                            </thead>

                                            <tbody>
                                                {
                                                    employees.map((employee, index) => {
                                                        const isExpanded = !!expandedEmployees[employee.empid];
                                                        const existingPayroll = submittedPayrolls[employee.empid];
                                                        const rawStatus = existingPayroll?.status ? String(existingPayroll.status).toUpperCase() : "";
                                                        const callbackStatus = existingPayroll?.callback_status ? String(existingPayroll.callback_status).toUpperCase() : "NONE";
                                                        const isGenerated = rawStatus === "GENERATED";
                                                        const isInitiated = rawStatus === "INITIATED";
                                                        const isDisbursed = rawStatus === "DISBURSED";
                                                        const isRejected = rawStatus === "REJECTED";
                                                        const isLocked = isDisbursed || isRejected;

                                                        const isCallbackRequested = isGenerated && callbackStatus === "REQUESTED";
                                                        const isCallbackApproved = isGenerated && callbackStatus === "APPROVED";
                                                        const isCallbackRejected = isGenerated && callbackStatus === "REJECTED";

                                                        const isInitCallbackRequested = isInitiated && callbackStatus === "REQUESTED";
                                                        const isInitCallbackRejected = isInitiated && callbackStatus === "REJECTED";

                                                        return (
                                                            <Fragment key={employee.empid}>
                                                                <tr className={`border-b border-slate-200 transition-colors ${isExpanded
                                                                    ? "bg-slate-50/80"
                                                                    : isLocked
                                                                        ? "bg-slate-50/40 hover:bg-slate-50/70"
                                                                        : "hover:bg-slate-50"
                                                                    }`}>

                                                                    <td className="px-4 py-2.5 font-mono text-slate-400 border-r border-slate-100">
                                                                        {index + 1}
                                                                    </td>

                                                                    <td className="px-4 py-2.5 border-r border-slate-100">
                                                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                                            <span>{employee.name}</span>
                                                                        </div>

                                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                                            {employee.position}
                                                                        </div>
                                                                    </td>

                                                                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 border-r border-slate-100">
                                                                        {employee.empid}
                                                                    </td>

                                                                    <td className="px-4 py-2.5 font-mono text-slate-700 border-r border-slate-100">
                                                                        {employee.employee_type}
                                                                    </td>

                                                                    <td className="px-4 py-2.5 text-slate-700 border-r border-slate-100">
                                                                        {employee?.rbacRole?.name || 'N/A'}
                                                                    </td>

                                                                    {/* Status Column */}
                                                                    <td className="px-4 py-2.5 text-center border-r border-slate-100">
                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                            {isGenerated ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                                                                                    <CheckCircle2 size={10} className="text-blue-600" />
                                                                                    <span>Generated</span>
                                                                                </span>
                                                                            ) : isInitiated ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                                                                    <Clock size={10} className="text-indigo-600" />
                                                                                    <span>Initiated</span>
                                                                                </span>
                                                                            ) : isDisbursed ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                                    <CheckCircle2 size={10} className="text-emerald-600" />
                                                                                    <span>Disbursed</span>
                                                                                </span>
                                                                            ) : isRejected ? (
                                                                                <div className="flex flex-col items-center gap-1">
                                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                                                                                        <AlertCircle size={10} className="text-rose-600" />
                                                                                        <span>Rejected</span>
                                                                                    </span>
                                                                                    {existingPayroll?.rejection_note && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                toast.info(
                                                                                                    `Disburser Payout Rejection Note: "${existingPayroll.rejection_note}"`,
                                                                                                    { autoClose: 7000 }
                                                                                                );
                                                                                            }}
                                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition cursor-pointer"
                                                                                            title={`Disburser rejection note: "${existingPayroll.rejection_note}"`}
                                                                                        >
                                                                                            <MessageSquare size={9} className="text-rose-700" />
                                                                                            <span>Note</span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                                    <span>Pending</span>
                                                                                </span>
                                                                            )}

                                                                            {/* Maker-Checker Call Back Sub-Badges */}
                                                                            {isCallbackRequested && (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                                                                    title={existingPayroll?.callback_reason ? `Reason: ${existingPayroll.callback_reason}` : "Call back requested, pending approval"}
                                                                                >
                                                                                    <Clock size={9} className="text-amber-700" />
                                                                                    <span>Call Back Requested</span>
                                                                                </span>
                                                                            )}
                                                                            {isCallbackApproved && (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300"
                                                                                    title="Call back approved. Unlocked for editing by generator."
                                                                                >
                                                                                    <CheckCircle2 size={9} className="text-emerald-700" />
                                                                                    <span>Call Back Approved</span>
                                                                                </span>
                                                                            )}
                                                                            {isCallbackRejected && (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300 cursor-pointer"
                                                                                    onClick={() => {
                                                                                        toast.info(
                                                                                            `Rejection Note: ${existingPayroll?.callback_rejection_note || "No note provided"}`,
                                                                                            { autoClose: 6000 }
                                                                                        );
                                                                                    }}
                                                                                    title={`Call back rejected. Note: ${existingPayroll?.callback_rejection_note || "No note provided"}`}
                                                                                >
                                                                                    <XCircle size={9} className="text-rose-700" />
                                                                                    <span>Call Back Rejected</span>
                                                                                </span>
                                                                            )}

                                                                            {isInitCallbackRequested && (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                                                                    title={existingPayroll?.callback_reason ? `Reason: ${existingPayroll.callback_reason}` : "Call back requested, awaiting disburser approval"}
                                                                                >
                                                                                    <Clock size={9} className="text-amber-700" />
                                                                                    <span>Call Back Requested</span>
                                                                                </span>
                                                                            )}
                                                                            {isInitCallbackRejected && (
                                                                                <span
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300 cursor-pointer"
                                                                                    onClick={() => {
                                                                                        toast.info(
                                                                                            `Disburser Rejection Note: ${existingPayroll?.callback_rejection_note || "No note provided"}`,
                                                                                            { autoClose: 6000 }
                                                                                        );
                                                                                    }}
                                                                                    title={`Call back rejected by disburser. Note: ${existingPayroll?.callback_rejection_note || "No note provided"}`}
                                                                                >
                                                                                    <XCircle size={9} className="text-rose-700" />
                                                                                    <span>Call Back Rejected</span>
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* Action Column */}
                                                                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                                            {isLocked ? (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled
                                                                                    title={`Payroll is ${rawStatus}. Further edits are disabled.`}
                                                                                    className="px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] font-semibold rounded bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed inline-flex items-center gap-1 shadow-none"
                                                                                >
                                                                                    <Lock size={11} className="text-slate-400" />
                                                                                    <span>{rawStatus}</span>
                                                                                </button>
                                                                            ) : isInitiated ? (
                                                                                <>
                                                                                    {/* 1. Toggle Breakdown */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleCalculateSalary(employee.empid)}
                                                                                        className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded transition shadow-2xs inline-flex items-center gap-1 cursor-pointer ${
                                                                                            isExpanded
                                                                                                ? "bg-slate-800 text-white hover:bg-slate-700"
                                                                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                                                                        }`}
                                                                                        title={
                                                                                            isExpanded
                                                                                                ? "Close calculation breakdown"
                                                                                                : "View salary calculation breakdown"
                                                                                        }
                                                                                    >
                                                                                        {isExpanded ? <X size={12} /> : <FileText size={12} />}
                                                                                        <span>{isExpanded ? "Close" : "View"}</span>
                                                                                    </button>

                                                                                    {/* 2. Initiator Actions for INITIATED: Request / Re-request Call Back */}
                                                                                    {canInitiate && (
                                                                                        <>
                                                                                            {(!callbackStatus || callbackStatus === "NONE") && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleOpenCallbackModal("REQUEST", existingPayroll.uid, employee.empid, employee.name)}
                                                                                                    className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                    title="Request call back from disburser to return payroll to Generated status"
                                                                                                >
                                                                                                    <RotateCcw size={11} className="text-amber-700" />
                                                                                                    <span>Call Back</span>
                                                                                                </button>
                                                                                            )}
                                                                                            {isInitCallbackRejected && (
                                                                                                <div className="inline-flex items-center gap-1">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            toast.info(
                                                                                                                `Disburser Rejection Note: ${existingPayroll.callback_rejection_note || "No note provided"}`,
                                                                                                                { autoClose: 6000 }
                                                                                                            );
                                                                                                        }}
                                                                                                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 inline-flex items-center gap-1 transition cursor-pointer"
                                                                                                        title={`View disburser rejection note: "${existingPayroll.callback_rejection_note || 'No note'}"`}
                                                                                                    >
                                                                                                        <span>Note</span>
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleOpenCallbackModal("RE_REQUEST", existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_rejection_note)}
                                                                                                        className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                        title={`Re-request call back from disburser. Note: "${existingPayroll.callback_rejection_note || 'No note'}"`}
                                                                                                    >
                                                                                                        <RotateCcw size={11} className="text-rose-700" />
                                                                                                        <span>Re-request</span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}

                                                                                    {/* 3. Disburser Actions for INITIATED: Approve / Reject Call Back */}
                                                                                    {canDisburse && isInitCallbackRequested && (
                                                                                        <div className="inline-flex items-center gap-1">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleApproveCallback(existingPayroll.uid, employee.empid, employee.name)}
                                                                                                className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                title={`Approve call back for ${employee.name} and return status to GENERATED${existingPayroll.callback_reason ? ` (Reason: ${existingPayroll.callback_reason})` : ''}`}
                                                                                            >
                                                                                                <Check size={11} />
                                                                                                <span>Approve</span>
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleOpenRejectModal(existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_reason)}
                                                                                                className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                title="Reject call back request with a reason note"
                                                                                            >
                                                                                                <X size={11} />
                                                                                                <span>Reject</span>
                                                                                            </button>
                                                                                        </div>
                                                                                    )}

                                                                                    {!canDisburse && isInitCallbackRequested && (
                                                                                        <span
                                                                                            className="px-2 py-1 text-[9px] font-medium rounded bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1"
                                                                                            title="Call back requested. Awaiting approval by Disburser."
                                                                                        >
                                                                                            <Clock size={10} className="text-amber-600 animate-spin" />
                                                                                            <span>Awaiting Disburser</span>
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            ) : isGenerated ? (
                                                                                <>
                                                                                    {/* 1. Toggle Breakdown */}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleCalculateSalary(employee.empid)}
                                                                                        className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded transition shadow-2xs inline-flex items-center gap-1 cursor-pointer ${
                                                                                            isExpanded
                                                                                                ? "bg-slate-800 text-white hover:bg-slate-700"
                                                                                                : isCallbackApproved && canGenerate
                                                                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                                                                        }`}
                                                                                        title={
                                                                                            isExpanded
                                                                                                ? "Close calculation breakdown"
                                                                                                : isCallbackApproved && canGenerate
                                                                                                ? "Edit & re-generate payroll"
                                                                                                : "View salary calculation breakdown"
                                                                                        }
                                                                                    >
                                                                                        {isExpanded ? <X size={12} /> : isCallbackApproved && canGenerate ? <Calculator size={12} /> : <FileText size={12} />}
                                                                                        <span>{isExpanded ? "Close" : isCallbackApproved && canGenerate ? "Update" : "View"}</span>
                                                                                    </button>

                                                                                    {/* 2. Person 1 (Generator / canGenerate) Call Back Actions */}
                                                                                    {canGenerate && (
                                                                                        <>
                                                                                            {(!callbackStatus || callbackStatus === "NONE") && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleOpenCallbackModal("REQUEST", existingPayroll.uid, employee.empid, employee.name)}
                                                                                                    className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                    title="Request call back from the initiator to update payroll"
                                                                                                >
                                                                                                    <RotateCcw size={11} className="text-amber-700" />
                                                                                                    <span>Call Back</span>
                                                                                                </button>
                                                                                            )}
                                                                                            {isCallbackRejected && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleOpenCallbackModal("RE_REQUEST", existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_rejection_note)}
                                                                                                    className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                    title={`Rejection note: "${existingPayroll.callback_rejection_note || 'No note'}". Click to re-request call back.`}
                                                                                                >
                                                                                                    <RotateCcw size={11} className="text-rose-700" />
                                                                                                    <span>Re-request</span>
                                                                                                </button>
                                                                                            )}
                                                                                        </>
                                                                                    )}

                                                                                    {/* 3. Person 2 (Initiator / canInitiate) Actions */}
                                                                                    {canInitiate && (
                                                                                        <>
                                                                                            {isCallbackRequested && (
                                                                                                <div className="inline-flex items-center gap-1">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleApproveCallback(existingPayroll.uid, employee.empid, employee.name)}
                                                                                                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                        title={`Approve call back for ${employee.name}${existingPayroll.callback_reason ? ` (Reason: ${existingPayroll.callback_reason})` : ''}`}
                                                                                                    >
                                                                                                        <Check size={11} />
                                                                                                        <span>Approve</span>
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleOpenRejectModal(existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_reason)}
                                                                                                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                                                                                        title="Reject call back request with a reason note"
                                                                                                    >
                                                                                                        <X size={11} />
                                                                                                        <span>Reject</span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                            {isCallbackApproved && (
                                                                                                <span
                                                                                                    className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold rounded bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                                                                                                    title="Call back approved. Initiator cannot initiate while generator is updating."
                                                                                                >
                                                                                                    <Lock size={10} className="text-amber-600" />
                                                                                                    <span>Generator Editing</span>
                                                                                                </span>
                                                                                            )}
                                                                                            {!isCallbackRequested && !isCallbackApproved && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleInitiateSingle(existingPayroll.uid, employee.empid, employee.name)}
                                                                                                    disabled={initiatingEmployee[employee.empid]}
                                                                                                    className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1 shadow-2xs transition cursor-pointer disabled:opacity-50"
                                                                                                    title="Initiate payroll for disbursement"
                                                                                                >
                                                                                                    <Send size={11} className={initiatingEmployee[employee.empid] ? "animate-pulse" : ""} />
                                                                                                    <span>{initiatingEmployee[employee.empid] ? "Initiating..." : "Initiate"}</span>
                                                                                                </button>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleCalculateSalary(employee.empid)}
                                                                                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] font-medium rounded transition-colors cursor-pointer ${
                                                                                        isExpanded
                                                                                            ? "bg-slate-800 text-white hover:bg-slate-700 shadow-xs"
                                                                                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                                                    }`}
                                                                                >
                                                                                    <span className="flex items-center justify-center gap-1.5">
                                                                                        <Calculator size={13} />
                                                                                        {isExpanded ? "Close" : "Calculate"}
                                                                                    </span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                </tr>

                                                                {isExpanded && (() => {
                                                                    const data = calculatedSalary[employee.empid];
                                                                    const isLoading = !!loadingEmployees[employee.empid];
                                                                    const bankDetails = data?.employee?.employeeProfile?.bank_details?.[0] || employee?.employeeProfile?.bank_details?.[0];
                                                                    const existing = submittedPayrolls[employee.empid];
                                                                    const otHours = Number(data?.attendance?.overtimeHours || 0);
                                                                    const otRate = parseFloat(String(otHourlyRates[employee.empid] ?? (existing?.overtime_rate_perhour ?? 0))) || 0;
                                                                    const otTotalPayable = Math.round(otHours * otRate * 100) / 100;
                                                                    const basePayableAmount = Number(data?.totalPayableAmount || 0);
                                                                    const bonusAmount = parseFloat(String(bonusAmounts[employee.empid] ?? (existing?.bonus_amount ?? 0))) || 0;
                                                                    const finalTotalPayableAmount = Math.round((basePayableAmount + otTotalPayable + bonusAmount) * 100) / 100;

                                                                    return (
                                                                        <tr className="border-b-2 border-slate-300 bg-slate-50/60 transition-all">
                                                                            <td colSpan={7} className="p-0 border-r border-l border-slate-200">
                                                                                <div className="border-l-4 border-l-emerald-600 bg-white">
                                                                                    {/* Header bar of the section */}
                                                                                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/70">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-8 h-8 rounded border border-slate-300 bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                                                                                <Calculator size={15} />
                                                                                            </div>
                                                                                            <div>
                                                                                                <div className="text-[12px] font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                                                                                    <span>Salary Calculation — {data?.employee?.name || employee.name}</span>
                                                                                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal border border-slate-200">
                                                                                                        {data?.employee?.empid || employee.empid}
                                                                                                    </span>
                                                                                                    {data?.employee?.role && (
                                                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                                                                            {data.employee.role}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {isGenerated && (
                                                                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                                                                                                            isCallbackApproved
                                                                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                                                                                                : isCallbackRequested
                                                                                                                ? "bg-amber-50 text-amber-700 border border-amber-300"
                                                                                                                : isCallbackRejected
                                                                                                                ? "bg-rose-50 text-rose-700 border border-rose-300"
                                                                                                                : "bg-blue-50 text-blue-700 border border-blue-200"
                                                                                                        }`}>
                                                                                                            {isCallbackApproved ? (
                                                                                                                <>
                                                                                                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                                                                                                    <span>Call Back Approved — Ready to Update</span>
                                                                                                                </>
                                                                                                            ) : isCallbackRequested ? (
                                                                                                                <>
                                                                                                                    <Clock size={12} className="text-amber-600" />
                                                                                                                    <span>Call Back Requested — Awaiting Checker</span>
                                                                                                                </>
                                                                                                            ) : isCallbackRejected ? (
                                                                                                                <>
                                                                                                                    <XCircle size={12} className="text-rose-600" />
                                                                                                                    <span>Call Back Rejected</span>
                                                                                                                </>
                                                                                                            ) : (
                                                                                                                <>
                                                                                                                    <Lock size={12} className="text-blue-600" />
                                                                                                                    <span>Generated — Locked</span>
                                                                                                                </>
                                                                                                            )}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {isInitiated && (
                                                                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                                                                                                            isInitCallbackRequested
                                                                                                                ? "bg-amber-50 text-amber-700 border border-amber-300"
                                                                                                                : isInitCallbackRejected
                                                                                                                ? "bg-rose-50 text-rose-700 border border-rose-300"
                                                                                                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                                                                        }`}>
                                                                                                            {isInitCallbackRequested ? (
                                                                                                                <>
                                                                                                                    <Clock size={12} className="text-amber-600 animate-spin" />
                                                                                                                    <span>Call Back Requested — Awaiting Disburser</span>
                                                                                                                </>
                                                                                                            ) : isInitCallbackRejected ? (
                                                                                                                <>
                                                                                                                    <XCircle size={12} className="text-rose-600" />
                                                                                                                    <span>Call Back Rejected by Disburser</span>
                                                                                                                </>
                                                                                                            ) : (
                                                                                                                <>
                                                                                                                    <Clock size={12} className="text-indigo-600" />
                                                                                                                    <span>Initiated — Awaiting Disbursement</span>
                                                                                                                </>
                                                                                                            )}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                                                                                    <span>{data?.employee?.position || employee.position || "Employee"}</span>
                                                                                                    <span>&bull;</span>
                                                                                                    <span>{data?.employee?.employeeType || employee.employee_type || "Full-time"}</span>
                                                                                                    {data?.employee?.email && (
                                                                                                        <>
                                                                                                            <span>&bull;</span>
                                                                                                            <span className="font-mono">{data.employee.email}</span>
                                                                                                        </>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            {isLoading ? (
                                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] uppercase tracking-wider font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                                                                                                    Calculating...
                                                                                                </span>
                                                                                            ) : data ? (
                                                                                                <>
                                                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] uppercase tracking-wider font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                                                        Calculated
                                                                                                    </span>
                                                                                                    {(() => {
                                                                                                        const isEditLocked = isLocked || (isGenerated && !isCallbackApproved);
                                                                                                        return (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleSubmitIndividualPayroll(employee.empid)}
                                                                                                                disabled={isEditLocked || loadingEmployees[employee.empid] || submittingEmployees[employee.empid] || data.attendance === null || data.salary === null}
                                                                                                                className={`flex items-center gap-1.5 px-2.5 py-1 ${
                                                                                                                    isEditLocked
                                                                                                                        ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                                                                                                                        : isGenerated
                                                                                                                        ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                                                                                                                        : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-2xs"
                                                                                                                } text-[10px] font-semibold rounded transition disabled:opacity-60 disabled:cursor-not-allowed`}
                                                                                                                title={
                                                                                                                    isLocked
                                                                                                                        ? `Payroll is ${rawStatus}`
                                                                                                                        : isGenerated && !isCallbackApproved
                                                                                                                        ? "Call back must be approved by initiator before you can update"
                                                                                                                        : isGenerated
                                                                                                                        ? "Update and re-generate payroll record"
                                                                                                                        : "Generate payroll"
                                                                                                                }
                                                                                                            >
                                                                                                                {isEditLocked ? <Lock size={12} className="text-slate-400" /> : <Wallet size={12} className={isGenerated ? "text-blue-200" : "text-emerald-400"} />}
                                                                                                                <span>
                                                                                                                    {submittingEmployees[employee.empid]
                                                                                                                        ? "Saving..."
                                                                                                                        : isLocked
                                                                                                                        ? `Locked (${rawStatus})`
                                                                                                                        : isGenerated && !isCallbackApproved
                                                                                                                        ? "Locked (Need Call Back)"
                                                                                                                        : isGenerated
                                                                                                                        ? "Update & Re-generate"
                                                                                                                        : "Submit"}
                                                                                                                </span>
                                                                                                            </button>
                                                                                                        );
                                                                                                    })()}
                                                                                                </>
                                                                                            ) : null}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleCalculateSalary(employee.empid)}
                                                                                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded transition-colors"
                                                                                                title="Close section"
                                                                                            >
                                                                                                <X size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Body Content */}
                                                                                    {isLoading && !data ? (
                                                                                        <div className="p-8 flex flex-col items-center justify-center text-center">
                                                                                            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                                                                            <div className="mt-3 text-[12px] font-semibold text-slate-700">Calculating Salary Breakdown...</div>
                                                                                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                                                                Fetching attendance, leaves &amp; salary components for {employee.name}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : !data ? (
                                                                                        <div className="p-6 text-center text-[12px] text-slate-500">
                                                                                            No calculation data available. Click Calculate to fetch data.
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            {/* Maker-Checker Call Back Status Notice Banner */}
                                                                                            {isCallbackRequested && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-amber-50/90 border border-amber-300 rounded-sm text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                                                                                                            <Clock size={16} className="animate-spin" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-amber-900">
                                                                                                                    Call Back Requested &bull; Awaiting Initiator Approval
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-amber-200/80 text-amber-900 border border-amber-300">
                                                                                                                    Checker Pending
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <p className="text-[11px] text-amber-800 mt-0.5">
                                                                                                                {existingPayroll?.callback_reason
                                                                                                                    ? `Request Reason: "${existingPayroll.callback_reason}"`
                                                                                                                    : "A call back has been requested. Salary adjustments and submission are locked until approved."}
                                                                                                            </p>
                                                                                                            {existingPayroll?.callback_requested_by && (
                                                                                                                <div className="text-[10px] text-amber-700/80 font-mono mt-1">
                                                                                                                    Requested by: {existingPayroll.callback_requested_by} • {formatDate(existingPayroll.callback_requested_at)}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canInitiate && (
                                                                                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleApproveCallback(existingPayroll.uid, employee.empid, employee.name)}
                                                                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <Check size={13} />
                                                                                                                <span>Approve Call Back</span>
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleOpenRejectModal(existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_reason)}
                                                                                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <X size={13} />
                                                                                                                <span>Reject with Note</span>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {isCallbackApproved && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-sm text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                                                                                                            <CheckCircle2 size={16} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-emerald-900">
                                                                                                                    Call Back Approved &bull; Unlocked for Updating
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                                                                                                                    Maker Edit Mode
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <p className="text-[11px] text-emerald-800 mt-0.5">
                                                                                                                Call back request was approved by the initiator. You can now update Overtime, Bonus, and Payment Date, then click &apos;Update &amp; Re-generate&apos;. While you are editing, the initiator cannot initiate this payroll.
                                                                                                            </p>
                                                                                                            {existingPayroll?.callback_reviewed_by && (
                                                                                                                <div className="text-[10px] text-emerald-700/80 font-mono mt-1">
                                                                                                                    Approved by: {existingPayroll.callback_reviewed_by} • {formatDate(existingPayroll.callback_reviewed_at)}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {isCallbackRejected && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-rose-50/90 border border-rose-300 rounded-sm text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800 shrink-0">
                                                                                                            <XCircle size={16} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-rose-900">
                                                                                                                    Call Back Request Rejected
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-rose-200/80 text-rose-900 border border-rose-300">
                                                                                                                    Denied by Checker
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <div className="mt-1 p-2 rounded bg-white/80 border border-rose-200 text-[11px] text-rose-900">
                                                                                                                <strong className="text-rose-950">Checker Rejection Reason:</strong>{" "}
                                                                                                                {existingPayroll?.callback_rejection_note || "No explanation provided."}
                                                                                                            </div>
                                                                                                            {existingPayroll?.callback_reviewed_by && (
                                                                                                                <div className="text-[10px] text-rose-700/80 font-mono mt-1">
                                                                                                                    Reviewed by: {existingPayroll.callback_reviewed_by} • {formatDate(existingPayroll.callback_reviewed_at)}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canGenerate && (
                                                                                                        <div className="shrink-0 self-end sm:self-center">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleOpenCallbackModal("RE_REQUEST", existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_rejection_note)}
                                                                                                                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <RotateCcw size={13} />
                                                                                                                <span>Re-request Call Back</span>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {isGenerated && !isCallbackRequested && !isCallbackApproved && !isCallbackRejected && (
                                                                                                <div className="mx-5 mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-sm text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-7 h-7 rounded bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800 shrink-0">
                                                                                                            <Lock size={14} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="text-[11.5px] font-bold text-blue-900">
                                                                                                                Payroll Record Generated &bull; Further Edits Locked
                                                                                                            </div>
                                                                                                            <p className="text-[10.5px] text-blue-800 mt-0.5">
                                                                                                                This payroll is in GENERATED status. To modify overtime or bonus, request a call back from the person who can initiate.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canGenerate && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => handleOpenCallbackModal("REQUEST", existingPayroll.uid, employee.empid, employee.name)}
                                                                                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shrink-0 self-end sm:self-center shadow-xs cursor-pointer"
                                                                                                        >
                                                                                                            <RotateCcw size={13} />
                                                                                                            <span>Request Call Back</span>
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* INITIATED Call Back Banners */}
                                                                                            {isInitCallbackRequested && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-amber-50/90 border border-amber-300 rounded-sm text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                                                                                                            <Clock size={16} className="animate-spin" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-amber-900">
                                                                                                                    Call Back Requested &bull; Awaiting Disburser Approval
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-amber-200/80 text-amber-900 border border-amber-300">
                                                                                                                    Disburser Pending
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <p className="text-[11px] text-amber-800 mt-0.5">
                                                                                                                {existingPayroll?.callback_reason
                                                                                                                    ? `Request Reason: "${existingPayroll.callback_reason}"`
                                                                                                                    : "A call back has been requested by the initiator. Awaiting disburser authorization."}
                                                                                                            </p>
                                                                                                            {existingPayroll?.callback_requested_by && (
                                                                                                                <div className="text-[10px] text-amber-700/80 font-mono mt-1">
                                                                                                                    Requested by: {existingPayroll.callback_requested_by} • {formatDate(existingPayroll.callback_requested_at)}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canDisburse && (
                                                                                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleApproveCallback(existingPayroll.uid, employee.empid, employee.name)}
                                                                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <Check size={13} />
                                                                                                                <span>Approve Call Back</span>
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleOpenRejectModal(existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_reason)}
                                                                                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <X size={13} />
                                                                                                                <span>Reject with Note</span>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {isInitCallbackRejected && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-rose-50/90 border border-rose-300 rounded-sm text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800 shrink-0">
                                                                                                            <XCircle size={16} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-rose-900">
                                                                                                                    Call Back Request Rejected by Disburser
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-rose-200/80 text-rose-900 border border-rose-300">
                                                                                                                    Denied by Disburser
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <div className="mt-1 p-2 rounded bg-white/80 border border-rose-200 text-[11px] text-rose-900">
                                                                                                                <strong className="text-rose-950">Disburser Rejection Reason:</strong>{" "}
                                                                                                                {existingPayroll?.callback_rejection_note || "No explanation provided."}
                                                                                                            </div>
                                                                                                            {existingPayroll?.callback_reviewed_by && (
                                                                                                                <div className="text-[10px] text-rose-700/80 font-mono mt-1">
                                                                                                                    Reviewed by: {existingPayroll.callback_reviewed_by} • {formatDate(existingPayroll.callback_reviewed_at)}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canInitiate && (
                                                                                                        <div className="shrink-0 self-end sm:self-center">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleOpenCallbackModal("RE_REQUEST", existingPayroll.uid, employee.empid, employee.name, existingPayroll.callback_rejection_note)}
                                                                                                                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                                                                            >
                                                                                                                <RotateCcw size={13} />
                                                                                                                <span>Re-request Call Back</span>
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {isInitiated && !isInitCallbackRequested && !isInitCallbackRejected && (
                                                                                                <div className="mx-5 mt-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-sm text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-7 h-7 rounded bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-800 shrink-0">
                                                                                                            <Lock size={14} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="text-[11.5px] font-bold text-indigo-900">
                                                                                                                Payroll Record Initiated &bull; Awaiting Disbursement
                                                                                                            </div>
                                                                                                            <p className="text-[10.5px] text-indigo-800 mt-0.5">
                                                                                                                This payroll has been initiated and is awaiting disbursement authorization. If adjustments are needed, request a call back from the person with disbursement authorization.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {canInitiate && (
                                                                                                         <button
                                                                                                            type="button"
                                                                                                            onClick={() => handleOpenCallbackModal("REQUEST", existingPayroll.uid, employee.empid, employee.name)}
                                                                                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 shrink-0 self-end sm:self-center shadow-xs cursor-pointer"
                                                                                                        >
                                                                                                            <RotateCcw size={13} />
                                                                                                            <span>Request Call Back</span>
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Disburser Payout Rejection Banner */}
                                                                                            {isRejected && (
                                                                                                <div className="mx-5 mt-4 p-3.5 bg-rose-50/90 border border-rose-300 rounded-sm text-rose-950 flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800 shrink-0 mt-0.5">
                                                                                                            <AlertCircle size={16} className="text-rose-600" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                                <span className="text-[12px] font-bold text-rose-900">
                                                                                                                    Payout Rejected by Disburser
                                                                                                                </span>
                                                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-rose-200/80 text-rose-900 border border-rose-300">
                                                                                                                    Status: REJECTED
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            {existingPayroll?.rejection_note ? (
                                                                                                                <div className="mt-2 p-2.5 rounded bg-white/90 border border-rose-200 text-[11px] text-rose-950">
                                                                                                                    <strong className="text-rose-950">Rejection Note:</strong>{" "}
                                                                                                                    <span className="whitespace-pre-wrap">{existingPayroll.rejection_note}</span>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <p className="text-[11px] text-rose-800 mt-0.5">
                                                                                                                    This payout was rejected during the disbursement review.
                                                                                                                </p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Optional Messages */}
                                                                                            {(data.attendanceMessage || data.salaryMessage) && (
                                                                                                <div className="px-5 pt-3 space-y-2">
                                                                                                    {data.attendanceMessage && (
                                                                                                        <div className="px-3 py-2 bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] rounded flex items-center gap-2">
                                                                                                            <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                                                                                            <span>{data.attendanceMessage}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {data.salaryMessage && (
                                                                                                        <div className="px-3 py-2 bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] rounded flex items-center gap-2">
                                                                                                            <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                                                                                            <span>{data.salaryMessage}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Top 4 Summary Cards */}
                                                                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/30">
                                                                                                {/* Attendance & Days */}
                                                                                                <div className="border border-slate-200 bg-white p-3 rounded-sm shadow-xs">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                                                                                                            Attendance &amp; Days
                                                                                                        </span>
                                                                                                        <Calendar size={13} className="text-slate-400" />
                                                                                                    </div>
                                                                                                    <div className="mt-1 flex items-baseline justify-between">
                                                                                                        <span className="font-mono text-[14px] font-bold text-slate-900">
                                                                                                            {data.attendance?.daysWorked != null ? `${data.attendance.daysWorked} Days` : "—"}
                                                                                                        </span>
                                                                                                        <span className="text-[10px] font-mono text-slate-500">
                                                                                                            of {data.attendance?.totalWorkingDays ?? "—"} Total
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                                                                                        <span>Absent: {data.attendance?.daysAbsent ?? 0} d</span>
                                                                                                        <span>OT: {data.attendance?.overtimeHours ?? 0} hrs</span>
                                                                                                        <span>Weekend: {data.attendance?.weekend ?? 0} d</span>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Gross Earnings Base */}
                                                                                                <div className="border border-slate-200 bg-white p-3 rounded-sm shadow-xs">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                                                                                                            Gross Base
                                                                                                        </span>
                                                                                                        <ArrowUpRight size={13} className="text-emerald-600" />
                                                                                                    </div>
                                                                                                    <div className="mt-1 font-mono text-[14px] font-bold text-slate-900">
                                                                                                        {formatCurrency(data.salary?.grossSalary)}
                                                                                                    </div>
                                                                                                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 text-[10px] text-slate-500 truncate" title={data.salary?.structureName}>
                                                                                                        {data.salary?.structureName || "Standard Structure"}
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Deductions Base */}
                                                                                                <div className="border border-slate-200 bg-white p-3 rounded-sm shadow-xs">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                                                                                                            Monthly Deductions
                                                                                                        </span>
                                                                                                        <ArrowDownRight size={13} className="text-rose-600" />
                                                                                                    </div>
                                                                                                    <div className="mt-1 font-mono text-[14px] font-bold text-slate-900">
                                                                                                        {formatCurrency(data.salary?.totalDeductions)}
                                                                                                    </div>
                                                                                                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-100 text-[10px] text-slate-500">
                                                                                                        Net Base: {formatCurrency(data.salary?.netSalary)}
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Total Payable (HERO) */}
                                                                                                <div className="border border-emerald-300 bg-emerald-50/70 p-3 rounded-sm shadow-xs ring-1 ring-emerald-200/50">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-[9px] uppercase tracking-[0.14em] text-emerald-800 font-bold">
                                                                                                            Total Payable Amount
                                                                                                        </span>
                                                                                                        <Wallet size={13} className="text-emerald-700" />
                                                                                                    </div>
                                                                                                    <div className="mt-1 font-mono text-[16px] font-black text-emerald-700 tracking-tight">
                                                                                                        {formatCurrency(finalTotalPayableAmount)}
                                                                                                    </div>
                                                                                                    <div className="mt-2 pt-1.5 border-t border-dashed border-emerald-200/80 flex flex-wrap items-center justify-between text-[9px] font-mono text-emerald-800 gap-1">
                                                                                                        <span>Base: {formatCurrency(basePayableAmount)}</span>
                                                                                                        <span>{otTotalPayable > 0 ? `+ OT: ${formatCurrency(otTotalPayable)}` : "No OT added"}</span>
                                                                                                        <span>{bonusAmount > 0 ? `+ Bonus: ${formatCurrency(bonusAmount)}` : "No Bonus"}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Adjustments: Overtime (OT) & Bonus Pay */}
                                                                                            <div className="mx-4 mb-4 grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                                                                                                {/* Left: Overtime Pay Adjustment (OT) */}
                                                                                                <div className="p-3.5 rounded-sm border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start sm:items-center gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                                                                                                            <Clock size={16} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                                                                                                                    Overtime Pay Adjustment (OT)
                                                                                                                </span>
                                                                                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                                                                                                    OT: {otHours} hrs
                                                                                                                </span>
                                                                                                                {otRate > 0 && (
                                                                                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                                                                                                                        {otHours} hrs &times; ₹{otRate}/hr = +{formatCurrency(otTotalPayable)}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <p className="text-[10px] text-slate-600 mt-0.5">
                                                                                                                Enter employee&apos;s hourly OT rate to compute compensation and dynamically add it to the Total Payable Amount.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                                                                                        {(() => {
                                                                                                            const isEditLocked = isLocked || (isGenerated && !isCallbackApproved);
                                                                                                            return (
                                                                                                                <div className={`flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-400 shadow-2xs ${isEditLocked ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}`}>
                                                                                                                    <span className="text-[11px] font-mono text-slate-400 font-semibold">₹</span>
                                                                                                                    <input
                                                                                                                        type="number"
                                                                                                                        min="0"
                                                                                                                        step="any"
                                                                                                                        disabled={isEditLocked}
                                                                                                                        title={isEditLocked ? (isLocked ? `Locked (${rawStatus})` : "Call back must be approved to edit") : undefined}
                                                                                                                        placeholder="Rate / hr"
                                                                                                                        value={otHourlyRates[employee.empid] ?? ""}
                                                                                                                        onChange={(e) => {
                                                                                                                            const val = e.target.value;
                                                                                                                            setOtHourlyRates(prev => ({
                                                                                                                                ...prev,
                                                                                                                                [employee.empid]: val
                                                                                                                            }));
                                                                                                                        }}
                                                                                                                        className="w-24 text-[12px] font-mono font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-300 disabled:cursor-not-allowed"
                                                                                                                    />
                                                                                                                    <span className="text-[10px] font-mono text-slate-500">/ hr</span>
                                                                                                                </div>
                                                                                                            );
                                                                                                        })()}

                                                                                                        <div className="text-right pl-3 border-l border-amber-200">
                                                                                                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Total OT Pay</div>
                                                                                                            <div className="font-mono text-[13px] font-bold text-amber-900">
                                                                                                                +{formatCurrency(otTotalPayable)}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Right: Bonus Pay Adjustment */}
                                                                                                <div className="p-3.5 rounded-sm border border-indigo-200 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                                                                                    <div className="flex items-start sm:items-center gap-3">
                                                                                                        <div className="w-8 h-8 rounded bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-800 shrink-0 mt-0.5 sm:mt-0">
                                                                                                            <Gift size={16} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                                                                                                                    Bonus Pay Adjustment
                                                                                                                </span>
                                                                                                                {bonusAmount > 0 && (
                                                                                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                                                                                                                        +{formatCurrency(bonusAmount)}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <p className="text-[10px] text-slate-600 mt-0.5">
                                                                                                                Enter performance, festival, or ad-hoc bonus amount to dynamically add it to the Total Payable Amount.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                                                                                        {(() => {
                                                                                                            const isEditLocked = isLocked || (isGenerated && !isCallbackApproved);
                                                                                                            return (
                                                                                                                <div className={`flex items-center gap-1.5 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-400 shadow-2xs ${isEditLocked ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}`}>
                                                                                                                    <span className="text-[11px] font-mono text-slate-400 font-semibold">₹</span>
                                                                                                                    <input
                                                                                                                        type="number"
                                                                                                                        min="0"
                                                                                                                        step="any"
                                                                                                                        disabled={isEditLocked}
                                                                                                                        title={isEditLocked ? (isLocked ? `Locked (${rawStatus})` : "Call back must be approved to edit") : undefined}
                                                                                                                        placeholder="Bonus amount"
                                                                                                                        value={bonusAmounts[employee.empid] ?? ""}
                                                                                                                        onChange={(e) => {
                                                                                                                            const val = e.target.value;
                                                                                                                            setBonusAmounts(prev => ({
                                                                                                                                ...prev,
                                                                                                                                [employee.empid]: val
                                                                                                                            }));
                                                                                                                        }}
                                                                                                                        className="w-28 text-[12px] font-mono font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-300 disabled:cursor-not-allowed"
                                                                                                                    />
                                                                                                                </div>
                                                                                                            );
                                                                                                        })()}

                                                                                                        <div className="text-right pl-3 border-l border-indigo-200">
                                                                                                            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Total Bonus</div>
                                                                                                            <div className="font-mono text-[13px] font-bold text-indigo-900">
                                                                                                                +{formatCurrency(bonusAmount)}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* 2-Column Ledger Details */}
                                                                                            <div className="p-4 border-t border-slate-200 bg-slate-50/20">
                                                                                                {/* LEFT: EARNINGS & DEDUCTIONS TABLES */}
                                                                                                <div className="space-y-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-4">
                                                                                                    {/* Earnings Table */}
                                                                                                    <div className="h-full border border-slate-200 bg-white rounded-sm overflow-hidden">
                                                                                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                                                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
                                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                                                                Earnings Components
                                                                                                            </span>
                                                                                                            <span className="font-mono text-[10px] text-slate-500">
                                                                                                                {data.salary?.earnings?.length || 0} Components
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="overflow-x-auto">
                                                                                                            <table className="w-full text-left text-[11px]">
                                                                                                                <thead>
                                                                                                                    <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                                                                                                                        <th className="px-3 py-1.5">Component</th>
                                                                                                                        <th className="px-3 py-1.5">Formula / Type</th>
                                                                                                                        <th className="px-3 py-1.5 text-right">Amount</th>
                                                                                                                    </tr>
                                                                                                                </thead>
                                                                                                                <tbody className="divide-y divide-slate-100">
                                                                                                                    {data.salary?.earnings && data.salary.earnings.length > 0 ? (
                                                                                                                        data.salary.earnings.map((earning: any, i: number) => (
                                                                                                                            <tr key={earning.id || i} className="hover:bg-slate-50/60">
                                                                                                                                <td className="px-3 py-2">
                                                                                                                                    <div className="font-semibold text-slate-800">{earning.name}</div>
                                                                                                                                    <div className="text-[9px] font-mono text-slate-400">{earning.code}</div>
                                                                                                                                </td>
                                                                                                                                <td className="px-3 py-2 text-slate-500 text-[10px]">
                                                                                                                                    {earning.formula || earning.calculation_type || "Fixed"}
                                                                                                                                </td>
                                                                                                                                <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">
                                                                                                                                    +{formatCurrency(earning.amount)}
                                                                                                                                </td>
                                                                                                                            </tr>
                                                                                                                        ))
                                                                                                                    ) : (
                                                                                                                        <tr>
                                                                                                                            <td colSpan={3} className="px-3 py-3 text-center text-slate-400 text-[11px]">
                                                                                                                                No earnings configured
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    )}
                                                                                                                </tbody>
                                                                                                                <tfoot>
                                                                                                                    <tr className="bg-slate-50/80 border-t border-slate-200 font-semibold text-[11px]">
                                                                                                                        <td colSpan={2} className="px-3 py-2 text-slate-700">Gross Monthly Earnings</td>
                                                                                                                        <td className="px-3 py-2 text-right font-mono text-emerald-800">
                                                                                                                            {formatCurrency(data.salary?.grossSalary)}
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                </tfoot>
                                                                                                            </table>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Deductions Table */}
                                                                                                    <div className="h-full border border-slate-200 bg-white rounded-sm overflow-hidden">
                                                                                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                                                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
                                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                                                                Deductions
                                                                                                            </span>
                                                                                                            <span className="font-mono text-[10px] text-slate-500">
                                                                                                                {data.salary?.deductions?.length || 0} Components
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="overflow-x-auto">
                                                                                                            <table className="w-full text-left text-[11px]">
                                                                                                                <thead>
                                                                                                                    <tr className="border-b border-slate-100 text-[9px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                                                                                                                        <th className="px-3 py-1.5">Component</th>
                                                                                                                        <th className="px-3 py-1.5">Formula / Type</th>
                                                                                                                        <th className="px-3 py-1.5 text-right">Amount</th>
                                                                                                                    </tr>
                                                                                                                </thead>
                                                                                                                <tbody className="divide-y divide-slate-100">
                                                                                                                    {data.salary?.deductions && data.salary.deductions.length > 0 ? (
                                                                                                                        data.salary.deductions.map((ded: any, i: number) => (
                                                                                                                            <tr key={ded.id || i} className="hover:bg-slate-50/60">
                                                                                                                                <td className="px-3 py-2">
                                                                                                                                    <div className="font-semibold text-slate-800">{ded.name}</div>
                                                                                                                                    <div className="text-[9px] font-mono text-slate-400">{ded.code}</div>
                                                                                                                                </td>
                                                                                                                                <td className="px-3 py-2 text-slate-500 text-[10px]">
                                                                                                                                    {ded.formula || ded.calculation_type || "Fixed"}
                                                                                                                                </td>
                                                                                                                                <td className="px-3 py-2 text-right font-mono font-semibold text-rose-700">
                                                                                                                                    -{formatCurrency(ded.amount)}
                                                                                                                                </td>
                                                                                                                            </tr>
                                                                                                                        ))
                                                                                                                    ) : (
                                                                                                                        <tr>
                                                                                                                            <td colSpan={3} className="px-3 py-3 text-center text-slate-400 text-[11px]">
                                                                                                                                No deductions configured
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    )}
                                                                                                                </tbody>
                                                                                                                <tfoot>
                                                                                                                    <tr className="bg-slate-50/80 border-t border-slate-200 font-semibold text-[11px]">
                                                                                                                        <td colSpan={2} className="px-3 py-2 text-slate-700">Total Deductions</td>
                                                                                                                        <td className="px-3 py-2 text-right font-mono text-rose-800">
                                                                                                                            {formatCurrency(data.salary?.totalDeductions)}
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                </tfoot>
                                                                                                            </table>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* RIGHT: LEAVES, BANK ACCOUNT, METADATA */}
                                                                                                <div className="space-y-4">
                                                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                                                                                        {/* Leaves Section */}
                                                                                                        <div className="border border-slate-200 bg-white rounded-sm overflow-hidden">
                                                                                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                                                                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
                                                                                                                    <FileText size={13} className="text-slate-500" />
                                                                                                                    Leave Records ({data.leaves?.length || 0})
                                                                                                                </span>
                                                                                                                <span className="text-[9px] text-slate-400 uppercase tracking-wider">In this cycle</span>
                                                                                                            </div>
                                                                                                            <div className="p-3">
                                                                                                                {data.leaves && data.leaves.length > 0 ? (
                                                                                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                                                                        {data.leaves.map((leave: any, i: number) => {
                                                                                                                            const isApproved = leave.status === "Approved";
                                                                                                                            const isRejected = leave.status === "Rejected";
                                                                                                                            return (
                                                                                                                                <div key={leave.uid || i} className="p-2 border border-slate-200 rounded bg-slate-50/50 text-[11px]">
                                                                                                                                    <div className="flex items-center justify-between">
                                                                                                                                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                                                                                            {leave.leave_types?.type_name || leave.leave_type || "Leave"}
                                                                                                                                            <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${leave.leave_types?.paid ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                                                                                                                                                {leave.leave_types?.paid ? "PAID" : "UNPAID"}
                                                                                                                                            </span>
                                                                                                                                        </span>
                                                                                                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isApproved ? "bg-emerald-100 text-emerald-800" :
                                                                                                                                            isRejected ? "bg-rose-100 text-rose-800" :
                                                                                                                                                "bg-amber-100 text-amber-800"
                                                                                                                                            }`}>
                                                                                                                                            {leave.status}
                                                                                                                                        </span>
                                                                                                                                    </div>
                                                                                                                                    <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                                                                                                                                        <span>{formatDate(leave.from_date)} &rarr; {formatDate(leave.to_date)}</span>
                                                                                                                                    </div>
                                                                                                                                    {leave.reason && (
                                                                                                                                        <div className="text-[10px] text-slate-600 mt-1 italic">
                                                                                                                                            &ldquo;{leave.reason}&rdquo;
                                                                                                                                        </div>
                                                                                                                                    )}
                                                                                                                                    {leave.resoan_to_reject && (
                                                                                                                                        <div className="text-[9px] text-rose-600 mt-0.5 font-medium">
                                                                                                                                            Reject Reason: {leave.resoan_to_reject}
                                                                                                                                        </div>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                            );
                                                                                                                        })}
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <div className="text-center py-4 text-slate-400 text-[11px]">
                                                                                                                        No leave requests recorded for this period.
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {/* Bank & Payout Details */}
                                                                                                        <div className="border border-slate-200 bg-white rounded-sm overflow-hidden">
                                                                                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                                                                                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
                                                                                                                    <CreditCard size={13} className="text-slate-500" />
                                                                                                                    Bank &amp; Disbursal Account
                                                                                                                </span>
                                                                                                                <span className="text-[9px] font-mono text-slate-400 uppercase">Direct Credit</span>
                                                                                                            </div>
                                                                                                            <div className="p-3 text-[11px]">
                                                                                                                {bankDetails ? (
                                                                                                                    <div className="grid grid-cols-2 gap-3">
                                                                                                                        <div>
                                                                                                                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Bank Name</div>
                                                                                                                            <div className="font-semibold text-slate-800 mt-0.5">{bankDetails.bank_name || "—"}</div>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Account Number</div>
                                                                                                                            <div className="font-mono font-semibold text-slate-800 mt-0.5">{bankDetails.account_number || "—"}</div>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                            <div className="text-[9px] uppercase tracking-wider text-slate-400">IFSC Code</div>
                                                                                                                            <div className="font-mono font-semibold text-slate-800 mt-0.5">{bankDetails.ifsc_code || "—"}</div>
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Branch</div>
                                                                                                                            <div className="text-slate-700 mt-0.5">{bankDetails.branch_name || "—"}</div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <div className="text-slate-400 text-[11px] text-center py-2">
                                                                                                                        No bank details found for this employee profile.
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Period & Calculation Metadata */}
                                                                                                    <div className="border border-slate-200 bg-slate-50/60 p-3 rounded-sm text-[10px] font-mono text-slate-500 space-y-1">
                                                                                                        <div className="flex justify-between">
                                                                                                            <span className="text-slate-400">PERIOD:</span>
                                                                                                            <span className="font-semibold text-slate-700">{data.period?.periodName} ({data.period?.financialYear?.name})</span>
                                                                                                        </div>
                                                                                                        <div className="flex justify-between">
                                                                                                            <span className="text-slate-400">SALARY CYCLE:</span>
                                                                                                            <span>{data.period?.configuration?.payroll_cycle || "MONTHLY"}</span>
                                                                                                        </div>
                                                                                                        <div className="flex justify-between">
                                                                                                            <span className="text-slate-400">PAYMENT DATE:</span>
                                                                                                            <span>{data.period?.salaryPaymentDate ? formatDate(data.period.salaryPaymentDate) : "—"}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Individual Employee Submit Action Strip */}
                                                                                            <div className={`px-5 py-3 border-t border-slate-200 ${isGenerated ? "bg-blue-50/40" : isLocked ? "bg-slate-100/60" : "bg-emerald-50/40"} flex flex-col sm:flex-row items-center justify-between gap-3`}>
                                                                                                <div className="flex items-center gap-2.5 text-[11px] text-slate-700 flex-wrap">
                                                                                                    {isLocked ? (
                                                                                                        <Lock size={16} className="text-slate-500 shrink-0" />
                                                                                                    ) : isGenerated ? (
                                                                                                        <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                                                                                                    ) : (
                                                                                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                                                                    )}
                                                                                                    <span>
                                                                                                        <strong>{employee.name}</strong> ({employee.empid}) &bull; Revised Total Payable: <strong className="font-mono text-emerald-800 text-[13px]">{formatCurrency(finalTotalPayableAmount)}</strong>
                                                                                                    </span>
                                                                                                                                  {isGenerated ? (
                                                                                                        isCallbackApproved ? (
                                                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                                                                <Unlock size={11} />
                                                                                                                <span>Status: Generated (Call Back Approved — Ready to Update)</span>
                                                                                                            </span>
                                                                                                        ) : isCallbackRequested ? (
                                                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                                                                                                <Clock size={11} />
                                                                                                                <span>Status: Generated (Call Back Requested — Awaiting Checker)</span>
                                                                                                            </span>
                                                                                                        ) : isCallbackRejected ? (
                                                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                                                                                                                <AlertTriangle size={11} />
                                                                                                                <span>Status: Generated (Call Back Rejected — Re-request Available)</span>
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                                                                                                                <Lock size={11} />
                                                                                                                <span>Status: Generated (Call Back Required to Edit)</span>
                                                                                                            </span>
                                                                                                        )
                                                                                                    ) : isLocked ? (
                                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-800 border border-slate-300">
                                                                                                            <Lock size={11} />
                                                                                                            <span>Locked ({rawStatus})</span>
                                                                                                        </span>
                                                                                                    ) : submittedPayrolls[employee.empid] ? (
                                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                                                            <Check size={11} />
                                                                                                            <span>Status: {submittedPayrolls[employee.empid]?.status || "PENDING"}</span>
                                                                                                        </span>
                                                                                                    ) : null}
                                                                                                </div>

                                                                                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                                                                                    {(() => {
                                                                                                        const isEditLocked = isLocked || (isGenerated && !isCallbackApproved);
                                                                                                        return (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleSubmitIndividualPayroll(employee.empid)}
                                                                                                                disabled={isEditLocked || loadingEmployees[employee.empid] || submittingEmployees[employee.empid] || data.attendance === null || data.salary === null}
                                                                                                                className={`flex items-center gap-1.5 px-4 py-1.5 ${isEditLocked
                                                                                                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                                                                                                    : isGenerated
                                                                                                                        ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer"
                                                                                                                        : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white cursor-pointer"
                                                                                                                    } text-[11px] font-semibold rounded transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                                                title={
                                                                                                                    isLocked
                                                                                                                        ? `Payroll is ${rawStatus}`
                                                                                                                        : isGenerated && !isCallbackApproved
                                                                                                                        ? "Call back must be approved by initiator before you can update"
                                                                                                                        : undefined
                                                                                                                }
                                                                                                            >
                                                                                                                {isEditLocked ? (
                                                                                                                    <Lock size={13} className="text-slate-500" />
                                                                                                                ) : (
                                                                                                                    <Wallet size={13} className={isGenerated ? "text-blue-200" : "text-emerald-400"} />
                                                                                                                )}
                                                                                                                <span>
                                                                                                                    {isLocked
                                                                                                                        ? `Locked (${rawStatus})`
                                                                                                                        : submittingEmployees[employee.empid]
                                                                                                                            ? "Saving..."
                                                                                                                            : isGenerated && !isCallbackApproved
                                                                                                                            ? "Locked (Need Call Back)"
                                                                                                                            : isGenerated
                                                                                                                            ? `Update & Re-generate ${employee.name}'s Payroll`
                                                                                                                            : submittedPayrolls[employee.empid]
                                                                                                                            ? `Update ${employee.name}'s Payroll`
                                                                                                                            : `Submit ${employee.name}'s Payroll`}
                                                                                                                </span>
                                                                                                            </button>
                                                                                                        );
                                                                                                    })()}
                                                                                                </div>
                                                                                            </div>


                                                                                            {/* Sub-footer / Ledger reference */}
                                                                                            <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                                                                                <span>UID REF: {data.employee?.empid} &bull; STRUCTURE ID: {data.salary?.employeeSalaryStructureId || "—"}</span>
                                                                                                <span>STATUS: {data.period?.status || "OPEN"} &bull; COMPUTED RECORD</span>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })()}
                                                            </Fragment>
                                                        );
                                                    })
                                                }
                                            </tbody>
                                        </table>

                                    </div>


                                    {/* FOOTER / MICR STYLE */}
                                    <div className="border-t border-slate-300 px-5 py-2.5 bg-slate-50/70 flex items-center justify-between">
                                        <div className="font-mono text-[9px] tracking-[0.22em] text-slate-400">
                                            ||| PAYROLL REGISTER • {payrollData?.data?.period_name?.toUpperCase() || "PAYROLL PERIOD"} |||
                                        </div>

                                        <div className="flex items-center gap-4 text-[9px] text-slate-400">
                                            <span>{employees.length.toString().padStart(2, "0")} EMPLOYEES</span>
                                            <span className="text-slate-300">|</span>
                                            <span>VERIFIED RECORD</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* JSON PREVIEW MODAL */}
            {showJsonModal && activeModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white border border-slate-300 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded bg-slate-200/80 flex items-center justify-center text-slate-700">
                                    <Code size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[13px]">{activeModalData.title}</h3>
                                    <p className="text-[10px] text-slate-500">Individual payroll data payload logged to console on submission</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const jsonStr = JSON.stringify(activeModalData.data, null, 2);
                                        navigator.clipboard.writeText(jsonStr);
                                        setCopiedJson(true);
                                        setTimeout(() => setCopiedJson(false), 2000);
                                    }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded transition shadow-2xs cursor-pointer"
                                >
                                    {copiedJson ? (
                                        <>
                                            <Check size={13} className="text-emerald-600" />
                                            <span className="text-emerald-600 font-semibold">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={13} />
                                            <span>Copy JSON</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowJsonModal(false)}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 overflow-auto flex-1 bg-slate-950 font-mono text-[11px] text-emerald-400">
                            <pre className="whitespace-pre-wrap select-all">
                                {JSON.stringify(activeModalData.data, null, 2)}
                            </pre>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-slate-600 font-semibold">
                                Revised Payable: {formatCurrency(activeModalData.data?.totalPayableAmount)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowJsonModal(false)}
                                    className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded transition cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeModalData.empid) {
                                            handleSubmitIndividualPayroll(activeModalData.empid);
                                        }
                                        setShowJsonModal(false);
                                    }}
                                    disabled={activeModalData.empid ? submittingEmployees[activeModalData.empid] : false}
                                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold rounded transition cursor-pointer disabled:opacity-50"
                                >
                                    {activeModalData.empid && submittingEmployees[activeModalData.empid] ? "Submitting..." : "Submit Payroll & Close"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CALL BACK REQUEST / RE-REQUEST MODAL */}
            {callbackModal && callbackModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white border border-slate-300 rounded-lg shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                                    <RotateCcw size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[13px]">
                                        {callbackModal.action === "RE_REQUEST" ? "Re-request Call Back" : "Request Payroll Call Back"}
                                    </h3>
                                    <p className="text-[10px] text-slate-500">
                                        {callbackModal.employeeName} ({callbackModal.empid})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCallbackModal(null)}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-3.5">
                            {callbackModal.previousRejectNote && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-[11px]">
                                    <div className="font-bold text-rose-950 flex items-center gap-1.5 mb-1">
                                        <XCircle size={14} className="text-rose-600 shrink-0" />
                                        <span>Previous Rejection Note:</span>
                                    </div>
                                    <p className="pl-5 whitespace-pre-wrap">{callbackModal.previousRejectNote}</p>
                                </div>
                            )}

                            <p className="text-[11.5px] text-slate-600">
                                Request a call back to return this payroll record to the previous stage for adjustments. Once approved, the record will be unlocked.
                            </p>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Reason / Notes for Call Back <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    value={callbackReasonInput}
                                    onChange={(e) => setCallbackReasonInput(e.target.value)}
                                    placeholder="e.g., Need to adjust overtime rate after client approval..."
                                    rows={3}
                                    className="w-full text-[12px] p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setCallbackModal(null)}
                                disabled={submittingCallback}
                                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitCallbackRequest}
                                disabled={submittingCallback}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold rounded transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                            >
                                {submittingCallback ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={13} />
                                        <span>{callbackModal.action === "RE_REQUEST" ? "Submit Re-request" : "Send Call Back Request"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT CALL BACK MODAL */}
            {rejectModal && rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white border border-slate-300 rounded-lg shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800">
                                    <ShieldAlert size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[13px]">
                                        Reject Call Back Request
                                    </h3>
                                    <p className="text-[10px] text-slate-500">
                                        {rejectModal.employeeName} ({rejectModal.empid})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRejectModal(null)}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-3.5">
                            {rejectModal.requestReason && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 text-[11px]">
                                    <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                                        <MessageSquare size={13} className="text-slate-500 shrink-0" />
                                        <span>Request Reason:</span>
                                    </div>
                                    <p className="pl-4 whitespace-pre-wrap text-slate-600">&ldquo;{rejectModal.requestReason}&rdquo;</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                                    Rejection Reason Note <span className="text-rose-600">*</span>
                                </label>
                                <p className="text-[10px] text-slate-500 mb-2">
                                    Please provide a clear note explaining why this call back request is rejected. The requester will see this note and may re-request.
                                </p>
                                <textarea
                                    value={rejectionNoteInput}
                                    onChange={(e) => setRejectionNoteInput(e.target.value)}
                                    placeholder="Enter rejection reason note (required)..."
                                    rows={3}
                                    className="w-full text-[12px] p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRejectModal(null)}
                                disabled={submittingReject}
                                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitCallbackRejection}
                                disabled={submittingReject || !rejectionNoteInput.trim()}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold rounded transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingReject ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Rejecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={13} />
                                        <span>Reject Call Back</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
