import { useState, useEffect } from "react";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import EmployeeReassignmentModal from "@/Components/EmployeeReassignmentModal";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, Briefcase, Edit, ChevronDown, ChevronUp, Users, AlertTriangle } from "lucide-react";
import { swalConfirm } from "@/utils/confirmDialog";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { parse } from "cookie";
export default function PositionManagement() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    position_name: "",
    description: ""
  });

  const [userRole, setUserRole] = useState(null);
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [positionEmployees, setPositionEmployees] = useState({});

  const fetchPositions = async () => {
    try {
      const response = await axios.get("/api/settings/positions");
      const positionsData = response.data;
      setPositions(positionsData);
      
      // Fetch fresh employee data for all positions to get current roles
      const employeeCounts = {};
      await Promise.all(
        positionsData.map(async (position) => {
          try {
            const empResponse = await axios.get(`/api/settings/position-employees?positionName=${encodeURIComponent(position.position_name)}`);
            employeeCounts[position.id] = empResponse.data;
          } catch (error) {
            console.error(`Error fetching employees for ${position.position_name}:`, error);
            employeeCounts[position.id] = { employees: [] };
          }
        })
      );
      setPositionEmployees(employeeCounts);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/auth/current-role");
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const userData = await res.json();
          const role = userData.user?.role;
          setUserRole(role);
          
          if (role === "employee") {
            setLoading(false);
            return;
          }
          
          if (["superadmin", "admin", "hr"].includes(role)) {
            fetchPositions();
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setLoading(false);
      }
    };
    
    checkAccess();
  }, []);

  if (userRole === "employee") {
    return (
      <>
        <Head>
          <title>Access Denied - HRMS</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center p-8">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
            {/*<p className="text-sm text-gray-500">Only HR, Admin, and Super Admin can manage positions.</p>*/}
          </div>
        </div>
      </>
    );
  }

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

  const handleDelete = async (position) => {
    try {
      const confirmed = await swalConfirm("Are you sure you want to delete this position?");
      if (!confirmed) return;
      
      await axios.delete(`/api/settings/positions?id=${position.id}`);
      toast.success("Position deleted successfully");
      fetchPositions();
    } catch (error) {
      console.error("Error deleting position:", error);
      toast.error(error.response?.data?.message || "Failed to delete position");
    }
  };



  const togglePositionAccordion = async (position) => {
    if (expandedPosition === position.id) {
      setExpandedPosition(null);
      return;
    }
    
    setExpandedPosition(position.id);
    
    // Refresh user role and employee data to get current permissions
    await fetchUserRole();
    try {
      const response = await axios.get(`/api/settings/position-employees?positionName=${encodeURIComponent(position.position_name)}`);
      setPositionEmployees(prev => ({
        ...prev,
        [position.id]: response.data
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    }
  };

  const canReassignEmployee = (employeeRole, userRole) => {
    if (userRole === "superadmin") return true;
    if (userRole === "admin" && (employeeRole === "hr" || employeeRole === "employee")) return true;
    if (userRole === "hr" && employeeRole === "employee") return true;
    return false;
  };
  const canViewRole = (userRole, employeeRole) => {
    if (userRole === "superadmin") return true;

    if (
      userRole === "admin" &&
      (employeeRole === "hr" || employeeRole === "employee")
    ) {
      return true;
    }

    return false; // HR and others cannot see roles
  };

  const handlePositionReassign = async (empid, newPosition, positionId, employeeRole) => {
    if (!canReassignEmployee(employeeRole, userRole)) {
      toast.error("You don't have permission to reassign this employee's position");
      return;
    }

    try {
      await axios.put("/api/settings/position-employees", {
        empid,
        newPosition
      });
      
      // Refresh all position data to ensure accurate employee counts and roles
      await fetchPositions();
      
      toast.success("Position updated successfully");
    } catch (error) {
      console.error("Error updating position:", error);
      toast.error("Failed to update position");
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
                            onClick={async () => {
                              // Check employee count for mobile view
                              try {
                                const response = await axios.get(`/api/settings/position-employees?positionName=${encodeURIComponent(position.position_name)}`);
                                if (response.data.employees.length > 0) {
                                  toast.error(`Cannot delete position. ${response.data.employees.length} employee(s) are still assigned. Please reassign them first.`);
                                  return;
                                }
                                handleDelete(position);
                              } catch (error) {
                                console.error("Error checking employees:", error);
                                handleDelete(position);
                              }
                            }}
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

                  {/* Desktop Accordion View */}
                  <div className="hidden sm:block">
                    <div className="space-y-2">
                      {positions.map((position) => (
                        <div key={position.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Position Header */}
                          <div 
                            className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => togglePositionAccordion(position)}
                          >
                            <div className="px-6 py-4 flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Briefcase className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">{position.position_name}</h3>
                                  <p className="text-sm text-gray-500">{position.description || "No description"}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(position);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Edit Position"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const employeeCount = positionEmployees[position.id]?.employees?.length || 0;
                                    if (employeeCount > 0) {
                                      toast.error(`Cannot delete position. ${employeeCount} employee(s) are still assigned. Please reassign them first.`);
                                      return;
                                    }
                                    handleDelete(position);
                                  }}
                                  disabled={(positionEmployees[position.id]?.employees?.length || 0) > 0}
                                  className={`p-2 rounded-lg transition-colors ${
                                    (positionEmployees[position.id]?.employees?.length || 0) > 0
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-red-600 hover:bg-red-100'
                                  }`}
                                  title={`${
                                    (positionEmployees[position.id]?.employees?.length || 0) > 0
                                      ? `Cannot delete - ${positionEmployees[position.id]?.employees?.length} employee(s) assigned`
                                      : 'Delete Position'
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {expandedPosition === position.id ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Employees List (Accordion Content) */}
                          {expandedPosition === position.id && (
                            <div className="bg-gray-50 border-t border-gray-200">
                              <div className="px-6 py-4">
                                {positionEmployees[position.id]?.employees?.length > 0 ? (
                                  <div className={`space-y-3 ${positionEmployees[position.id].employees.length > 4 ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                                    <div className="flex items-center space-x-2 mb-4">
                                      <Users className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm font-medium text-gray-700">
                                        {positionEmployees[position.id].employees.length} employee(s) assigned
                                      </span>
                                    </div>
                                    {positionEmployees[position.id].employees.map((employee) => (
                                      <div key={employee.empid} className="bg-white rounded-lg p-4 border border-gray-200">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900">{employee.name}</div>
                                            <div className="text-sm text-gray-600">Email : {employee.email}</div>
                                            <div className="text-sm text-gray-500">
                                              Employee Type : {employee.employee_type?.replace('_', '-') || 'N/A'}
                                            </div>
                                            {/* Role - Conditional */}
                                            {canViewRole(userRole, employee.role) && (
                                              <div className="text-sm text-gray-500">
                                                Role : {employee.role}
                                              </div>
                                            )}
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                              Reassign Position
                                            </div>
                                            {canReassignEmployee(employee.role, userRole) ? (
                                              <select
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                onChange={(e) => {
                                                  if (e.target.value) {
                                                    handlePositionReassign(employee.empid, e.target.value, position.id, employee.role);
                                                  }
                                                }}
                                                defaultValue=""
                                              >
                                                <option value="">Select new position...</option>
                                                {positionEmployees[position.id]?.availablePositions?.map((pos) => (
                                                  <option key={pos.id} value={pos.position_name}>
                                                    {pos.position_name}
                                                  </option>
                                                ))}
                                              </select>
                                            ) : (
                                              <div className="text-sm text-red-500">
                                                {userRole === "hr" ? "Position change is not permitted." : "Insufficient permissions"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm text-gray-500">No employees assigned to this position</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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