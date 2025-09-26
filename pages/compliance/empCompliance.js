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
  const [candidates, setCandidates] = useState([]);
  const [interns, setInterns] = useState([]);
  const [activeTab, setActiveTab] = useState('employees');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [candidateCurrentPage, setCandidateCurrentPage] = useState(1);
  const [internCurrentPage, setInternCurrentPage] = useState(1);

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

    const fetchCandidates = async () => {
      try {
        const res = await fetch("/api/recruitment/getCandidates");
        const data = await res.json();
        
        // Get list of employee emails to exclude candidates who are already employees
        const empRes = await fetch("/api/compliance/compliance");
        const employees = await empRes.json();
        const employeeEmails = employees.map(emp => emp.email);
        
        // Filter out candidates who are already employees
        const candidatesOnly = (data || []).filter(candidate => !employeeEmails.includes(candidate.email));
        
        // Fetch employee documents for each candidate using email
        const candidatesWithCompliance = await Promise.all(candidatesOnly.map(async candidate => {
          const hasForm = candidate.form_submitted;
          const isVerified = candidate.verification;
          const hasResume = candidate.resume;
          
          // Fetch employee documents using email
          let employeeData = null;
          try {
            const empRes = await fetch(`/api/compliance/candidate-documents?email=${candidate.email}`);
            if (empRes.ok) {
              employeeData = await empRes.json();
            }
          } catch (err) {
            console.error('Error fetching employee documents:', err);
          }
          
          const hasAadhar = employeeData?.aadhar_card || candidate.aadhar_card;
          const hasPan = employeeData?.pan_card || candidate.pan_card;
          const hasBankDetails = employeeData?.bank_details || candidate.bank_details;
          const hasExperience = employeeData?.experience_certificate || candidate.experience_certificate;
          const hasProfilePhoto = candidate.profile_photo;
          const hasEducation = employeeData?.education_certificates || candidate.education_certificates;
          
          const uploadedDocs = [hasResume, hasAadhar, hasPan, hasBankDetails].filter(Boolean).length;
          
          let status = "Non-compliant";
          if (hasForm && isVerified && uploadedDocs >= 4) {
            status = "Compliant";
          } else if (hasForm && (isVerified || uploadedDocs >= 2)) {
            status = "Partially Compliant";
          }
          
          return {
            ...candidate,
            ...employeeData, // Include employee document paths
            status,
            documents: [
              { type: "Resume", status: hasResume ? "Uploaded" : "Missing" },
              { type: "Profile Photo", status: hasProfilePhoto ? "Uploaded" : "Missing" },
              { type: "Aadhar Card", status: hasAadhar ? "Uploaded" : "Missing" },
              { type: "PAN Card", status: hasPan ? "Uploaded" : "Missing" },
              { type: "Bank Details", status: hasBankDetails ? "Uploaded" : "Missing" },
              { type: "Education Certificates", status: hasEducation ? "Uploaded" : "Optional - Missing" },
              { type: "Experience Certificate", status: hasExperience ? "Uploaded" : "Optional - Missing" },
              { type: "Application Form", status: hasForm ? "Submitted" : "Missing" },
              { type: "Verification", status: isVerified ? "Verified" : "Pending" }
            ]
          };
        }));
        
        setCandidates(candidatesWithCompliance);
      } catch (error) {
        console.error("Error fetching candidates:", error);
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
    fetchCandidates();
    fetchInterns();
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

  // Candidates pagination
  const candidateTotalItems = candidates.length;
  const candidateTotalPages = Math.ceil(candidateTotalItems / itemsPerPage);
  const candidateStartIndex = (candidateCurrentPage - 1) * itemsPerPage;
  const paginatedCandidates = candidates.slice(candidateStartIndex, candidateStartIndex + itemsPerPage);

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
                onClick={() => setActiveTab('candidates')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'candidates'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Candidates ({candidates.length})
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
                <option value="superadmin">SuperAdmin</option>
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
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.lastUpdated}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/compliance/documents/${emp.empid}?type=employee`)}
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

          {activeTab === 'candidates' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {candidates.map((candidate) => (
                      <tr key={candidate.candidate_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                            <div className="text-sm text-gray-500">{candidate.candidate_id} • {candidate.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{candidate.email}</div>
                          <div className="text-sm text-gray-500">{candidate.contact_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(candidate.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.interview_date ? new Date(candidate.interview_date).toLocaleDateString() : 'Not scheduled'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/compliance/documents/${candidate.candidate_id}?type=candidate`)}
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
              </div>
            </div>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interns.map((intern) => (
                      <tr key={intern.empid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{intern.name}</div>
                            <div className="text-sm text-gray-500">{intern.empid} • {intern.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {intern.intern_duration ? `${intern.intern_duration} months` : 'Not specified'}
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
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
    </>
  );
}
