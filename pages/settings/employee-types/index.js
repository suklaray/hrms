// pages/settings/employee-types/index.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { Plus, Eye, Edit, Trash2, Users, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { swalConfirm } from '@/utils/confirmDialog';

export default function EmployeeTypes() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
    parentId: '',
    permissionIds: [],
  });

  const fetchData = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/settings/employee-types'),
        fetch('/api/settings/employee-types/permissions'),
      ]);

      if (!rolesRes.ok) {
        if (rolesRes.status === 403) {
          router.replace('/403');
          return;
        }
        throw new Error('Failed to fetch roles');
      }

      const { roles } = await rolesRes.json();
      const { grouped } = await permsRes.json();

      setRoles(roles);
      setGroupedPermissions(grouped);
      // Expand all categories by default
      setExpandedCategories(Object.keys(grouped).reduce((a, k) => ({ ...a, [k]: true }), {}));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePermission = (id) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((p) => p !== id)
        : [...prev.permissionIds, id],
    }));
  };

  const toggleCategory = (category, perms) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => form.permissionIds.includes(id));
    setForm((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !ids.includes(id))
        : [...new Set([...prev.permissionIds, ...ids])],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');

    setSubmitting(true);
    try {
      const res = await fetch('/api/settings/employee-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Failed to create');

      toast.success('Employee type created successfully');
      setForm({ name: '', description: '', status: 'active', parentId: '', permissionIds: [] });
      setShowForm(false);
      fetchData();
    } catch {
      toast.error('Failed to create employee type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await swalConfirm(`Delete "${name}"? This will unlink all assigned users.`, "Delete");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/settings/employee-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Employee Types - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Types</h1>
                <p className="text-gray-500 text-sm mt-1">Manage roles and their permissions</p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
              >
                <Plus size={16} />
                New Employee Type
              </button>
            </div>

            {/* Create Form */}
            {showForm && (
              <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Employee Type</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Senior Developer"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Optional description"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-3 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Role <span className="text-gray-400 font-normal">(optional — for hierarchy)</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-left text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">
                          {roles.find((r) => String(r.id) === String(form.parentId))
                            ? roles.find((r) => String(r.id) === String(form.parentId)).name
                            : "— No parent (top-level role) —"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isParentDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isParentDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="Search parent role..."
                              value={parentSearchTerm}
                              onChange={(e) => setParentSearchTerm(e.target.value)}
                              className="w-full text-xs bg-transparent focus:outline-none"
                              autoFocus
                            />
                          </div>

                          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50">
                            <button
                              type="button"
                              onClick={() => {
                                setForm((p) => ({ ...p, parentId: '' }));
                                setIsParentDropdownOpen(false);
                                setParentSearchTerm('');
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between cursor-pointer ${
                                !form.parentId ? "bg-indigo-50 font-semibold text-indigo-600" : "text-gray-600"
                              }`}
                            >
                              <span>— No parent (top-level role) —</span>
                              {!form.parentId && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>

                            {roles
                              .filter((r) => r.name.toLowerCase().includes(parentSearchTerm.toLowerCase())).length === 0 ? (
                              <div className="p-3 text-xs text-gray-500 text-center">
                                No matching roles found
                              </div>
                            ) : (
                              roles
                                .filter((r) => r.name.toLowerCase().includes(parentSearchTerm.toLowerCase()))
                                .map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      setForm((p) => ({ ...p, parentId: r.id }));
                                      setIsParentDropdownOpen(false);
                                      setParentSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between cursor-pointer ${
                                      String(form.parentId) === String(r.id)
                                        ? "bg-indigo-50 font-semibold text-indigo-600"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-medium">{r.name}</div>
                                      {r.description && (
                                        <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                                          {r.description}
                                        </div>
                                      )}
                                    </div>
                                    {String(form.parentId) === String(r.id) && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {Object.entries(groupedPermissions).map(([category, perms]) => {
                        const allSelected = perms.every((p) => form.permissionIds.includes(p.id));
                        const someSelected = perms.some((p) => form.permissionIds.includes(p.id));
                        const isExpanded = expandedCategories[category];

                        return (
                          <div key={category} className="border-b border-gray-100 last:border-0">
                            <div
                              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => setExpandedCategories((p) => ({ ...p, [category]: !p[category] }))}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                  onChange={(e) => { e.stopPropagation(); toggleCategory(category, perms); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                                <span className="font-medium text-gray-800">{category}</span>
                                <span className="text-xs text-gray-500">
                                  ({perms.filter((p) => form.permissionIds.includes(p.id)).length}/{perms.length})
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>

                            {isExpanded && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                                {perms.map((perm) => (
                                  <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={form.permissionIds.includes(perm.id)}
                                      onChange={() => togglePermission(perm.id)}
                                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-700 group-hover:text-indigo-600">
                                      {perm.description || perm.key}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      {submitting ? 'Creating...' : 'Create Employee Type'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Roles Table */}
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Existing Employee Types</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Name', 'Description', 'Status', 'Employees', 'Permissions', 'Created', 'Actions'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No employee types found. Create one above.
                        </td>
                      </tr>
                    ) : (
                      roles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{role.description || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${role.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {role.status === 'active'
                                ? <CheckCircle size={12} />
                                : <XCircle size={12} />}
                              {role.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex items-center gap-1">
                              <Users size={14} className="text-gray-400" />
                              {role._count.users}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{role.permissions.length}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(role.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/settings/employee-types/${role.id}`)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                title="View"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => router.push(`/settings/employee-types/${role.id}/edit`)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(role.id, role.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_TYPES_MANAGE);
  if (!hasAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }

  return { props: {} };
}
