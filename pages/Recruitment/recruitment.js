import { useEffect, useState } from "react";
import axios from "axios";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import Link from "next/link";
import { Eye, Trash2, Plus, Calendar, Mail, Phone, User, CheckCircle, XCircle, Clock, Search,Filter,Download,UserPlus,ChevronLeft,
  ChevronRight
} from "lucide-react";
//import toast from "react-hot-toast";
import { toast } from "react-toastify";
import { swalConfirm} from '@/utils/confirmDialog';

export default function Candidates(user) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, selected: 0, rejected: 0, waiting: 0 });
  const [mounted, setMounted] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const fetchCandidates = async () => {
    try {
      const res = await axios.get("/api/recruitment/getCandidates");
      const data = res.data || [];
      setCandidates(data);
      
      // Calculate stats
      const total = data.length;
      const selected = data.filter(c => c.status === 'Selected').length;
      const rejected = data.filter(c => c.status === 'Rejected').length;
      const waiting = data.filter(c => 
        !c.status || 
        c.status === 'Pending' || 
        c.status === 'Waiting' || 
        c.status === 'Mail Sent' || 
        c.status === 'Document Submitted'
      ).length;
      setStats({ total, selected, rejected, waiting });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCandidates();
  }, []);

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await axios.put("/api/recruitment/updateHRStatus", {
        candidateId,
        hrStatus: newStatus,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating HR status:", error);
    }
  };

  const handleInterviewMail = async (candidateId) => {
    try {
      await axios.put("/api/recruitment/sendInterviewMail", {
        candidateId,
        status: "Interview Mail Sent",
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error sending interview mail:", error);
    }
  };

  const handleFormMail = async (candidateId) => {
  try {
    const res = await axios.put("/api/recruitment/sendFormMail", {
      candidateId,
      status: "Form Mail Sent",
    });
    // console.log("Response:", res.data);
    toast.success(res.data?.message || "Mail sent successfully");
    fetchCandidates();
  } catch (error) {
    console.error("Error sending form mail:", error.response?.data || error);
    toast.error("Error sending form mail. Please try again.");
  }
};


  const handleDateChange = async (candidateId, newDate) => {
    try {
      await axios.put("/api/recruitment/updateInterviewDate", {
        candidateId,
        interviewDate: newDate,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating interview date:", error);
    }
  };

  
const handleDelete = async (candidateId) => {
  if (!mounted) return;

  const confirmed = await swalConfirm("Are you sure you want to delete this candidate?");
  if (!confirmed) return;

  try {
    await axios.delete(`/api/recruitment/deleteCandidate?candidate_id=${candidateId}`);
    fetchCandidates();
    toast.success("Candidate deleted successfully!");
  } catch (error) {
    console.error("Error deleting candidate:", error);
    toast.error("Error deleting candidate. Please try again.");
  }
};

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'Waiting') {
      matchesStatus = !candidate.status || candidate.status === 'Waiting' || candidate.status === 'Pending';
    } else if (statusFilter === 'form_submitted') {
      matchesStatus = candidate.form_submitted === true;
    } else if (statusFilter === 'form_not_submitted') {
      matchesStatus = candidate.form_submitted === false;
    } else if (statusFilter === 'verified') {
      matchesStatus = candidate.verification === true;
    } else if (statusFilter === 'not_verified') {
      matchesStatus = candidate.verification === false;
    } else {
      matchesStatus = candidate.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Selected': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, filter, isActive, onClick }) => (
    <div 
      className={`bg-white rounded-xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
        isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-100'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const downloadExcel = () => {
    if (!candidates || candidates.length === 0) {
      toast.info("No candidate data available to download.");
      return;
    }

    // Map data for Excel
    const excelData = candidates.map(c => ({
      "Candidate ID": c.candidate_id || "",
      "Name": c.name || "",
      "Email": c.email || "",
      "Contact": c.contact_number || "",
      "Interview Date": c.interview_date ? c.interview_date.split("T")[0] : "",
      "Interview Time": c.interview_timing || "",
      "Status": c.status || "Waiting",
      "Form Submission": c.form_submitted ? "Submitted" : "Not Submitted",
      "Verification Status": c.verification ? "Verified" : "Not Verified"
    }));

    // Create Excel file
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Candidates");
      XLSX.writeFile(wb, "candidates_data.xlsx");
    });
  };

  const handleEmp = async (candidateId, newDate) => {
    try {
      await axios.put("/api/recruitment/addEmployee", {
        candidateId,
        interviewDate: newDate,
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error updating interview date:", error);
    }
  };

  const handleVerification = async (candidate) => {
    try {
      const updatedVerificationStatus = !candidate.verification;

      await axios.put("/api/recruitment/verifyCandidate", {
        candidateId: candidate.id,
        verificationStatus: updatedVerificationStatus,
      });

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id ? { ...c, verification: updatedVerificationStatus } : c
        )
      );
    } catch (error) {
      console.error("Error updating verification status:", error);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.candidate_id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedCandidates.length === 0) return;
    
    const confirmMessage = selectedCandidates.length === 1 
      ? "Are you sure you want to delete this candidate?" 
      : `Are you sure you want to delete ${selectedCandidates.length} selected candidates?`;


    if (mounted && await swalConfirm(confirmMessage)) {
      try {
        await Promise.all(
          selectedCandidates.map(candidateId => 
            axios.delete(`/api/recruitment/deleteCandidate?candidate_id=${candidateId}`)
          )
        );
        setSelectedCandidates([]);
        setSelectAll(false);
        fetchCandidates();
        toast.success(`Successfully deleted ${selectedCandidates.length} candidate(s)`);
      } catch (error) {
        console.error("Error deleting candidates:", error);
        toast.error("Error deleting candidates. Please try again.");
      }
    }
  };


  return (
    <>
      <Head>
        <title>Recruitment Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recruitment Management</h1>
              <p className="text-gray-600">Manage candidates and track recruitment progress</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/Recruitment/addCandidates">
                <button className="bg-indigo-200 hover:bg-indigo-300 font-medium text-indigo-800 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer text-sm sm:text-base">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Candidate</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </Link>
              <button 
                  onClick={downloadExcel}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200  text-green-800 font-medium rounded-lg transition-colors text-sm sm:text-base" >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Candidate List</span>
                  <span className="sm:hidden">List</span>
                </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <StatCard 
                title="Total Candidates" 
                value={stats.total} 
                icon={User} 
                color="bg-blue-500" 
                filter="all"
                isActive={statusFilter === 'all'}
                onClick={() => handleFilterChange('all')}
              />
              <StatCard 
                title="Selected" 
                value={stats.selected} 
                icon={CheckCircle} 
                color="bg-green-500" 
                filter="Selected"
                isActive={statusFilter === 'Selected'}
                onClick={() => handleFilterChange('Selected')}
              />
              <StatCard 
                title="Rejected" 
                value={stats.rejected} 
                icon={XCircle} 
                color="bg-red-500" 
                filter="Rejected"
                isActive={statusFilter === 'Rejected'}
                onClick={() => handleFilterChange('Rejected')}
              />
              <StatCard 
                title="Waiting" 
                value={stats.waiting} 
                icon={Clock} 
                color="bg-yellow-500" 
                filter="Waiting"
                isActive={statusFilter === 'Waiting'}
                onClick={() => handleFilterChange('Waiting')}
              />
            </div>


          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="all">All Status</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="form_submitted">Form Submitted</option>
                  <option value="form_not_submitted">Form Not Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="not_verified">Not Verified</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-gray-600">
              Showing <span className="font-semibold">{paginatedCandidates.length}</span> of <span className="font-semibold">{filteredCandidates.length}</span> candidates
              {searchTerm && (
                <span> matching &quot;<span className="font-semibold">{searchTerm}</span>&quot;</span>
              )}
              {totalPages > 1 && (
                <span> (Page {currentPage} of {totalPages})</span>
              )}
            </p>
          </div>

          {/* Candidates Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {loading ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-gray-600 mt-4 font-medium">Loading candidates...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {selectedCandidates.length > 0 && (
                  <div className="px-6 py-2 border-b border-gray-100 flex justify-end">
                    <button
                      onClick={handleBulkDelete}
                      className="text-red-600 hover:text-red-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      {selectedCandidates.length} selected
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Interview Schedule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Send Form</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCandidates.map((candidate) => (
                      <tr key={candidate.candidate_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {!candidate.isEmployee && (
                            <input
                              type="checkbox"
                              checked={selectedCandidates.includes(candidate.candidate_id)}
                              onChange={() => handleSelectCandidate(candidate.candidate_id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                              {/* <div className="text-sm text-gray-500">ID: #{candidate.candidate_id}</div> */}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {candidate.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {candidate.contact_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                          {/* Date row */}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="text-sm sm:text-base px-2 py-1 whitespace-nowrap">
                              {candidate.interview_date
                                ? candidate.interview_date.split("T")[0]
                                : "Not Set"}
                            </span>
                          </div>

                          {/* Time row */}
                          <div className="flex items-center text-sm sm:text-base text-gray-600">
                            <Clock className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {candidate.interview_timing || "Time not set"}
                            </span>
                          </div>
                        </div>

                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={candidate.status || "Waiting"}
                            onChange={(e) => handleStatusChange(candidate.candidate_id, e.target.value)}
                            className={`text-xs font-medium px-3 py-1 rounded-full border cursor-pointer ${getStatusColor(candidate.status || 'Waiting')}`}
                          >
                            <option value="Waiting">Waiting</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                         <td className="px-6 py-4">
                          <button
                            onClick={() => handleFormMail(candidate.candidate_id)}
                            
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Send Form
                          </button>
                        </td>
                        <td className="px-2 sm:px-4 lg:px-6 py-4">
                          <div className="space-y-2">
                            {candidate.form_link ? (
                              <a href={candidate.form_link} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium block">
                                View Form
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs sm:text-sm block">No form</span>
                            )}
                            <div>
                              <span className={`text-xs px-1 sm:px-2 py-1 rounded-full whitespace-nowrap inline-block ${
                                candidate.form_submitted 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                <span className="hidden sm:inline">{candidate.form_submitted ? 'Submitted' : 'Not Submitted'}</span>
                                <span className="sm:hidden">{candidate.form_submitted ? 'Yes' : 'No'}</span>
                              </span>
                            </div>
                          </div>
                        </td>                   
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleVerification(candidate)}
                            className={`text-xs font-medium px-3 py-1 rounded-full transition-colors cursor-pointer ${
                              candidate.verification
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }`}
                          >
                            {candidate.verification ? 'Verified' : 'Verify'}
                          </button>
                        </td>
                        {/* action buttons of add as employee is not shown when the candidate is added an employee */}
                       <td className="px-6 py-4">
                        <div className={`flex items-center ${
                            candidate.isEmployee ? 'justify-center' : 'justify-start space-x-2'
                          }`}
                        >
                          {/* View Details */}
                          <Link href={`/Recruitment/${candidate.candidate_id}`}>
                            <button
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                            {!candidate.isEmployee && (
                              <Link href={`/Recruitment/add/${candidate.candidate_id}`}>
                                <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer" title="Add as Employee">
                                  <UserPlus className="w-4 h-4" />
                                </button>
                              </Link>
                            )}
                            {!candidate.isEmployee && (
                            <button
                              onClick={() => handleDelete(candidate.candidate_id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedCandidates.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No candidates found</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({filteredCandidates.length} total candidates)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
