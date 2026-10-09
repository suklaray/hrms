"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Search, Filter, Download, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import SideBar from "@/Components/SideBar";

interface AuditLog {
  id: number;
  uid: string;
  userId: number | null;
  user?: { empid: string } | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  module: string;
  description: string | null;
  targetId: string | null;
  currentStatus: string;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  search: string;
  module: string;
  approvalStatus: string;
  from: string;
  to: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function DetailModal({ log, onClose, onStatusChange }: { log: AuditLog; onClose: () => void; onStatusChange: (uid: string, status: "APPROVED" | "REJECTED") => Promise<void> }) {
  const [acting, setActing] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    setActing(status);
    setError("");
    try {
      await onStatusChange(log.uid, status);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to update status");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-indigo-700 mb-4">Log Detail</h3>
        <div className="space-y-2 text-sm text-gray-700">
          {[
            ["UID", log.uid],
            ["Emp ID", log.user?.empid ?? "—"],
            ["User", log.userName ?? "—"],
            ["Role", log.userRole ?? "—"],
            ["Module", log.module],
            ["Action", log.action],
            ["Description", log.description ?? "—"],
            ["Target ID", log.targetId ?? "—"],
            ["Status", log.currentStatus],
            ["Old Status", log.oldStatus ?? "—"],
            ["New Status", log.newStatus ?? "—"],
            ["Timestamp", new Date(log.createdAt).toLocaleString()],
            ["Reviewed At", log.reviewedAt ? new Date(log.reviewedAt).toLocaleString() : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="font-semibold w-32 shrink-0">{label}:</span>
              <span className="break-all">{value}</span>
            </div>
          ))}
        </div>
        {log.currentStatus === "PENDING" && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => handleAction("APPROVED")}
              disabled={!!acting}
              className="flex-1 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-xl cursor-pointer transition-colors"
            >
              {acting === "APPROVED" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => handleAction("REJECTED")}
              disabled={!!acting}
              className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-xl cursor-pointer transition-colors"
            >
              {acting === "REJECTED" ? "Rejecting..." : "Reject"}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [modules, setModules] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: "", module: "", approvalStatus: "", from: "", to: "" });
  const [applied, setApplied] = useState<Filters>({ search: "", module: "", approvalStatus: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch("/api/audit/logs?distinct=modules")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setModules(data))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (page: number, f: Filters) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (f.module) params.set("module", f.module);
    if (f.search) params.set("action", f.search);
    if (f.approvalStatus) params.set("approvalStatus", f.approvalStatus);
    if (f.from) params.set("from", f.from);
    if (f.to) params.set("to", f.to);

    try {
      const res = await fetch(`/api/audit/logs?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.data ?? []);
      setPagination(data.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, applied);
  }, [applied, fetchLogs]);

  const handleApplyFilters = () => {
    setApplied({ ...filters });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const empty: Filters = { search: "", module: "", approvalStatus: "", from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
    setShowFilters(false);
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (applied.module) params.set("module", applied.module);
    if (applied.search) params.set("action", applied.search);
    if (applied.approvalStatus) params.set("approvalStatus", applied.approvalStatus);
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);

    const res = await fetch(`/api/audit/logs/export?${params}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track all system activity and changes</p>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by action..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && setApplied({ ...filters })}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Module</label>
                  <select
                    value={filters.module}
                    onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">All Modules</option>
                    {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select
                    value={filters.approvalStatus}
                    onChange={(e) => setFilters((f) => ({ ...f, approvalStatus: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer">
                  Apply
                </button>
                <button onClick={handleClearFilters} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Emp ID", "User", "Role", "Module", "Action", "Description", "Status", "Timestamp", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">Loading...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">No audit logs found.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.user?.empid ?? "—"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.userName ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">{log.userRole ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.module}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.action}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-48 truncate" title={log.description ?? ""}>{log.description ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={log.currentStatus} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg cursor-pointer"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLogs(pagination.page - 1, applied)}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">{pagination.page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => fetchLogs(pagination.page + 1, applied)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedLog && (
        <DetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onStatusChange={async (uid, status) => {
            const res = await fetch(`/api/audit/logs/${uid}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Request failed");
            }
            fetchLogs(pagination.page, applied);
          }}
        />
      )}
    </div>
  );
}

export default function ClientPageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <AuditLogs {...props} />
    </Suspense>
  );
}
