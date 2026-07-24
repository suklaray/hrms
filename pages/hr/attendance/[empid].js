import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Clock, Calendar, User, Mail, TrendingUp, CheckCircle, XCircle, ArrowLeft, ChevronLeft, ChevronRight, FileText, X, Eye } from "lucide-react";
import { formatLongDate, formatShortDateTime, formatTime } from "@/utils/dateTime";
import { toast } from "react-toastify";
// Regularization Detail Modal
const RegularizationModal = ({ request, onClose, onUpdated }) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPending = request.status === "PENDING";

  const handleAction = async (action) => {
    if (action === "REJECTED" && !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/hr/regularization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: request.id, action, rejection_reason: rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(`Request ${action === "APPROVED" ? "approved" : "rejected"} successfully`);
      onUpdated(request.id, action);
      onClose();
    } catch { toast.error("Failed to process request"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Regularization Request</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              request.status === "APPROVED" ? "bg-green-100 text-green-800"
              : request.status === "REJECTED" ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800"
            }`}>{request.status}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Attendance Date</p>
            <p className="text-sm font-medium text-gray-900">
              {formatLongDate(request.attendance_date)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Check-in Time</p>
              <p className="text-sm font-medium text-gray-900">
                {formatTime(request.check_in_time)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Requested Check-out</p>
              <p className="text-sm font-medium text-gray-900">
                {formatTime(request.requested_checkout)}
              </p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Reason</p>
            <p className="text-sm text-gray-800">{request.reason}</p>
          </div>

          {request.status === "REJECTED" && request.rejection_reason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-800">{request.rejection_reason}</p>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Submitted On</p>
            <p className="text-sm text-gray-800">
              {formatShortDateTime(request.created_at)}
            </p>
          </div>

          {isPending && (
            <>
              {showReject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    placeholder="Why are you rejecting this request?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                {!showReject ? (
                  <>
                    <button onClick={() => setShowReject(true)} disabled={loading}
                      className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
                      Reject
                    </button>
                    <button onClick={() => handleAction("APPROVED")} disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                      {loading ? "Processing..." : "Approve"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setShowReject(false); setRejectionReason(""); }} disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                      Back
                    </button>
                    <button onClick={() => handleAction("REJECTED")} disabled={loading}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                      {loading ? "Processing..." : "Confirm Reject"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal Component for Leave Details
const LeaveModal = ({ isOpen, onClose, leaveData, employeeName }) => {
  if (!isOpen) return null;

  // Sort ALL leave history by id (most recent first)
  const sortedLeaveHistory = leaveData.history?.sort((a, b) => {
    return (b.id || 0) - (a.id || 0);
  }) || [];


  return (
    <>
      <div className="absolute inset-0 z-40 backdrop bg-black/10" style={{ left: '0px' }} onClick={onClose}></div>
      
      {/* Modal positioned over main content area */}
      <div className="absolute z-50 flex items-center justify-center" style={{ 
        left: '256px', 
        right: '0', 
        top: '0', 
        bottom: '0' 
      }}>
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Leave Records - {employeeName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
                  
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Leave History</h3>
                <p className="text-sm text-gray-600">All leave requests (Approved, Rejected, Pending) - Latest first</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedLeaveHistory.length > 0 ? (
                      sortedLeaveHistory.map((leave, index) => {
                        const fromDate = new Date(leave.from_date);
                        const toDate = new Date(leave.to_date);
                        const appliedDate = leave.applied_at ? new Date(leave.applied_at) : null;
                        const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {leave.applied_at ? new Date(leave.applied_at).toLocaleDateString() : 
                               leave.from_date ? new Date(leave.from_date).toLocaleDateString() : '--'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 capitalize">{leave.leave_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{fromDate.toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{toDate.toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{days}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                leave.status === 'Approved' 
                                  ? 'bg-green-100 text-green-800'
                                  : leave.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {leave.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                          No leave records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};



const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ViewAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [leaveData, setLeaveData] = useState({ balances: [], history: [] });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedRegularization, setSelectedRegularization] = useState(null);
  const [absentRegMap, setAbsentRegMap] = useState({});
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentUserEmpid, setCurrentUserEmpid] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const router = useRouter();
  const { empid } = router.query;

  useEffect(() => {
    fetch('/api/hr/attendance/my-attendance')
      .then(r => r.json())
      .then(d => { if (d.user) { setCurrentUserEmpid(d.user.empid); setCurrentUserRole(d.user.role); } })
      .catch(() => {});
  }, []);

  const now = new Date();
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  useEffect(() => {
    if (!empid) return;
    setLoading(true);
    setFilter('all');
    setCurrentPage(1);

    const fetchData = async () => {
      try {
        const attendanceRes = await fetch(`/api/hr/attendance/${empid}?month=${selectedMonth + 1}&year=${selectedYear}`);
        const attendanceJson = await attendanceRes.json();

        const leaveRes = await fetch(`/api/hr/employee-leave-details?empid=${empid}`);
        const leaveJson = await leaveRes.json();

        // Working days for selected month (up to today if current month)
        const lastDay = isCurrentMonth
          ? now.getDate()
          : new Date(selectedYear, selectedMonth + 1, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= lastDay; d++) {
          const day = new Date(selectedYear, selectedMonth, d).getDay();
          if (day !== 0 && day !== 6) workingDays++;
        }

        setEmployeeData({ ...attendanceJson.employee, totalDays: workingDays });
        setAttendanceData(attendanceJson.attendance);
        setAbsentRegMap(attendanceJson.absentRegMap || {});

        if (leaveJson.success) {
          setLeaveData({ history: leaveJson.data.leaveHistory || [], balances: [] });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [empid, selectedMonth, selectedYear]);

  // Calculate approved leaves taken
  const approvedLeaves = leaveData.history?.filter(leave => leave.status === 'Approved') || [];
  const totalApprovedLeaveDays = approvedLeaves.reduce((total, leave) => {
    const fromDate = new Date(leave.from_date);
    const toDate = new Date(leave.to_date);
    return total + Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  }, 0);

  const getAttendanceWithMissingDays = () => {
    const attendanceMap = new Map(attendanceData.map(record => [record.date, record]));
    const lastDay = isCurrentMonth
      ? now.getDate()
      : new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const result = [];
    for (let day = lastDay; day >= 1; day--) {
      const dateString = `${String(day).padStart(2, '0')}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedYear}`;
      if (attendanceMap.has(dateString)) {
        result.push(attendanceMap.get(dateString));
      } else {
        const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
        result.push({
          date: dateString,
          check_in: null, last_check_in: null, check_out: null,
          total_hours: '--', login_status: 'Logged Out',
          attendance_status: dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : 'Absent',
          regularization: absentRegMap[dateString] || null,
        });
      }
    }
    return result;
  };

  const completeAttendanceData = getAttendanceWithMissingDays();
  const filteredAttendanceData = completeAttendanceData.filter(a => {
    if (filter === 'present') return a.attendance_status === 'Present' || a.attendance_status === 'AutoCheckout';
    if (filter === 'absent') return a.attendance_status === 'Absent';
    return true;
  });
  const absentDays = completeAttendanceData.filter(d => d.attendance_status === 'Absent').length;
  const attendanceRate = employeeData?.totalDays > 0
    ? ((employeeData?.daysPresent / employeeData?.totalDays) * 100).toFixed(1)
    : 0;

  const totalPages = Math.ceil(filteredAttendanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAttendanceData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filter]);

  const handlePageChange = (page) => setCurrentPage(page);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Attendance - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-indigo-600" />
                  Attendance Details
                </h1>
                <p className="text-gray-600">Employee ID: {empid}</p>
              </div>
            </div>
            {/* Month / Year selector */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900 w-36 text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                className={`p-1 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200'}`}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Employee Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{employeeData?.name || "N/A"}</h2>
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{employeeData?.email || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div 
              onClick={() => setFilter('all')}
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Working Days</p>
                  <p className="text-3xl font-bold text-gray-900">{employeeData?.totalDays || 0}</p>
                  <p className="text-xs text-gray-500">{MONTHS[selectedMonth]} {selectedYear}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div 
              onClick={() => setFilter('present')}
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === 'present' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Days Present</p>
                  <p className="text-3xl font-bold text-green-600">{employeeData?.daysPresent || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div 
              onClick={() => setFilter('absent')}
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
                filter === 'absent' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Days Absent</p>
                  <p className="text-3xl font-bold text-red-600">{absentDays || 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{attendanceRate}%</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div 
              onClick={() => setShowLeaveModal(true)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer transition-all hover:shadow-md hover:border-orange-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved Leaves</p>
                  <p className="text-3xl font-bold text-orange-600">{totalApprovedLeaveDays}</p>
                  <p className="text-xs text-gray-500">Click for details</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Daily Attendance Records</h3>
              <p className="text-sm text-gray-600">
                Showing {paginatedData.length} of {filteredAttendanceData.length} records
                {filter !== 'all' && ` (${filter} days only)`}
                {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regularization</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.length > 0 ? (
                    paginatedData.sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((attendance) => (
                      <tr key={attendance.date} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{attendance.date}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(attendance.check_in)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(attendance.last_check_in)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatTime(attendance.check_out)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attendance.total_hours}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendance.login_status === 'Logged In' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {attendance.login_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendance.attendance_status === "Present" ? "bg-green-100 text-green-800"
                            : attendance.attendance_status === "AutoCheckout" ? "bg-yellow-100 text-yellow-800"
                            : attendance.attendance_status === "Weekend" ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                          }`}>
                            {attendance.attendance_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const reg = attendance.regularization;
                            const isOwnRecord = currentUserEmpid && empid === currentUserEmpid && currentUserRole !== 'superadmin';
                            if (!reg) return <span className="text-xs text-gray-400">—</span>;
                            return (
                              <div className="flex items-center gap-2">
                                <span
                                  title={reg.status === 'REJECTED' && reg.rejection_reason ? `Rejected: ${reg.rejection_reason}` : undefined}
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-default ${
                                  reg.status === "APPROVED" ? "bg-green-100 text-green-800"
                                  : reg.status === "REJECTED" ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                                }`}>{reg.status}</span>
                                {!isOwnRecord && (
                                  <button
                                    onClick={() => setSelectedRegularization(reg)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4 text-indigo-600" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                          <p className="text-sm">No attendance records found for the selected filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({filteredAttendanceData.length} total records)
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
                          ? 'bg-indigo-600 text-white'
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

      {selectedRegularization && (
        <RegularizationModal
          request={selectedRegularization}
          onClose={() => setSelectedRegularization(null)}
          onUpdated={(id, action) => {
            setAttendanceData(prev => prev.map(r =>
              r.regularization?.id === id ? { ...r, regularization: { ...r.regularization, status: action } } : r
            ));
          }}
        />
      )}

      {/* Leave Modal */}
      <LeaveModal 
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        leaveData={leaveData}
        employeeName={employeeData?.name || "N/A"}
      />

    </div>
    </>
  );
};

export default ViewAttendance;
