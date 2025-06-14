//generate payroll list page
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

export default function GeneratePayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch employees and payroll status
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/hr/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const { employees = [] } = await res.json();
        setEmployees(employees);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load employees.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Show success toast if redirected after payroll generation
  useEffect(() => {
    const { status, empid } = router.query;
    if (status === "success" && empid) {
      toast.success(`Payroll generated for Employee ID: ${empid}`);
      // Optionally, reload data
    }
  }, [router.query]);

  const handleGeneratePayroll = (empid) => {
    router.push(`/hr/payroll/form/${empid}`);
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <SideBar handleLogout={() => {}} />

      {/* Main Content */}
      <div className="flex-1 p-10 bg-white">
        <h2 className="text-3xl font-bold text-center text-indigo-900 mb-8">
          Generate Payroll
        </h2>

        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-indigo-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-left">Employee ID</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Payroll Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {employees.map((emp) => (
                  <tr
                    key={emp.empid}
                    className="hover:bg-indigo-100 transition duration-200"
                  >
                    <td className="px-6 py-3">{emp.empid}</td>
                    <td className="px-6 py-3">{emp.name}</td>
                    <td className="px-6 py-3">{emp.email}</td>
                    <td className="px-6 py-3">{emp.phone}</td>
                    <td className="px-6 py-3">
                      {emp.payrollGenerated ? (
                        <span className="text-green-600 font-semibold">
                          Generated
                        </span>
                      ) : (
                        <span className="text-yellow-600 font-semibold">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleGeneratePayroll(emp.empid)}
                        disabled={emp.payrollGenerated}
                        className={`px-4 py-2 rounded-lg ${
                          emp.payrollGenerated
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {emp.payrollGenerated
                          ? "Already Generated"
                          : "Generate Payroll"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
