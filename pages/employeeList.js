import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { FaEye, FaTrash } from "react-icons/fa";
import { withRoleProtection } from "@/lib/withRoleProtection"; // corrected import path

export const getServerSideProps = withRoleProtection(["hr", "admin", "superadmin"]);

export default function EmployeeListPage({ user }) {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("All");
  const router = useRouter();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/auth/employees");
        const data = await res.json();

        if (!res.ok || !Array.isArray(data)) {
          console.error("Error loading employees:", data.error || "Invalid data format");
          setEmployees([]);
        } else {
          setEmployees(data);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  const handleLogout = () => {
    router.push("/login");
  };

  const handleView = (id) => {
    router.push(`/employee/view/${id}`);
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this employee?");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/auth/employee/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmployees(employees.filter((emp) => emp.id !== id));
      } else {
        console.error("Delete failed");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const countByRole = (roleName) =>
    employees.filter(emp => emp.role?.toLowerCase() === roleName.toLowerCase()).length;

  const canViewRole = (targetRole) => {
    const role = user.role.toLowerCase();
    const target = targetRole.toLowerCase();
    if (role === "superadmin") return true;
    if (role === "admin" && (target === "hr" || target === "employee")) return true;
    if (role === "hr" && target === "employee") return true;
    return false;
  };

  const filteredEmployees = employees.filter((emp) => {
    const target = emp.role?.toLowerCase();
    if (filter === "All") {
      return canViewRole(target);
    }
    return emp.role?.toLowerCase() === filter.toLowerCase() && canViewRole(target);
  });

  const roles = [
    { label: "HR" },
    { label: "Admin" },
    { label: "SuperAdmin" },
    { label: "Employee" },
  ];

  // Show "All" button only if user can view more than one role
  const allowedRolesForUser = roles
    .map(({ label }) => label)
    .filter(role => canViewRole(role));

  const showAllButton = allowedRolesForUser.length > 1;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-4 overflow-hidden">
        {/* Filter Cards */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {roles.map(({ label }) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className={`p-3 rounded-xl transition-all hover:scale-105 ${
                filter === label 
                  ? 'bg-indigo-500 text-white shadow-lg' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
            >
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs opacity-75">({label === "All" ? employees.length : countByRole(label)})</div>
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-indigo-700">Employee Directory</h2>
          </div>
          <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-left">ID</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Name</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Email</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Position</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Exp</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Role</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Type</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Joined</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className={`hover:bg-indigo-50 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                    <td className="px-3 py-2 text-sm font-medium">{emp.empid}</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-800">{emp.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{emp.email}</td>
                    <td className="px-3 py-2 text-sm">{emp.position}</td>
                    <td className="px-3 py-2 text-sm">{emp.experience}y</td>
                    <td className="px-3 py-2 text-sm uppercase font-medium">{emp.role}</td>
                    <td className="px-3 py-2 text-sm">{emp.employee_type || "N/A"}</td>
                    <td className="px-3 py-2 text-sm">
                      {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB') : "N/A"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          emp.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(emp.id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-1.5 rounded-full"
                          title="View"
                        >
                          <FaEye size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-1.5 rounded-full"
                          title="Delete"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="10" className="text-center text-gray-500 py-8">
                      No employees found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
