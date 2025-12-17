import { useState, useEffect } from "react";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, Briefcase, Edit } from "lucide-react";
import { swalConfirm } from "@/utils/confirmDialog";
export default function PositionManagement() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    position_name: "",
    description: ""
  });

  const fetchPositions = async () => {
    try {
      const response = await axios.get("/api/settings/positions");
      setPositions(response.data);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/settings/positions?id=${editingId}`, formData);
        toast.success("Position updated successfully");
      } else {
        await axios.post("/api/settings/positions", formData);
        toast.success("Position created successfully");
      }
      setFormData({ position_name: "", description: "" });
      setShowForm(false);
      setEditingId(null);
      fetchPositions();
    } catch (error) {
      console.error("Error saving position:", error);
      toast.error(`Failed to ${editingId ? 'update' : 'create'} position`);
    }
  };

  const handleEdit = (position) => {
    setFormData({
      position_name: position.position_name,
      description: position.description || ""
    });
    setEditingId(position.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ position_name: "", description: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Are you sure you want to delete this position?");
    if (confirmed) {
      try {
        await axios.delete(`/api/settings/positions?id=${id}`);
        toast.success("Position deleted successfully");
        fetchPositions();
      } catch (error) {
        console.error("Error deleting position:", error);
        toast.error("Failed to delete position");
      }
    }
  };

  return (
    <>
      <Head>
        <title>Position Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Position Management</h1>
                <p className="text-gray-600 text-sm sm:text-base">Manage company positions and roles</p>
              </div>
              <button
                onClick={() => {
                  if (showForm && editingId) {
                    handleCancel();
                  } else {
                    setShowForm(!showForm);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span className="sm:inline">Add Position</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingId ? 'Edit Position' : 'Add New Position'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position_name}
                      onChange={(e) => setFormData({...formData, position_name: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      placeholder="Enter position name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      placeholder="Enter position description"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                    >
                      {editingId ? 'Update Position' : 'Create Position'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center p-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-4 p-4">
                  {positions.map((position) => (
                    <div key={position.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {position.position_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(position)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit Position"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(position.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Position"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Description:</span>
                          <span className="ml-2 text-gray-900">{position.description || "No description"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created by:</span>
                          <span className="ml-2 text-gray-900">{position.created_by_name || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-2 text-gray-900">{new Date(position.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {positions.length === 0 && (
                    <div className="text-center py-12">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500">No positions found</p>
                      <p className="text-sm text-gray-400">Create your first position to get started</p>
                    </div>
                  )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Description
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Created By
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Created At
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {positions.map((position) => (
                        <tr key={position.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Briefcase className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                              </div>
                              <div className="ml-3 lg:ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {position.position_name}
                                </div>
                                <div className="text-xs text-gray-500 md:hidden">
                                  {position.description || "No description"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                            <div className="text-sm text-gray-900">
                              {position.description || "No description"}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                            <div className="text-sm text-gray-900">
                              {position.created_by_name || "Unknown"}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                            <div className="text-sm text-gray-900">
                              {new Date(position.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-1 lg:gap-2">
                              <button
                                onClick={() => handleEdit(position)}
                                className="p-1.5 lg:p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit Position"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(position.id)}
                                className="p-1.5 lg:p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete Position"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {positions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-4 lg:px-6 py-12 text-center">
                            <div className="text-gray-500">
                              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No positions found</p>
                              <p className="text-sm">Create your first position to get started</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}