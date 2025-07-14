import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { FaEye, FaTrash } from "react-icons/fa";

export default function EmployeeListPage() {
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

  const filteredEmployees =
    filter === "All"
      ? employees
      : employees.filter(emp => emp.role?.toLowerCase() === filter.toLowerCase());

  const roles = [
    { label: "All", color: "bg-indigo-500" },
    { label: "HR", color: "bg-green-500" },
    { label: "Admin", color: "bg-yellow-500" },
    { label: "SuperAdmin", color: "bg-pink-500" },
    { label: "Employee", color: "bg-blue-500" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        {/* Total Count Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {roles.map(({ label }) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className="rounded-xl bg-gray-400 p-0.5 transition-all hover:scale-105"
              >
                <div className="bg-gradient-to-l from-gray-100 to-white rounded-xl h-17 flex flex-col justify-center items-center shadow-inner">
                  <span className="text-xl font-semibold text-gray-500 uppercase">
                    {label}
                  </span>
                  <span className="text-md font-bold text-gray-500">({label === "All" ? employees.length : countByRole(label)})</span>
                </div>
              </button>
            ))}
          </div>



        {/* Table */}
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Employee Directory</h2>
          <table className="min-w-full divide-y divide-indigo-300 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-left">Emp ID</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Name</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Position</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Experience</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Role</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Type</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Joining</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((emp, index) => (
                <tr key={emp.id} className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}>
                  <td className="px-4 py-2">{emp.empid}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{emp.name}</td>
                  <td className="px-4 py-2">{emp.email}</td>
                  <td className="px-4 py-2 uppercase">{emp.position}</td>
                  <td className="px-4 py-2">{emp.experience} YRS</td>
                  <td className="px-4 py-2 uppercase">{emp.role}</td>
                  <td className="px-4 py-2">{emp.employee_type || "N/A"}</td>
                  <td className="px-4 py-2">
                    {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-4 py-2">
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
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleView(emp.id)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full"
                      title="View"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-full"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center text-gray-500 py-6">
                    No employees found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
