// pages/settings/employee-types/[id]/edit.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';

export default function EditEmployeeType() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allRoles, setAllRoles] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
    parentId: '',
    permissionIds: [],
  });

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [roleRes, permsRes, allRolesRes] = await Promise.all([
        fetch(`/api/settings/employee-types/${id}`),
        fetch('/api/settings/employee-types/permissions'),
        fetch('/api/settings/employee-types'),
      ]);

      if (roleRes.status === 403) { router.replace('/dashboard'); return; }
      if (!roleRes.ok) throw new Error();

      const { role } = await roleRes.json();
      const { grouped } = await permsRes.json();
      const { roles: roles_ } = await allRolesRes.json();

      setAllRoles(roles_.filter((r) => r.id !== parseInt(id)));

      setForm({
        name: role.name,
        description: role.description || '',
        status: role.status || 'active',
        parentId: role.parentId ?? '',
        permissionIds: role.permissions.map((rp) => rp.permissionId),
      });
      setGroupedPermissions(grouped);
      setExpandedCategories(Object.keys(grouped).reduce((a, k) => ({ ...a, [k]: true }), {}));
    } catch {
      toast.error('Failed to load employee type');
      router.replace('/settings/employee-types');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePermission = (pid) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(pid)
        ? prev.permissionIds.filter((p) => p !== pid)
        : [...prev.permissionIds, pid],
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
      const res = await fetch(`/api/settings/employee-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.error || 'Failed to update');

      toast.success('Employee type updated successfully');
      router.push(`/settings/employee-types/${id}`);
    } catch {
      toast.error('Failed to update employee type');
    } finally {
      setSubmitting(false);
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
      <Head><title>Edit {form.name} - Employee Type</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push(`/settings/employee-types/${id}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                <ArrowLeft size={18} /> Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Employee Type</h1>
                <p className="text-gray-500 text-sm">Update role details and permissions</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Role <span className="text-gray-400 font-normal">(optional — for hierarchy)</span></label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— No parent (top-level role) —</option>
                    {allRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Permissions
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({form.permissionIds.length} selected)
                  </span>
                </h2>
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

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/settings/employee-types/${id}`)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  );
}
