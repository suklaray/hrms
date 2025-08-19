import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { Users, CheckCircle, Clock, DollarSign, Calendar, Eye } from "lucide-react";

export default function GeneratePayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, generated: 0, pending: 0 });
  const router = useRouter();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/hr/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const { employees = [] } = await res.json();
        setEmployees(employees);
        
        // Calculate stats
        const total = employees.length;
        const generated = employees.filter(emp => emp.payrollGenerated).length;
        const pending = total - generated;
        setStats({ total, generated, pending });
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

  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`${bgColor} rounded-xl shadow-sm border border-gray-100 p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={() => {}} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payroll Generation</h1>
              <p className="text-gray-600">Generate payroll for {getCurrentMonth()}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{getCurrentMonth()}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Employees"
              value={stats.total}
              icon={Users}
              color="bg-blue-500"
              bgColor="bg-white"
            />
            <StatCard
              title="Payroll Generated"
              value={stats.generated}
              icon={CheckCircle}
              color="bg-green-500"
              bgColor="bg-white"
            />
            <StatCard
              title="Pending Generation"
              value={stats.pending}
              icon={Clock}
              color="bg-orange-500"
              bgColor="bg-white"
            />
          </div>

          {/* Employee List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Employee Payroll Status
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">Loading employees...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((emp) => (
                      <tr key={emp.empid} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                              <div className="text-sm text-gray-500">ID: {emp.empid}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{emp.email}</div>
                          <div className="text-sm text-gray-500">{emp.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          {emp.payrollGenerated ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleGeneratePayroll(emp.empid)}
                              disabled={emp.payrollGenerated}
                              className={`inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md transition-colors ${
                                emp.payrollGenerated
                                  ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                  : "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              }`}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              {emp.payrollGenerated ? "Generated" : "Generate"}
                            </button>
                            {emp.payrollGenerated && (
                              <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
