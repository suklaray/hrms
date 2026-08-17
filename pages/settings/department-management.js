import { useState, useEffect } from "react";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Building2, Briefcase, ChevronDown, ChevronUp, X, AlertTriangle } from "lucide-react";
import { swalConfirm } from "@/utils/confirmDialog";

const TABS = ["Departments", "Positions"];

export default function DepartmentManagement() {
  const [tab, setTab]               = useState("Departments");
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [userRole, setUserRole]     = useState(null);
  const [expanded, setExpanded]     = useState(null);

  // form state
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [formData, setFormData]     = useState({ name: "", description: "" });

  // position form
  const [showPosForm, setShowPosForm]   = useState(false);
  const [editingPosId, setEditingPosId] = useState(null);
  const [posForm, setPosForm]           = useState({ position_name: "", description: "", department_id: "" });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      setUserRole(d.user?.role);
      fetchAll();
    });
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [d, p] = await Promise.all([
      axios.get("/api/settings/departments"),
      axios.get("/api/settings/positions"),
    ]);
    setDepartments(d.data);
    setPositions(p.data);
    setLoading(false);
  };

  // ── Department CRUD ──
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/settings/departments?id=${editingId}`, formData);
        toast.success("Department updated");
      } else {
        await axios.post("/api/settings/departments", formData);
        toast.success("Department created");
      }
      resetDeptForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handleDeptDelete = async (dept) => {
    if (!(await swalConfirm("Delete this department?"))) return;
    try {
      await axios.delete(`/api/settings/departments?id=${dept.id}`);
      toast.success("Deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const resetDeptForm = () => { setShowForm(false); setEditingId(null); setFormData({ name: "", description: "" }); };

  // ── Position CRUD ──
  const handlePosSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        position_name: posForm.position_name,
        description: posForm.description,
        department_id: posForm.department_id ? parseInt(posForm.department_id) : null,
      };
      if (editingPosId) {
        await axios.put(`/api/settings/positions?id=${editingPosId}`, payload);
        toast.success("Position updated");
      } else {
        await axios.post("/api/settings/positions", payload);
        toast.success("Position created");
      }
      resetPosForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const handlePosDelete = async (pos) => {
    if (!(await swalConfirm("Delete this position?"))) return;
    try {
      await axios.delete(`/api/settings/positions?id=${pos.id}`);
      toast.success("Deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const resetPosForm = () => { setShowPosForm(false); setEditingPosId(null); setPosForm({ position_name: "", description: "", department_id: "" }); };

  if (userRole === "employee") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h1 className="text-2xl font-bold text-gray-900">Access Denied</h1></div>
    </div>
  );

  return (
    <>
      <Head><title>Department & Position Management - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <header className="bg-white border-b border-gray-100 px-8 py-4 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Department & Position Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage departments and their positions</p>
          </header>

          <main className="flex-1 overflow-auto p-8">

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
              {TABS.map((t) => (
                <button key={t} onClick={() => { setTab(t); setShowForm(false); setShowPosForm(false); }}
                  className={`px-5 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer
                    ${tab === t ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : (

              /* ── DEPARTMENTS TAB ── */
              tab === "Departments" ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={() => { resetDeptForm(); setShowForm(true); }}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />Add Department
                    </button>
                  </div>

                  {/* Department Form */}
                  {showForm && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-gray-800">{editingId ? "Edit Department" : "New Department"}</h2>
                        <button onClick={resetDeptForm} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      <form onSubmit={handleDeptSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Department Name <span className="text-red-500">*</span></label>
                          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                            placeholder="e.g. Engineering"
                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2}
                            placeholder="Optional description"
                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 resize-none" />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer">
                            {editingId ? "Update" : "Create"}
                          </button>
                          <button type="button" onClick={resetDeptForm} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Department List */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {departments.length === 0 ? (
                      <div className="text-center py-16">
                        <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No departments yet</p>
                        <p className="text-gray-300 text-sm mt-1">Add your first department to get started</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {departments.map((dept) => (
                          <div key={dept.id}>
                            <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setExpanded(expanded === dept.id ? null : dept.id)}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{dept.name}</p>
                                  <p className="text-xs text-gray-400">{dept.description || "No description"} · {dept.positions.length} position{dept.positions.length !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setFormData({ name: dept.name, description: dept.description || "" }); setEditingId(dept.id); setShowForm(true); }}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeptDelete(dept); }}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {expanded === dept.id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
                              </div>
                            </div>

                            {/* Positions under department */}
                            {expanded === dept.id && (
                              <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                                {dept.positions.length === 0 ? (
                                  <p className="text-sm text-gray-400 text-center py-4">No positions linked to this department</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {dept.positions.map((pos) => (
                                      <div key={pos.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                          <Briefcase className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-800">{pos.position_name}</p>
                                          <p className="text-xs text-gray-400">{pos.description || "No description"}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              ) : (

                /* ── POSITIONS TAB ── */
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={() => { resetPosForm(); setShowPosForm(true); }}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />Add Position
                    </button>
                  </div>

                  {/* Position Form */}
                  {showPosForm && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-gray-800">{editingPosId ? "Edit Position" : "New Position"}</h2>
                        <button onClick={resetPosForm} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-4 h-4 text-gray-400" /></button>
                      </div>
                      <form onSubmit={handlePosSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Position Name <span className="text-red-500">*</span></label>
                            <input type="text" value={posForm.position_name} onChange={(e) => setPosForm({ ...posForm, position_name: e.target.value })} required
                              placeholder="e.g. Frontend Developer"
                              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
                          </div>
                          <div>
                            <label required className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Department</label>
                            <select value={posForm.department_id} onChange={(e) => setPosForm({ ...posForm, department_id: e.target.value })}
                              className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 text-gray-600 cursor-pointer">
                              <option value="">No Department</option>
                              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                          <textarea value={posForm.description} onChange={(e) => setPosForm({ ...posForm, description: e.target.value })} rows={2}
                            placeholder="Optional description"
                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50 resize-none" />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer">
                            {editingPosId ? "Update" : "Create"}
                          </button>
                          <button type="button" onClick={resetPosForm} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Positions Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {positions.length === 0 ? (
                      <div className="text-center py-16">
                        <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No positions yet</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            {["Position", "Department", "Description", "Created", "Actions"].map((col) => (
                              <th key={col} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {positions.map((pos) => {
                            const dept = departments.find((d) => d.id === pos.department_id);
                            return (
                              <tr key={pos.id} className="hover:bg-gray-100 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                                      <Briefcase className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{pos.position_name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {dept ? (
                                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">{dept.name}</span>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4"><span className="text-sm text-gray-500">{pos.description || "—"}</span></td>
                                <td className="px-6 py-4"><span className="text-sm text-gray-400">{new Date(pos.created_at).toLocaleDateString()}</span></td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => { setPosForm({ position_name: pos.position_name, description: pos.description || "", department_id: pos.department_id || "" }); setEditingPosId(pos.id); setShowPosForm(true); }}
                                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handlePosDelete(pos)}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </>
  );
}
