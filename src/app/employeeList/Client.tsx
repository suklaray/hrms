"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import { TableSkeleton } from "@/Components/Skeletons";
import { useRouter } from "@/lib/compatRouter";
import { toast } from "react-toastify";
import { swalConfirm } from "@/utils/confirmDialog";
import Link from "next/link";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Filter,
    Mail,
    Phone,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Users,
} from "lucide-react";

// Format date helper
function formatDisplayDate(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// Role badge color helper
function getRoleBadge(roleName?: string | null) {
    const role = (roleName || "").toLowerCase();
    if (role.includes("super")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (role.includes("admin")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (role.includes("hr")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (role.includes("recruit")) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
}

// Static status badge (read-only)
function EmployeeStatusBadge({ status }: { status: string }) {
    const isActive = status?.toLowerCase() === "active";
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border select-none ${isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
            <span>{isActive ? "Active" : (status || "Inactive")}</span>
        </span>
    );
}

function EmployeeListPage({ user }: { user: any }) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filter, setFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();
    const itemsPerPage = 10;

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/employees");
            const data = await res.json();

            if (res.ok && data.success) {
                setEmployees(Array.isArray(data.users) ? data.users : []);
                setRoles(Array.isArray(data.roles) ? data.roles : []);
            } else {
                setEmployees([]);
                setRoles([]);
                toast.error(data.error || "Failed to load employees");
            }
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setEmployees([]);
            setRoles([]);
            toast.error("An error occurred while fetching employees");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleLogout = () => {
        router.push("/login");
    };

    const handleView = (id: number | string) => {
        router.push(`/employee/view/${id}`);
    };

    const handleDelete = async (id: number | string) => {
        const confirm = await swalConfirm(
            "Do you want to remove this employee and make the user inactive? You won't be able to access this employee."
        );
        if (!confirm) return;

        try {
            const res = await fetch(`/api/auth/employee/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setEmployees((prev) => prev.filter((emp) => emp.id !== id));
                toast.success("Employee has been made inactive successfully.");
            } else {
                toast.error("Failed to make employee inactive. Please try again.");
            }
        } catch (error) {
            console.error("Error making employee inactive:", error);
            toast.error("Error occurred while deleting employee. Please try again.");
        }
    };

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Filter employees by Role, Status, and Search query
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            // Role filter
            if (filter !== "All") {
                const target = emp.rbacRole?.name?.toLowerCase();
                if (target !== filter.toLowerCase()) return false;
            }

            // Status filter
            if (statusFilter !== "ALL") {
                if (emp.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
            }

            // Search filter
            if (searchTerm.trim() !== "") {
                const q = searchTerm.toLowerCase();
                const matchesName = (emp.name || "").toLowerCase().includes(q);
                const matchesEmail = (emp.email || "").toLowerCase().includes(q);
                const matchesEmpId = String(emp.empid || "").toLowerCase().includes(q);
                const matchesPosition = (emp.position || "").toLowerCase().includes(q);
                const matchesContact = String(emp.contact_number || "").toLowerCase().includes(q);
                return matchesName || matchesEmail || matchesEmpId || matchesPosition || matchesContact;
            }

            return true;
        });
    }, [employees, filter, statusFilter, searchTerm]);

    // Metrics for summary cards
    const totalEmployeesCount = employees.length;
    const activeCount = employees.filter((e) => e.status?.toLowerCase() === "active").length;
    const inactiveCount = employees.filter((e) => e.status?.toLowerCase() === "inactive").length;

    // Pagination logic
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

    // Export to Excel
    const handleDownloadExcel = () => {
        if (filteredEmployees.length === 0) {
            toast.error("No employee data available to download.");
            return;
        }

        const excelData = filteredEmployees.map((emp) => ({
            "Employee ID": emp.empid || "",
            Name: emp.name || "",
            Email: emp.email || "",
            Contact: emp.contact_number || "",
            Role: emp.rbacRole?.name || "",
            Position: emp.position || "",
            "Date of Joining": emp.date_of_joining ? formatDisplayDate(emp.date_of_joining) : "",
            Experience: emp.experience ? `${emp.experience}y` : "",
            Status: emp.status || "Inactive",
        }));

        import("xlsx")
            .then((XLSX) => {
                const ws = XLSX.utils.json_to_sheet(excelData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Employees");
                XLSX.writeFile(
                    wb,
                    `employees_${user?.role || "all"}_${new Date().toISOString().split("T")[0]}.xlsx`
                );
                toast.success("Employee list exported successfully.");
            })
            .catch((err) => {
                console.error("Error exporting Excel:", err);
                toast.error("Failed to export Excel file.");
            });
    };

    return (
        <>
            <Head>
                <title>Employee Directory - HRMS</title>
            </Head>

            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
                <SideBar handleLogout={handleLogout} />

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Pageheader
                        title="Employee Directory"
                        description="Manage, monitor, and view all registered staff and employees in your organization."
                        href="/dashboard"
                    />

                    {/* Top Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            {user?.role && (
                                <span className="text-[11px] font-medium text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-xs">
                                    Logged in as: <span className="font-semibold text-gray-800">{user.role}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <button
                                onClick={handleDownloadExcel}
                                className="inline-flex items-center gap-2 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0"
                                title="Download employee list as Excel"
                            >
                                <Download size={14} />
                                <span>Export Excel</span>
                            </button>

                            <Link
                                href="/registerEmployee"
                                className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer shrink-0"
                            >
                                <Plus size={14} />
                                <span>Register Employee</span>
                            </Link>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* METRIC STATS OVERVIEW */}
                    {/* ========================================================= */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Total Employees
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-gray-900">{totalEmployeesCount}</span>
                                <Users size={16} className="text-indigo-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                                Active Employees
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
                                Inactive
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-red-700">{inactiveCount}</span>
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
                                Roles Configured
                            </span>
                            <div className="mt-1 flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-purple-700">{roles.length}</span>
                                <ShieldCheck size={16} className="text-purple-400" />
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ROLE FILTER TABS (MATCHING PAYROLL PERIODS DESIGN) */}
                    {/* ========================================================= */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-t-lg px-4 pt-3 border-b-0">
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
                            <button
                                type="button"
                                onClick={() => handleFilterChange("All")}
                                className={`
                                    inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border
                                    ${filter === "All"
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }
                                `}
                            >
                                <span>All Employees</span>
                                <span
                                    className={`
                                        px-1.5 py-0.2 rounded-full text-[10px] font-medium
                                        ${filter === "All"
                                            ? "bg-indigo-800 text-indigo-100"
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                        }
                                    `}
                                >
                                    {employees.length}
                                </span>
                            </button>

                            {roles.map((role) => {
                                const isSelected = filter.toLowerCase() === role.name.toLowerCase();
                                return (
                                    <button
                                        key={role.id || role.name}
                                        type="button"
                                        onClick={() => handleFilterChange(role.name)}
                                        className={`
                                            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shrink-0 cursor-pointer border
                                            ${isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        <span>{role.name}</span>
                                        <span
                                            className={`
                                                px-1.5 py-0.2 rounded-full text-[10px] font-medium
                                                ${isSelected
                                                    ? "bg-indigo-800 text-indigo-100"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                                }
                                            `}
                                        >
                                            {role.count}
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
                                placeholder="Search name, email, ID, position..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                                <Filter size={13} />
                                <span>Status:</span>
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="text-[12px] bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>

                            <button
                                type="button"
                                onClick={fetchEmployees}
                                title="Refresh employees"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* EMPLOYEES TABLE */}
                    {/* ========================================================= */}
                    <div className="bg-white shadow-sm border border-gray-200 rounded-b-lg overflow-hidden border-t-0 mb-4">
                        {loading ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {["#", "Employee", "Contact Details", "Position & Exp", "Role", "Date Joined", "Status", "Actions"].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <TableSkeleton rows={8} columns={8} />
                            </table>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3.5">
                                    <Users className="w-7 h-7" />
                                </div>
                                <h3 className="text-[15px] font-bold text-gray-900">
                                    No Employees Found
                                </h3>
                                <p className="text-[12px] text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                                    {searchTerm || filter !== "All" || statusFilter !== "ALL"
                                        ? "No employees match your search or filter criteria. Try resetting your filters."
                                        : "There are currently no employees registered in the system. Click below to add your first employee."
                                    }
                                </p>
                                <div className="mt-5">
                                    {searchTerm || filter !== "All" || statusFilter !== "ALL" ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setFilter("All");
                                                setStatusFilter("ALL");
                                                setCurrentPage(1);
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-semibold rounded-md transition-colors cursor-pointer"
                                        >
                                            <span>Reset Filters</span>
                                        </button>
                                    ) : (
                                        <Link
                                            href="/registerEmployee"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                                        >
                                            <Plus size={14} />
                                            <span>Register Employee</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50/70">
                                        <tr>
                                            {["#", "Employee", "Contact Details", "Position & Exp", "Role", "Date Joined", "Status", "Actions"].map((h) => (
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
                                        {paginatedEmployees.map((emp, index) => {
                                            const itemNumber = startIndex + index + 1;

                                            return (
                                                <tr
                                                    key={emp.id}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    {/* Number */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-400 font-mono">
                                                        {String(itemNumber).padStart(2, "0")}
                                                    </td>

                                                    {/* Employee Avatar + Name + ID */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {emp.profile_photo ? (
                                                                <img
                                                                    src={emp.profile_photo}
                                                                    alt={emp.name || "Employee"}
                                                                    className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                                                />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[12px] flex items-center justify-center border border-indigo-200 shrink-0">
                                                                    {emp.name?.charAt(0)?.toUpperCase() || "E"}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-[12px] font-semibold text-gray-900 leading-snug">
                                                                    {emp.name}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 font-mono">
                                                                    ID: {emp.empid}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Contact */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="space-y-0.5">
                                                            <div className="text-[12px] text-gray-900 font-medium flex items-center gap-1.5">
                                                                <Mail size={12} className="text-gray-400 shrink-0" />
                                                                <span className="truncate max-w-[200px]">{emp.email}</span>
                                                            </div>
                                                            {emp.contact_number && (
                                                                <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                                                    <Phone size={11} className="text-gray-400 shrink-0" />
                                                                    <span>{emp.contact_number}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Position & Experience */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="text-[12px] text-gray-800 font-medium">
                                                            {emp.position || "Not assigned"}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            {emp.experience ? `${emp.experience}y experience` : "Fresher / Unspecified"}
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(
                                                                emp.rbacRole?.name
                                                            )}`}
                                                        >
                                                            {emp.rbacRole?.name || "No Role"}
                                                        </span>
                                                    </td>

                                                    {/* Joining Date */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px] text-gray-700">
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar size={12} className="text-gray-400 shrink-0" />
                                                            <span>{formatDisplayDate(emp.date_of_joining)}</span>
                                                        </span>
                                                    </td>

                                                    {/* Status (Read-only Badge) */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <EmployeeStatusBadge status={emp.status} />
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-[12px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link
                                                                href={`/employee/view/${emp.id}`}
                                                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                                                                title="View Employee Profile"
                                                            >
                                                                <Eye size={13} />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(emp.id)}
                                                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer"
                                                                title="Deactivate / Delete Employee"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* PAGINATION */}
                    {/* ========================================================= */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                            <div className="text-[12px] text-gray-600 font-medium">
                                Showing <span className="text-gray-900 font-semibold">{startIndex + 1}</span> to{" "}
                                <span className="text-gray-900 font-semibold">
                                    {Math.min(startIndex + itemsPerPage, filteredEmployees.length)}
                                </span>{" "}
                                of <span className="text-gray-900 font-semibold">{filteredEmployees.length}</span>{" "}
                                employees
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`inline-flex items-center justify-center p-1.5 rounded-md border text-[12px] transition-colors ${currentPage === 1
                                        ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                                        }`}
                                >
                                    <ChevronLeft size={14} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(
                                        (page) =>
                                            page === 1 ||
                                            page === totalPages ||
                                            Math.abs(page - currentPage) <= 1
                                    )
                                    .map((page, idx, arr) => {
                                        const prev = arr[idx - 1];
                                        return (
                                            <div key={page} className="flex items-center">
                                                {prev && page - prev > 1 && (
                                                    <span className="px-1 text-gray-400 text-[11px]">...</span>
                                                )}
                                                <button
                                                    onClick={() => handlePageChange(page)}
                                                    className={`h-7 w-7 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${page === currentPage
                                                        ? "bg-indigo-600 text-white shadow-xs"
                                                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            </div>
                                        );
                                    })}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`inline-flex items-center justify-center p-1.5 rounded-md border text-[12px] transition-colors ${currentPage === totalPages
                                        ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50/50"
                                        : "border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                                        }`}
                                >
                                    <ChevronRight size={14} />
                                </button>
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
            <EmployeeListPage {...props} />
        </Suspense>
    );
}
