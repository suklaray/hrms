import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Eye, FileText, CheckCircle, XCircle, AlertCircle, ExternalLink, X, Filter, Users, Shield } from "lucide-react";

export default function ComplianceDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [interns, setInterns] = useState([]);
  const [contractual, setContractual] = useState([]);
  const [activeTab, setActiveTab] = useState('employees');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [internCurrentPage, setInternCurrentPage] = useState(1);
  const [contractualCurrentPage, setContractualCurrentPage] = useState(1);

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
      } finally {
        setLoading(false);
      }
    };

    const fetchContractual = async () => {
      try {
        const res = await fetch("/api/compliance/compliance");
        const data = await res.json();
        const contractualData = data.filter(emp => emp.employee_type === 'Contractor');
        setContractual(contractualData);
      } catch (error) {
        console.error("Error fetching contractual employees:", error);
      }
    };

    const fetchInterns = async () => {
      try {
        const res = await fetch("/api/compliance/compliance");
        const data = await res.json();
        const internData = data.filter(emp => emp.employee_type === 'Intern');
        setInterns(internData);
      } catch (error) {
        console.error("Error fetching interns:", error);
      }
    };

    fetchCompliance();
    fetchInterns();
    fetchContractual();
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

  // Add pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Contractual pagination
  const contractualTotalItems = contractual.length;
  const contractualTotalPages = Math.ceil(contractualTotalItems / itemsPerPage);
  const contractualStartIndex = (contractualCurrentPage - 1) * itemsPerPage;
  const paginatedContractual = contractual.slice(contractualStartIndex, contractualStartIndex + itemsPerPage);

  // Interns pagination
  const internTotalItems = interns.length;
  const internTotalPages = Math.ceil(internTotalItems / itemsPerPage);
  const internStartIndex = (internCurrentPage - 1) * itemsPerPage;
  const paginatedInterns = interns.slice(internStartIndex, internStartIndex + itemsPerPage);
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, roleFilter]);


  const getStatusIcon = (status) => {
    switch (status) {
      case "Compliant":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Non-compliant":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "Expiring Soon":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "Partially Compliant":
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      "Compliant": "bg-green-100 text-green-800 border-green-200",
      "Non-compliant": "bg-red-100 text-red-800 border-red-200",
      "Expiring Soon": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Partially Compliant": "bg-orange-100 text-orange-800 border-orange-200"
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  const getDocumentStatusIcon = (status) => {
    if (status === "Uploaded") {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (status.includes("Missing")) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const stats = {
    total: employees.length,
    compliant: employees.filter(e => e.status === "Compliant").length,
    nonCompliant: employees.filter(e => e.status === "Non-compliant").length,
    expiring: employees.filter(e => e.status === "Expiring Soon").length
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading compliance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Compliance - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                Employee Compliance Dashboard
              </h1>
              <p className="text-gray-600">Monitor document compliance across all employees</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'employees'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Employees ({employees.length})
              </button>
              <button
                onClick={() => setActiveTab('interns')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'interns'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Interns ({interns.length})
              </button>
              <button
                onClick={() => setActiveTab('contractual')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'contractual'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Contractual ({contractual.length})
              </button>
            </div>
          </div>

          {activeTab === 'employees' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === "All" ? "border-blue-300 bg-blue-50" : "border-gray-100"}`}
                    onClick={() => setFilter("All")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Employees</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === "Compliant" ? "border-green-300 bg-green-50" : "border-gray-100"
              }`}
              onClick={() => setFilter(filter === "Compliant" ? "All" : "Compliant")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliant</p>
                  <p className="text-3xl font-bold text-green-600">{stats.compliant}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === "Non-compliant" ? "border-red-300 bg-red-50" : "border-gray-100"
              }`}
              onClick={() => setFilter(filter === "Non-compliant" ? "All" : "Non-compliant")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Non-Compliant</p>
                  <p className="text-3xl font-bold text-red-600">{stats.nonCompliant}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === "Expiring Soon" ? "border-yellow-300 bg-yellow-50" : "border-gray-100"
              }`}
              onClick={() => setFilter(filter === "Expiring Soon" ? "All" : "Expiring Soon")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.expiring}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All Roles</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="employee">Employee</option>
              </select>

              <div className="ml-auto text-sm text-gray-600">
                Showing {filtered.length} of {employees.length} employees
              </div>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEmployees.map((emp) => (
                    <tr key={emp.empid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.empid} • {emp.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.employee_type === 'Intern' ? 'bg-purple-100 text-purple-800' :
                          emp.employee_type === 'Contractor' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {emp.employee_type === 'Full_time' ? 'Full-time' : emp.employee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(emp.employee_type === 'Intern' || emp.employee_type === 'Contractor') && emp.duration_months 
                          ? `${emp.duration_months} months` 
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.lastUpdated}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/compliance/documents/${emp.empid}?type=employee`)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          View Documents
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination for Employees */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} results
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      {"<"}
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === page ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      {">"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
            </>
          )}



          {activeTab === 'interns' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Intern Compliance</h3>
                <p className="text-gray-600">Monitor document compliance for intern employees</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intern</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedInterns.map((intern) => (
                      <tr key={intern.empid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{intern.name}</div>
                            <div className="text-sm text-gray-500">{intern.empid} • {intern.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{intern.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {intern.duration_months ? `${intern.duration_months} months` : 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(intern.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{intern.lastUpdated}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/compliance/documents/${intern.empid}?type=employee`)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            View Documents
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination for Interns */}
                {internTotalPages > 1 && (
                  <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {internStartIndex + 1} to {Math.min(internStartIndex + itemsPerPage, internTotalItems)} of {internTotalItems} results
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setInternCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={internCurrentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        {"<"}
                      </button>
                      {Array.from({ length: internTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setInternCurrentPage(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            internCurrentPage === page ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setInternCurrentPage(prev => Math.min(prev + 1, internTotalPages))}
                        disabled={internCurrentPage === internTotalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        {">"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contractual' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Contractual Employee Compliance</h3>
                <p className="text-gray-600">Monitor document compliance for contractual employees</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedContractual.map((contractor) => (
                      <tr key={contractor.empid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contractor.name}</div>
                            <div className="text-sm text-gray-500">{contractor.empid} • {contractor.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contractor.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contractor.duration_months ? `${contractor.duration_months} months` : 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(contractor.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contractor.lastUpdated}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/compliance/documents/${contractor.empid}?type=employee`)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            View Documents
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination for Contractual */}
                {contractualTotalPages > 1 && (
                  <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {contractualStartIndex + 1} to {Math.min(contractualStartIndex + itemsPerPage, contractualTotalItems)} of {contractualTotalItems} results
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setContractualCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={contractualCurrentPage === 1}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        {"<"}
                      </button>
                      {Array.from({ length: contractualTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setContractualCurrentPage(page)}
                          className={`px-3 py-1 text-sm border rounded ${
                            contractualCurrentPage === page ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setContractualCurrentPage(prev => Math.min(prev + 1, contractualTotalPages))}
                        disabled={contractualCurrentPage === contractualTotalPages}
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        {">"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
    </>
  );
}
