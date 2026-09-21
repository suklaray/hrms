import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import Pageheader from '@/Components/PageHeader';
import { useState, useEffect } from 'react';
import { PayrollDetailsSkeleton } from '@/Components/Skeletons';
import { getOrdinal } from '@/lib/getNumberordinal';
import getMonthName from '@/lib/monthPicker';
import getFinancialYear from '@/lib/financialYearCalculation';
import formatDate from '@/lib/formatDate';
import Link from 'next/link';
import { PenIcon } from 'lucide-react';

export default function ViewConfiguration() {
    const router = useRouter();
    const { id } = router.query;
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetch(`/api/payroll/configuration?id=${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data != null) {
                        setData(data.data)
                    } else {
                        console.error('Failed to fetch configuration:', data.message)
                    }
                })
                .catch(error => console.error('Error fetching configuration:', error))
                .finally(() => {
                    setLoading(false);
                })
        }
    }, [id]);

    return (
        <>
            <Head><title>{id} - Payroll configuration</title></Head>
            <div className="flex min-h-screen bg-gray-50">
                <SideBar />
                <div className="flex-1 overflow-auto p-6">
                    <Pageheader
                        title="View Payroll Configuration"
                        description="View payroll configuration details"
                        href="/payroll/payroll-setup/payroll-get-configs"
                    />
                    {
                        loading ? (
                            <PayrollDetailsSkeleton />
                        ) : (
                            <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
                                <div className="h-10 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-semibold text-[#333]">
                                            {data?.company?.name}
                                        </span>

                                        <span className="text-[12px] text-[#777]">
                                            /
                                        </span>

                                        <span className="text-[12px] text-[#666]">
                                            {data.uid}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-[#777]">
                                                Status
                                            </span>

                                            <span className={`px-2.5 py-1 text-[11px] font-semibold ${data?.status == 'ACTIVE'
                                                ? "text-lime-700 bg-lime-200 border border-lime-400 rounded-full"
                                                : "text-red-700 bg-red-200 border border-red-400 rounded-full"
                                                }`}>
                                                {data?.status == 'ACTIVE' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        {data?.uid && (
                                            <Link
                                                href={`/payroll/payroll-setup/view-config/${data.uid}/edit`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium rounded-md transition-colors cursor-pointer"
                                            >
                                                <PenIcon size={12} />
                                                <span>Edit</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Main content */}
                                <div className="mt-4">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">

                                        {/* Payroll Information */}
                                        <div className="border border-gray-200">

                                            <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                                <span className="text-[12px] font-semibold text-[#333]">
                                                    Payroll Information
                                                </span>
                                            </div>

                                            <div className="bg-white">

                                                {/* Configuration UID */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Configuration UID
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data.uid}
                                                    </div>
                                                </div>

                                                {/* Payroll Country */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Payroll Country
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data.payroll_country}
                                                    </div>
                                                </div>

                                                {/* Currency */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Currency
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data.currency}
                                                    </div>
                                                </div>

                                                {/* Payroll Cycle */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Payroll Cycle
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data.payroll_cycle}
                                                    </div>
                                                </div>

                                                {/* Effective Date */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Effective Date (Every month)
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {formatDate(data.payroll_effective_date)}
                                                    </div>
                                                </div>

                                                {/* Working Days */}
                                                <div className="flex min-h-[42px]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Working Days
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data.working_days}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>

                                        {/* Company Information */}
                                        <div className="border border-gray-200">

                                            <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                                <span className="text-[12px] font-semibold text-[#333]">
                                                    Company Information
                                                </span>
                                            </div>

                                            <div className="bg-white">

                                                {/* Company Name */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Company Name
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.name}
                                                    </div>
                                                </div>

                                                {/* Address */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Address
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.address}
                                                    </div>
                                                </div>

                                                {/* City */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        City
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.city}
                                                    </div>
                                                </div>

                                                {/* State */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        State
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.state}
                                                    </div>
                                                </div>

                                                {/* PIN Code */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        PIN Code
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.pinCode}
                                                    </div>
                                                </div>

                                                {/* Phone */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Phone
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.phone}
                                                    </div>
                                                </div>

                                                {/* Email */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Email
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.email}
                                                    </div>
                                                </div>

                                                {/* Website */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        Website
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.website}
                                                    </div>
                                                </div>

                                                {/* CIN */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        CIN
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.cin}
                                                    </div>
                                                </div>

                                                {/* PAN */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        PAN
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.pan}
                                                    </div>
                                                </div>

                                                {/* GSTIN */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        GSTIN
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.gstin}
                                                    </div>
                                                </div>

                                                {/* EPFO */}
                                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        EPFO Establishment ID
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.epfoEstablishmentId}
                                                    </div>
                                                </div>

                                                {/* ESIC */}
                                                <div className="flex min-h-[42px]">
                                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                        ESIC Employer Code
                                                    </div>

                                                    <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                        {data?.company?.esicEmployerCode}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                    {/* Cut-off Configuration */}
                                    <div className="border border-gray-200 mb-4">

                                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                            <span className="text-[12px] font-semibold text-[#333]">
                                                Cut-off & Payment Configuration
                                            </span>
                                        </div>

                                        <div className="overflow-hidden">

                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-[#f3f3f3]">

                                                        <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555]">
                                                            Configuration
                                                        </th>

                                                        <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555]">
                                                            Day
                                                        </th>

                                                        <th className="border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555]">
                                                            Frequency
                                                        </th>

                                                    </tr>
                                                </thead>

                                                <tbody>

                                                    <tr>
                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            Attendance Cut-off
                                                        </td>

                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            {data.attendance_cut_off}Hours
                                                        </td>

                                                        <td className="border-b border-[#ededed] px-3 py-2 text-[12px] text-[#666]">
                                                            Minimum Work required to count as a half day.
                                                        </td>
                                                    </tr>

                                                    <tr className="bg-[#fafafa]">
                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            Leave Cut-off
                                                        </td>

                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            {data.leave_cut_off}
                                                        </td>

                                                        <td className="border-b border-[#ededed] px-3 py-2 text-[12px] text-[#666]">

                                                        </td>
                                                    </tr>

                                                    <tr>
                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            Overtime Cut-off
                                                        </td>

                                                        <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            {data.overtime_cut_off == null ? "N/A" : data.overtime_cut_off + "Hours"}
                                                        </td>

                                                        <td className="border-b border-[#ededed] px-3 py-2 text-[12px] text-[#666]">
                                                            Beyond this worked to count as overtime.
                                                        </td>
                                                    </tr>

                                                    <tr className="bg-[#fafafa]">
                                                        <td className="border-r border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            Salary Payment Date
                                                        </td>

                                                        <td className="border-r border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                                                            {getOrdinal(data.salary_payment_date)}
                                                        </td>

                                                        <td className="px-3 py-2 text-[12px] text-[#666]">
                                                            Monthly
                                                        </td>
                                                    </tr>

                                                </tbody>
                                            </table>

                                        </div>
                                    </div>

                                    {/* Financial Year */}
                                    <div className="border border-gray-200 mb-4">

                                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                            <span className="text-[12px] font-semibold text-[#333]">
                                                Financial Year & Salary Calendar
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4">

                                            <div className="border-r border-[#ededed]">
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Start Month
                                                </div>

                                                <div className="px-3 py-2.5 text-[12px] text-[#222]">
                                                    {getMonthName(data.financial_year_start_month)}
                                                </div>
                                            </div>

                                            <div className="border-r border-[#ededed]">
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    End Month
                                                </div>

                                                <div className="px-3 py-2.5 text-[12px] text-[#222]">
                                                    {getMonthName(data.financial_year_end_month)}
                                                </div>
                                            </div>

                                            <div className="border-r border-[#ededed]">
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Financial year
                                                </div>

                                                <div className="px-3 py-2.5 text-[12px] text-[#222]">
                                                    {data.financial_year_start_month && data.financial_year_end_month ? getFinancialYear(data.financial_year_start_month, data.financial_year_end_month) : '-'}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Salary Calendar
                                                </div>

                                                <div className="px-3 py-2.5 text-[12px] text-[#222]">
                                                    {data.salary_calendar}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Approval and Status */}
                                    <div className="border border-gray-200 mb-4">

                                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                            <span className="text-[12px] font-semibold text-[#333]">
                                                Approval & Status
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3">

                                            <div className="border-r border-[#ededed]">
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Approval
                                                </div>

                                                <div className="px-3 py-2.5">
                                                    <span className={`text-[11px] font-semibold ${data.approval == "NO" ? "text-yellow-600" : "text-green-600"}`}>
                                                        {data.approval == "NO" ? "Pending" : "Approved"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="border-r border-[#ededed]">
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Status
                                                </div>

                                                <div className="px-3 py-2.5">
                                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold ${data.status == "ACTIVE" ? "bg-lime-200 border border-lime-400 text-lime-700" : "bg-red-200 border border-red-400 text-red-700"} rounded-full`}>
                                                        {data.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                                                    Remarks
                                                </div>

                                                <div className="px-3 py-2.5 text-[12px] text-[#333]">
                                                    {data.remarks || "N/A"}
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Audit Information */}
                                    <div className="border border-gray-200">

                                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                            <span className="text-[12px] font-semibold text-[#333]">
                                                Timestamps
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2">

                                            <div className="flex min-h-[40px] border-r border-[#ededed]">
                                                <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                    Created At
                                                </div>

                                                <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                    {formatDate(data.createdAt)}
                                                </div>
                                            </div>

                                            <div className="flex min-h-[40px]">
                                                <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                                                    Updated At
                                                </div>

                                                <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                                                    {formatDate(data.updatedAt)}
                                                </div>
                                            </div>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </>
    );
}