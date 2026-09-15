import React from 'react'
import Head from 'next/head';
import { useRouter } from 'next/router';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import SideBar from '@/Components/SideBar';
import { getUserFromToken } from "@/lib/getUserFromToken";

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


const PayrollCreateConfig = ({ user }) => {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };
    return (
        <>
            <Head>
                <title>Payroll Configuration - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <SideBar handleLogout={handleLogout} />
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    {/* Header */}
                    <div className="-mx-6 lg:-mx-6 -mt-6 lg:-mt-8 mb-8 px-6 lg:px-8 py-5 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                                    Payroll Configuration
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Fill in all required information for payroll configuration
                                </p>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PayrollCreateConfig