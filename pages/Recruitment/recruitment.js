import { useEffect, useState } from "react";
import axios from "axios";
import SideBar from "@/Components/SideBar";
import Link from "next/link";
import { 
  Eye, 
  Trash2, 
  Plus, 
  Calendar, 
  Mail, 
  Phone, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Download,
  UserPlus
} from "lucide-react";

export default function Candidates(user) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, selected: 0, rejected: 0, waiting: 0 });
  const [mounted, setMounted] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectAll, setSelectAll] = useState(false);


  const fetchCandidates = async () => {
    try {
      const res = await axios.get("/api/recruitment/getCandidates");
      const data = res.data || [];
      setCandidates(data);
      
      // Calculate stats
      const total = data.length;
      const selected = data.filter(c => c.status === 'Selected').length;
      const rejected = data.filter(c => c.status === 'Rejected').length;
      const waiting = data.filter(c => c.status === 'Waiting' || !c.status).length;
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
      await axios.put("/api/recruitment/sendFormMail", {
        candidateId,
        status: "Form Mail Sent",
      });
      fetchCandidates();
    } catch (error) {
      console.error("Error sending form mail:", error);
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
    if (mounted && window.confirm("Are you sure you want to delete this candidate?")) {
      try {
        await axios.delete(`/api/recruitment/deleteCandidate?candidate_id=${candidateId}`);
        fetchCandidates();
      } catch (error) {
        console.error("Error deleting candidate:", error);
      }
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Selected': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
    
    if (mounted && window.confirm(confirmMessage)) {
      try {
        await Promise.all(
          selectedCandidates.map(candidateId => 
            axios.delete(`/api/recruitment/deleteCandidate?candidate_id=${candidateId}`)
          )
        );
        setSelectedCandidates([]);
        setSelectAll(false);
        fetchCandidates();
        alert(`Successfully deleted ${selectedCandidates.length} candidate(s)`);
      } catch (error) {
        console.error("Error deleting candidates:", error);
        alert("Error deleting candidates. Please try again.");
      }
    }
  };


  return (
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
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Add Candidate
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Candidates" value={stats.total} icon={User} color="bg-blue-500" />
            <StatCard title="Selected" value={stats.selected} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="bg-red-500" />
            <StatCard title="Waiting" value={stats.waiting} icon={Clock} color="bg-yellow-500" />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Schedule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.candidate_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate.candidate_id)}
                            onChange={() => handleSelectCandidate(candidate.candidate_id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                              <div className="text-sm text-gray-500">ID: #{candidate.candidate_id}</div>
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
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <input
                                type="date"
                                value={candidate.interview_date ? candidate.interview_date.split("T")[0] : ""}
                                onChange={(e) => handleDateChange(candidate.candidate_id, e.target.value)}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{candidate.interview_time || 'Time not set'}</span>
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
                          <div className="space-y-2">
                            {candidate.form_link ? (
                              <a href={candidate.form_link} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                View Form
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">No form</span>
                            )}
                            <div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                candidate.form_submitted 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {candidate.form_submitted ? 'Submitted' : 'Not Submitted'}
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
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Link href={`/Recruitment/${candidate.candidate_id}`}>
                              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer" title="View Details">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={`/Recruitment/add/${candidate.candidate_id}`}>
                              <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer" title="Add as Employee">
                                <UserPlus className="w-4 h-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(candidate.candidate_id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center">
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
        </div>
      </div>
    </div>
  );
}
