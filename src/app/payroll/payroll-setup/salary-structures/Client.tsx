"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "@/lib/compatHead";
import Pageheader from "@/Components/PageHeader";
import { TableSkeleton } from "@/Components/Skeletons";
import { swalConfirm } from "@/utils/confirmDialog";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  PenIcon,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface SalaryComponentInfo {
  id: number;
  uid: string;
  name: string;
  code: string;
  type: "EARNING" | "DEDUCTION";
  calculation_type: "FIXED" | "PERCENTAGE" | "FORMULA";
  taxable?: boolean;
  statutory?: boolean;
}

interface StructureComponentRow {
  id: number;
  uid: string;
  salary_structure_id: number;
  salary_component_id: number;
  calculation_type: "FIXED" | "PERCENTAGE";
  value: number;
  base_component_id: number | null;
  sequence: number;
  salaryComponent?: SalaryComponentInfo;
  salary_component?: SalaryComponentInfo;
  baseComponent?: { id: number; uid: string; name: string; code: string; type?: string } | null;
  base_component?: { id: number; uid: string; name: string; code: string; type?: string } | null;
}

interface SalaryStructureItem {
  id: number;
  uid: string;
  company_id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  company?: { id: number; uid: string; name: string };
  componentsCount: number;
  assignedEmployeesCount: number;
  components: StructureComponentRow[];
  stats: {
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
  };
}

export default function SalaryStructuresClient({ user }: { user?: any } = {}) {
  const [data, setData] = useState<SalaryStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewingStructure, setViewingStructure] = useState<SalaryStructureItem | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/salary-structures");
      const result = await res.json();
      if (res.ok && result.success) {
        setData(result.data || []);
      } else {
        toast.error(result.message || "Failed to load salary structures.");
      }
    } catch (err: any) {
      console.error("Error loading salary structures:", err);
      toast.error(err?.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  // Filtered list
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const codeMatch = item.code.toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        const compMatch = item.company?.name.toLowerCase().includes(q);
        return nameMatch || codeMatch || descMatch || compMatch;
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  // Metric counts
  const totalCount = data.length;
  const activeCount = data.filter((d) => d.status === "ACTIVE").length;
  const inactiveCount = data.filter((d) => d.status === "INACTIVE").length;
  const totalAssignedEmployees = data.reduce((acc, curr) => acc + (curr.assignedEmployeesCount || 0), 0);

  const handleDelete = async (structure: SalaryStructureItem) => {
    if (structure.assignedEmployeesCount > 0) {
      toast.warning(
        `Cannot delete "${structure.name}" because it is assigned to ${structure.assignedEmployeesCount} employee(s). Set status to INACTIVE instead to archive it.`
      );
      return;
    }

    const confirmed = await swalConfirm(
      `Are you sure you want to delete "${structure.name}" (${structure.code})? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingUid(structure.uid);
    try {
      const res = await fetch(`/api/payroll/salary-structures/${structure.uid}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (res.ok && result.success) {
        toast.success(result.message || "Salary structure deleted successfully.");
        setData((prev) => prev.filter((s) => s.uid !== structure.uid));
        if (viewingStructure?.uid === structure.uid) {
          setViewingStructure(null);
        }
      } else {
        toast.error(result.message || "Failed to delete salary structure.");
      }
    } catch (err: any) {
      console.error("Error deleting salary structure:", err);
      toast.error(err?.message || "An unexpected error occurred while deleting.");
    } finally {
      setDeletingUid(null);
    }
  };

  return (
    <>
      <Head>
        <title>Salary Structures | HRMS Payroll</title>
      </Head>

      <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                      Salary Structures
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Manage reusable salary templates, earning rules, deductions, and calculation sequences.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/payroll/payroll-setup/salary-structures/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all shadow-indigo-200"
                >
                  <Plus size={16} />
                  <span>Create Salary Structure</span>
                </Link>
                <Link
                  href="/payroll/employee-salary"
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors"
                  title="Assign to Employees"
                >
                  <Users size={16} className="text-indigo-600" />
                  <span className="hidden sm:inline">Employee Assignments</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Metric Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-colors">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Structures
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Layers size={16} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Reusable salary templates</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-colors">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Active Structures
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-700">{activeCount}</span>
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="text-[11px] text-emerald-600/70 mt-1">Ready for employee assignment</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-colors">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                Inactive Structures
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-700">{inactiveCount}</span>
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                  <Clock size={16} />
                </div>
              </div>
              <p className="text-[11px] text-amber-600/70 mt-1">Archived or disabled</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-colors">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
                Assigned Employees
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-purple-700">{totalAssignedEmployees}</span>
                <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-[11px] text-purple-600/70 mt-1">Total active assignments</p>
            </div>
          </div>

          {/* Search, Filter Toolbar & Table Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Filter size={13} />
                  <span>Status:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs sm:text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>

                <button
                  type="button"
                  onClick={fetchStructures}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
                  title="Refresh list"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-3.5 px-4 sm:px-6">Structure Name & Code</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Description</th>
                    <th className="py-3.5 px-4 text-center">Components</th>
                    <th className="py-3.5 px-4 text-right">Preview Net Pay</th>
                    <th className="py-3.5 px-4 text-center">Assigned</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>

                {loading ? (
                  <TableSkeleton rows={4} columns={7} />
                ) : filteredData.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center">
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 mb-3">
                            <Layers size={28} />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {searchQuery || statusFilter !== "ALL"
                              ? "No matching salary structures found"
                              : "No salary structures configured yet"}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            {searchQuery || statusFilter !== "ALL"
                              ? "Try adjusting your search query or status filter."
                              : "Create your first reusable salary structure with earnings, deductions, and percentage calculation rules."}
                          </p>
                          {!searchQuery && statusFilter === "ALL" && (
                            <Link
                              href="/payroll/payroll-setup/salary-structures/create"
                              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                            >
                              <Plus size={14} />
                              <span>Create First Structure</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                    {filteredData.map((item) => {
                      const earningsCount = item.components.filter(
                        (c) => (c.salaryComponent?.type || "EARNING") === "EARNING"
                      ).length;
                      const deductionsCount = item.components.filter(
                        (c) => (c.salaryComponent?.type || "EARNING") === "DEDUCTION"
                      ).length;

                      return (
                        <tr
                          key={item.uid}
                          className="hover:bg-indigo-50/20 transition-colors group cursor-default"
                        >
                          {/* Name & Code */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                {item.code.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-block px-1.5 py-0.2 bg-gray-100 border border-gray-200 text-gray-600 rounded text-[10px] font-mono font-medium">
                                    {item.code}
                                  </span>
                                  {item.company?.name && (
                                    <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                                      • {item.company.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 hidden md:table-cell text-gray-500 max-w-xs truncate text-xs">
                            {item.description || <span className="text-gray-300 italic">No description</span>}
                          </td>

                          {/* Components */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="font-semibold text-gray-800 text-xs">
                                {item.componentsCount} components
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <span className="text-indigo-600 font-medium">{earningsCount} Earn</span>
                                <span>/</span>
                                <span className="text-amber-600 font-medium">{deductionsCount} Ded</span>
                              </div>
                            </div>
                          </td>

                          {/* Preview Net Pay */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm font-mono">
                              ₹{item.stats.netSalary.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Gross: ₹{item.stats.totalEarnings.toLocaleString("en-IN")}
                            </div>
                          </td>

                          {/* Assigned Employees */}
                          <td className="py-3.5 px-4 text-center">
                            {item.assignedEmployeesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-semibold">
                                <Users size={11} />
                                {item.assignedEmployeesCount}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">0</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {item.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setViewingStructure(item)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100"
                                title="View Structure Breakdown"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Edit */}
                              <Link
                                href={`/payroll/payroll-setup/salary-structures/${item.uid}/edit`}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100 inline-block"
                                title="Edit Structure"
                              >
                                <PenIcon size={15} />
                              </Link>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={deletingUid === item.uid}
                                className={`p-1.5 rounded-lg transition-colors border border-gray-100 ${item.assignedEmployeesCount > 0
                                    ? "text-gray-300 hover:text-gray-400 cursor-not-allowed"
                                    : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                                  }`}
                                title={
                                  item.assignedEmployeesCount > 0
                                    ? `Cannot delete: Assigned to ${item.assignedEmployeesCount} employee(s)`
                                    : "Delete Structure"
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>

            {/* Table Footer info */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {filteredData.length} of {data.length} structures
              </span>
              <span className="hidden sm:inline">
                Click <b>View Breakdown</b> to inspect component calculation trees.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW STRUCTURE BREAKDOWN MODAL */}
      {/* =================================================================== */}
      {viewingStructure && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    {viewingStructure.name}
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-gray-100 border border-gray-200 text-gray-700">
                      {viewingStructure.code}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {viewingStructure.description || "No description provided."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingStructure(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Meta tags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Status</span>
                  <span className="font-semibold text-gray-800">
                    {viewingStructure.status === "ACTIVE" ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-gray-600">Inactive</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Assigned Staff</span>
                  <span className="font-semibold text-purple-700">
                    {viewingStructure.assignedEmployeesCount} employee(s)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Components</span>
                  <span className="font-semibold text-gray-800">{viewingStructure.componentsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Company</span>
                  <span className="font-semibold text-gray-800 truncate block">
                    {viewingStructure.company?.name || "Default Company"}
                  </span>
                </div>
              </div>

              {/* Component breakdown table */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Configured Component Rules</span>
                  <span className="text-[11px] font-normal text-gray-500">Evaluation sequence order</span>
                </h4>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Component</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3">Calculation Rule</th>
                        <th className="py-2.5 px-3 text-right">Calculated Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingStructure.components.map((c, idx) => {
                        const comp = c.salaryComponent || c.salary_component;
                        const baseComp = c.baseComponent || c.base_component;
                        const isEarning = comp?.type === "EARNING";

                        return (
                          <tr key={c.uid || idx} className="hover:bg-gray-50/60">
                            <td className="py-2.5 px-3 font-mono text-gray-400">{c.sequence || idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-gray-900 block">{comp?.name || `Component #${c.salary_component_id}`}</span>
                              <span className="text-[10px] font-mono text-gray-400">{comp?.code}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isEarning ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  EARNING
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  DEDUCTION
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {c.calculation_type === "FIXED" ? (
                                <span className="font-mono text-gray-700">Fixed ₹{Number(c.value).toLocaleString("en-IN")}</span>
                              ) : (
                                <div className="text-gray-700">
                                  <span className="font-semibold text-indigo-600">{Number(c.value)}%</span>
                                  <span className="text-gray-400 ml-1">of {baseComp?.name || `Base (#${c.base_component_id})`}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                              {/* Calculated row amount */}
                              {isEarning ? (
                                <span className="text-emerald-700">
                                  +₹{c.calculation_type === "FIXED" ? Number(c.value).toLocaleString("en-IN") : ""}
                                </span>
                              ) : (
                                <span className="text-amber-700">
                                  -₹{c.calculation_type === "FIXED" ? Number(c.value).toLocaleString("en-IN") : ""}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Total Box */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Gross Calculated Earnings:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    ₹{viewingStructure.stats.totalEarnings.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Total Calculated Deductions:</span>
                  <span className="font-bold text-amber-700 font-mono">
                    -₹{viewingStructure.stats.totalDeductions.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-sm">
                  <span className="font-bold text-indigo-950">Net Take-Home Preview:</span>
                  <span className="font-bold text-indigo-700 font-mono text-base">
                    ₹{viewingStructure.stats.netSalary.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <Link
                href={`/payroll/payroll-setup/salary-structures/${viewingStructure.uid}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                <PenIcon size={13} />
                <span>Edit Structure</span>
              </Link>

              <button
                type="button"
                onClick={() => setViewingStructure(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
