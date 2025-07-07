import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";

export default function EmployeeListPage() {
    const [employees, setEmployees] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch("/api/auth/employees");
                const data = await res.json();
                setEmployees(data);
            } catch (error) {
                console.error("Failed to fetch employees", error);
            }
        };
        fetchEmployees();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/login");
    };

    const handleView = (id) => {
        router.push(`/employee/view/${id}`);
    };

    const handleEdit = (id) => {
        router.push(`/employee/edit/${id}`);
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
    return (
        <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
          {/* Sidebar */}
          <SideBar handleLogout={handleLogout} />
      
          {/* Main Content */}
          <div className="flex-1 p-8">
            <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
              <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Employee Directory</h2>
      
              <table className="min-w-full divide-y divide-indigo-200 rounded-lg overflow-hidden">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase">
                  <tr>
                    {/*<th className="px-4 py-3 text-sm font-medium text-center">ID</th>*/}
                    <th className="px-4 py-3 text-sm font-medium text-center">Employee ID</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Name</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Email id</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Position</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Experience</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Role</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Joining Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-center">View/Delete</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      className={`hover:bg-indigo-300 ${index % 2 === 0 ? "bg-indigo-50" : "bg-white"}`}
                    >
                      {/*<td className="px-4 py-2">{emp.id}</td>*/}
                      <td className="px-4 py-2 text-center">{emp.empid}</td>
                      <td className="px-4 py-2 font-medium text-gray-800 text-center">{emp.name}</td>
                      <td className="px-4 py-2 text-center">{emp.email}</td>
                      <td className="px-4 py-2 text-center uppercase">{emp.position}</td>
                      <td className="px-4 py-2 text-center">{emp.experience} YRS</td>
                      <td className="px-4 py-2 text-center uppercase">{emp.role}</td>
                      <td className="px-4 py-2 text-center ">
                        {emp.date_of_joining         
                          ? new Date(emp.date_of_joining).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-center uppercase">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold text-center ${
                            emp.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center space-x-2 ">
                        <button
                          onClick={() => handleView(emp.id)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        {/*<button
                          onClick={() => handleEdit(emp.id)}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded-full"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>*/}
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
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center text-gray-500 py-6">
                        No employees found.
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
