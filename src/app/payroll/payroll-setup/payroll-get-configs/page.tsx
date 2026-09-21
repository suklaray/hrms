"use client";

import { Suspense } from "react";
import Head from "@/lib/compatHead";
import SideBar from '@/Components/SideBar';
import { useRouter } from "@/lib/compatRouter";
import { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import getFinancialYear from '@/lib/financialYearCalculation';
import { Check, Eye, PenIcon, X } from 'lucide-react';
import Link from 'next/link';
import Pageheader from '@/Components/PageHeader';
import { TableSkeleton } from '@/Components/Skeletons';
import { getOrdinal } from '@/lib/getNumberordinal';
import { swalConfirm } from '@/utils/confirmDialog';

const PayrollGetConfigs = () => {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/payroll/configurations')
            .then(async (res) => {
                const result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || `Request failed with status ${res.status}`);
                }
                return result;
            })
            .then(data => {
                if (data.success) {
                    setData(data.data || []);
                } else {
                    toast.error(data.message || "Failed to fetch payroll configurations");
                }
            })
            .catch(err => {
                console.error("Error fetching payroll configurations:", err);
                toast.error(err.message || "Failed to fetch payroll configurations");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Handle status change
    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        let confirmed;
        if (newStatus === "INACTIVE") {
            confirmed = await swalConfirm(`Are you sure you want to deactive this payroll configuration?`, `Deactive`);
        } else {
            confirmed = true;
        }
        if (!confirmed) return;

        try {
            const res = await fetch('/api/payroll/configuration', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });
            const result = await res.json();

            if (result.success) {
                toast.success(`Configuration marked as ${newStatus}`);
                setData(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
            } else {
                toast.error(result.message || "Failed to update status");
            }
        } catch (err) {
            toast.error("An error occurred while updating status");
        }
    };

    return (
        <>
            <Head>
                <title>Payroll Configuration - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <SideBar />
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Manage Configurations"
                        description="Manage with active or deactive any payroll configuration"
                        href="/dashboard"
                    />
                    <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-[14px] font-semibold text-gray-900">Existing Payroll Configurations</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Company', 'Country', 'Currency', 'Cycle', 'Salary Date', 'Financial year', 'Status', 'Approval', 'Actions'].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                {loading ? (
                                    <TableSkeleton rows={5} columns={9} />
                                ) : data.length === 0 ? (
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                            <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                                                No payroll configurations found.
                                            </td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.map((config) => (
                                            <tr key={config.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{config.company.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{config.payroll_country}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{config.currency}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{config.payroll_cycle}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{getOrdinal(config.salary_payment_date)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">{getFinancialYear(config.financial_year_start_month, config.financial_year_end_month)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleStatusToggle(config.id, config.status)
                                                        }
                                                        className={`relative w-[50px] h-[25px] rounded-full transition-colors duration-200
                                                            ${config.status === "ACTIVE"
                                                                ? "bg-[#78c267]"
                                                                : "bg-[#ef3519]"
                                                            }`}
                                                    >
                                                        {/* Status icon */}
                                                        <span className={`absolute top-1/2 -translate-y-1/2 text-white transition-all duration-200 ${config.status === "ACTIVE" ? "left-2" : "right-2"}`}>
                                                            {config.status === "ACTIVE" ? (
                                                                <Check size={12} strokeWidth={3} />
                                                            ) : (
                                                                <X size={12} strokeWidth={3} />
                                                            )}
                                                        </span>

                                                        {/* White toggle circle */}
                                                        <span
                                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${config.status === "ACTIVE"
                                                                ? "right-1"
                                                                : "left-1"
                                                                }`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">
                                                        {
                                                            config.approval === 'YES' ?
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-[#f4f7fd] flex items-center justify-center shadow-sm">
                                                                        <div className="w-3 h-3 rounded-full bg-[#78c267]" />
                                                                    </div>
                                                                    <span className="text-[12px] font-medium text-gray-900">Approaved</span>
                                                                </div>
                                                                :
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-[#f4f7fd] flex items-center justify-center shadow-[0_2px_7px_rgba(0,0,0,0.07)]">
                                                                        <div className="w-3 h-3 rounded-full bg-[#b8d9d9]" />
                                                                    </div>
                                                                    <span className="text-[12px] font-medium text-gray-400">Pending</span>
                                                                </div>
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-[12px] font-medium text-gray-900">
                                                        <div className="flex space-x-2">
                                                            <Link
                                                                href={`/payroll/payroll-setup/view-config/${config.uid}`}
                                                                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <Eye size={14} />
                                                            </Link>
                                                            <Link
                                                                href={`/payroll/payroll-setup/view-config/${config.uid}/edit`}
                                                                className="bg-orange-200 hover:bg-orange-300 text-orange-700 p-2 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <PenIcon size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </td>
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
}



export default function PageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <PayrollGetConfigs {...props} />
    </Suspense>
  );
}
