import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { Eye } from "lucide-react";

export default function ComplianceDashboard() {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const res = await fetch("/api/compliance/compliance", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Unauthorized or fetch failed");

        const data = await res.json();
        setEmployees(data);
        setFiltered(data);
      } catch (error) {
        console.error("Error fetching compliance data:", error);
      }
    };

    fetchCompliance();
  }, []);

  useEffect(() => {
    let data = [...employees];

    if (filter !== "All") {
      data = data.filter((emp) => emp.status === filter);
    }

    if (roleFilter !== "All") {
      data = data.filter((emp) => emp.role.toLowerCase() === roleFilter.toLowerCase());
    }

    setFiltered(data.sort((a, b) => a.name.localeCompare(b.name)));
  }, [filter, roleFilter, employees]);

  const handleViewDocuments = async (emp) => {
    setSelectedEmployee(emp);
    try {
      const res = await fetch(`/api/compliance/documents/${emp.empid}`);
      if (!res.ok) throw new Error("Documents fetch failed");
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      setDocuments(emp.documents || []);
    }
  };

  const statusBadge = (status) => {
    const color =
      status === "Compliant"
        ? "green"
        : status === "Expiring Soon"
        ? "yellow"
        : status === "Non-compliant"
        ? "red"
        : "gray";

    return (
      <span
        className={`bg-${color}-100 text-${color}-800 text-xs font-semibold px-2.5 py-0.5 rounded`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />

      <div className="flex-1 p-6 relative z-10">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">
          Employee Compliance Dashboard
        </h1>

        {/* Filter Summary Boxes */}
        <div className="flex gap-4 flex-wrap justify-center mb-6">
          {["Compliant", "Expiring Soon", "Non-compliant", "All"].map((status) => {
            const count =
              status === "All"
                ? employees.length
                : employees.filter((e) => e.status === status).length;

            return (
              <div
                key={status}
                onClick={() => setFilter(status)}
                className={`min-w-[180px] bg-white rounded-xl shadow cursor-pointer transition border-2 flex flex-col items-center p-4 ${
                  filter === status
                    ? "border-indigo-500 bg-indigo-400"
                    : "border-transparent"
                }`}
              >
                <p className="text-md font-medium text-center">{status}</p>
                <p className="text-3xl font-bold text-indigo-600 text-center">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-indigo-500 text-sm text-white">
              <tr>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">
                  
                  <div className="flex justify-center my-4">
                    
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                    className="block w-full text-center bg-indigo-500 text-white rounded-lg px-3 py-2 transition-all focus:outline-none"
                >
                  <option value="All">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>

                  </div>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((emp) => (
                <tr key={emp.empid} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{emp.empid}</td>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3">{emp.email}</td>
                  <td className="px-4 py-3">{emp.position}</td>
                  <td className="px-4 py-3 capitalize">{emp.role}</td>
                  <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                  <td className="px-4 py-3">{emp.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDocuments(emp)}
                      className="p-1 rounded hover:bg-indigo-50"
                    >
                      <Eye size={20} className="text-indigo-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-40 backdrop-blur-md bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 relative z-50">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-2 right-4 text-gray-600 text-2xl font-bold hover:text-red-500"
              >
                ×
              </button>

              <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
                {selectedEmployee.name}&apos;s Document Details
              </h2>

              <table className="w-full border text-sm rounded-lg overflow-hidden shadow">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Expiry</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-center bg-gray-50">
                  {(selectedEmployee.documents || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4">
                        No documents found.
                      </td>
                    </tr>
                  ) : (
                    selectedEmployee.documents.map((doc, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 px-3">{doc.type}</td>
                        <td className="py-2 px-3">{doc.status}</td>
                        <td className="py-2 px-3">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
