import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { Eye, FileText, CheckCircle, XCircle, AlertCircle, ExternalLink, X, Filter, Users, Shield } from "lucide-react";

export default function ComplianceDashboard() {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleViewDocuments = (emp) => {
    setSelectedEmployee(emp);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Compliant":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Non-compliant":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "Expiring Soon":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      "Compliant": "bg-green-100 text-green-800 border-green-200",
      "Non-compliant": "bg-red-100 text-red-800 border-red-200",
      "Expiring Soon": "bg-yellow-100 text-yellow-800 border-yellow-200"
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                <option value="superadmin">SuperAdmin</option>
              </select>

              {filter !== "All" && (
                <button
                  onClick={() => setFilter("All")}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear Status Filter
                </button>
              )}

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((emp) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.lastUpdated}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDocuments(emp)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Documents
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Document Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h2 className="text-xl font-bold">{selectedEmployee.name}'s Documents</h2>
                    <p className="text-indigo-100 text-sm">Employee ID: {selectedEmployee.empid}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEmployee.documents.map((doc, idx) => {
                    const isUploaded = doc.status === "Uploaded";
                    const isOptional = doc.status.includes("Optional");
                    
                    return (
                      <div key={idx} className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                        isUploaded ? 'border-green-200 bg-green-50' : 
                        isOptional ? 'border-yellow-200 bg-yellow-50' : 
                        'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <h3 className="font-medium text-gray-900">{doc.type}</h3>
                          </div>
                          {getDocumentStatusIcon(doc.status)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${
                            isUploaded ? 'text-green-700' : 
                            isOptional ? 'text-yellow-700' : 
                            'text-red-700'
                          }`}>
                            {doc.status}
                          </span>
                          
                          {isUploaded && (
                            <button 
                              onClick={() => {
                                // Create document view URL based on document type
                                let docUrl = '';
                                const empid = selectedEmployee.empid;
                                
                                switch(doc.type) {
                                  case 'Aadhar Card':
                                    docUrl = `/api/employee/documents/${empid}/aadhar`;
                                    break;
                                  case 'PAN Card':
                                    docUrl = `/api/employee/documents/${empid}/pan`;
                                    break;
                                  case 'Resume':
                                    docUrl = `/api/employee/documents/${empid}/resume`;
                                    break;
                                  case 'Bank Checkbook':
                                    docUrl = `/api/employee/documents/${empid}/checkbook`;
                                    break;
                                  case 'Experience Certificate':
                                    docUrl = `/api/employee/documents/${empid}/experience`;
                                    break;
                                }
                                
                                if (docUrl) {
                                  window.open(docUrl, '_blank');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Compliance Summary</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{selectedEmployee.documents.filter(d => d.status === "Uploaded").length} Uploaded</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>{selectedEmployee.documents.filter(d => d.status === "Missing").length} Missing</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span>{selectedEmployee.documents.filter(d => d.status.includes("Optional")).length} Optional</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
