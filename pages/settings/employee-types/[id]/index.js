// pages/settings/employee-types/[id]/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { ArrowLeft, Edit, CheckCircle, XCircle, Users } from 'lucide-react';

export async function getServerSideProps() {
  return { props: {} };
}

export default function ViewEmployeeType() {
  const router = useRouter();
  const { id } = router.query;
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/settings/employee-types/${id}`)
      .then((r) => {
        if (r.status === 403) { router.replace('/dashboard'); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => data && setRole(data.role))
      .catch(() => router.replace('/settings/employee-types'))
      .finally(() => setLoading(false));
  }, [id, router]);

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

  if (!role) return null;

  // Group permissions by category
  const grouped = role.permissions.reduce((acc, rp) => {
    const cat = rp.permission.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rp.permission);
    return acc;
  }, {});

  return (
    <>
      <Head><title>{role.name} - Employee Type</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => router.push('/settings/employee-types')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                <ArrowLeft size={18} /> Back
              </button>
              <button
                onClick={() => router.push(`/settings/employee-types/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
              >
                <Edit size={16} /> Edit
              </button>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Name</p>
                  <p className="font-medium text-gray-900">{role.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${role.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {role.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {role.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900">{role.description || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Parent Role</p>
                  <p className="text-gray-900">
                    {role.parent
                      ? <button onClick={() => router.push(`/settings/employee-types/${role.parent.id}`)} className="text-indigo-600 hover:underline cursor-pointer">{role.parent.name}</button>
                      : '— Top-level role'}
                  </p>
                </div>
                {role.children?.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-gray-500 mb-1">Child Roles</p>
                    <div className="flex flex-wrap gap-2">
                      {role.children.map((c) => (
                        <button key={c.id} onClick={() => router.push(`/settings/employee-types/${c.id}`)} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs hover:bg-indigo-100 cursor-pointer">
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 mb-1">Created</p>
                  <p className="text-gray-900">{new Date(role.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Last Updated</p>
                  <p className="text-gray-900">{new Date(role.updatedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Assigned Employees</p>
                  <p className="text-gray-900 flex items-center gap-1">
                    <Users size={14} className="text-gray-400" />
                    {role._count.users}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assigned Permissions ({role.permissions.length})
              </h2>
              {Object.keys(grouped).length === 0 ? (
                <p className="text-gray-500 text-sm">No permissions assigned.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                            {perm.description || perm.key}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Employees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Assigned Employees</h2>
              </div>
              {role.users.length === 0 ? (
                <p className="px-6 py-8 text-center text-gray-500 text-sm">No employees assigned to this type.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Employee ID', 'Name', 'Position', 'Status'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {role.users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700">{u.empid}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{u.position || '—'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
