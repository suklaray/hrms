import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import { Clock, Calendar, User, Mail, TrendingUp, CheckCircle, XCircle, ArrowLeft, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

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



const ViewAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [leaveData, setLeaveData] = useState({ balances: [], history: [] });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const router = useRouter();
  const { empid } = router.query;

  // Calculate working days for current month (excluding weekends and holidays)
  const getCurrentMonthWorkingDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let workingDays = 0;
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      // Exclude weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  useEffect(() => {
    if (empid) {
      const fetchData = async () => {
        try {
          // Fetch attendance data
          const attendanceRes = await fetch(`/api/hr/attendance/${empid}`);
          const attendanceJson = await attendanceRes.json();
          
          // Fetch leave data
          const leaveRes = await fetch(`/api/hr/employee-leave-details?empid=${empid}`);
          const leaveJson = await leaveRes.json();
          
          // Calculate working days for current month
          const workingDays = getCurrentMonthWorkingDays();
          
          setEmployeeData({
            ...attendanceJson.employee,
            totalDays: workingDays // Override with current month working days
          });
          setAttendanceData(attendanceJson.attendance);
          
          if (leaveJson.success) {
            setLeaveData({
              history: leaveJson.data.leaveHistory || [],
              balances: [] // Will be populated separately if needed
            });
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [empid]);

  // Calculate approved leaves taken
  const approvedLeaves = leaveData.history?.filter(leave => leave.status === 'Approved') || [];
  const totalApprovedLeaveDays = approvedLeaves.reduce((total, leave) => {
    const fromDate = new Date(leave.from_date);
    const toDate = new Date(leave.to_date);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
    return total + days;
  }, 0);

  const attendanceRate = employeeData?.totalDays > 0 
    ? ((employeeData?.daysPresent / employeeData?.totalDays) * 100).toFixed(1)
    : 0;

  const filteredAttendanceData = attendanceData.filter(attendance => {
    if (filter === 'present') return attendance.attendance_status === 'Present';
    if (filter === 'absent') return attendance.attendance_status === 'Absent';
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAttendanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAttendanceData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
                  <p className="text-xs text-gray-500">Current Month</p>
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
                  <p className="text-3xl font-bold text-red-600">{employeeData?.daysAbsent || 0}</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
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
                          <div className="text-sm text-gray-900">{attendance.check_in || '--'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attendance.check_out || '--'}</div>
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
                            attendance.attendance_status === 'Present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attendance.attendance_status}
                          </span>
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

      {/* Leave Modal */}
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
