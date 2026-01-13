import { useState, useEffect, useCallback } from "react";
import { X, User, Mail, Briefcase } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

export default function EmployeeReassignmentModal({ 
  isOpen, 
  onClose, 
  positionName, 
  onReassignmentComplete,
  userRole 
}) {
  const [employees, setEmployees] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reassigning, setReassigning] = useState({});
  const [selectedPositions, setSelectedPositions] = useState({});

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/settings/position-employees?positionName=${encodeURIComponent(positionName)}`);
      console.log('Fetched data:', response.data);
      console.log('User role:', userRole);
      setEmployees(response.data.employees);
      setAvailablePositions(response.data.availablePositions);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, [positionName,userRole]);

  useEffect(() => {
    if (isOpen && positionName) {
      fetchEmployees();
    }
  }, [isOpen, positionName, fetchEmployees]);

const canReassignEmployee = (employee) => {
  if (userRole === "superadmin") return true;

  if (userRole === "admin") {
    return employee.role === "hr" || employee.role === "employee";
  }

  if (userRole === "hr") {
    return employee.role === "employee";
  }

  return false;
};

  const handlePositionChange = async (empid, newPosition, employee) => {
  if (!canReassignEmployee(employee)) {
    let message = "Insufficient permissions";

    if (userRole === "hr") {
      message = "Position can only be changed by Admin or Super Admin";
    }
    if (
      userRole === "admin" &&
      (employee.role === "admin" || employee.role === "superadmin")
    ) {
      message = "Only Super Admin can change this position";
    }
    toast.error(message);
    return;
  }
  setReassigning(prev => ({ ...prev, [empid]: true }));
  try {
    await axios.put("/api/settings/position-employees", {
      empid,
      newPosition
    });

    setEmployees(prev => prev.filter(emp => emp.empid !== empid));
    toast.success("Position updated successfully");

    if (employees.length === 1) {
      onReassignmentComplete();
    }
  } catch (error) {
    toast.error(error.response?.data?.error || "Failed to update position");
  } finally {
    setReassigning(prev => ({ ...prev, [empid]: false }));
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4 border-2 border-purple-500">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Employees Assigned to &quot;{positionName}&quot;
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Reassign all employees before deleting this position
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No employees found</p>
              <p className="text-sm text-gray-400">All employees have been reassigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.empid} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Employee Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <span>ID: {employee.empid}</span>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Type */}
                    <div className="lg:w-32">
                      <div className="text-sm font-medium text-gray-700">Employee Current Position</div>
                      <div className="text-sm text-gray-600">
                        {employee.employee_type?.replace('_', '-') || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {employee.role?.replaceAll('_', '-') || 'N/A'}
                      </div>
                    </div>

                    {/* Position Dropdown */}
                    <div className="lg:w-48">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Reassign Position
                      </div>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={selectedPositions[employee.empid] || ""}
                        onChange={(e) => {
                          setSelectedPositions(prev => ({ ...prev, [employee.empid]: e.target.value }));
                          if (e.target.value) {
                            handlePositionChange(employee.empid, e.target.value, employee);
                          }
                        }}
                        disabled={reassigning[employee.empid] || !canReassignEmployee(employee)}
                      >
                        <option value="">Select new position...</option>
                        {availablePositions.map((position) => (
                          <option key={position.id} value={position.position_name}>
                            {position.position_name}
                          </option>
                        ))}
                      </select>
                      {!canReassignEmployee(employee) && (
                        <p className="text-xs text-red-500 mt-1">
                          {userRole === "hr" && employee.role !== "employee" &&
                            "Position can only be changed by Admin or Super Admin"}

                          {userRole === "admin" &&
                            (employee.role === "admin" || employee.role === "superadmin") &&
                            "Only Super Admin can change this position"}
                        </p>
                      )}
                      {reassigning[employee.empid] && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-xs text-gray-600">Updating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {employees.length > 0 ? (
              <>
                <span className="font-medium text-red-600">{employees.length}</span> employee(s) 
                need to be reassigned before this position can be deleted
              </>
            ) : (
              <span className="text-green-600 font-medium">
                All employees have been reassigned. You can now delete this position.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 