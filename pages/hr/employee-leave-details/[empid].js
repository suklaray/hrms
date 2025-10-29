import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SideBar from "@/Components/SideBar";
import Breadcrumb from "@/Components/Breadcrumb";
import { ArrowLeft, Calendar, User, CheckCircle, XCircle, AlertCircle, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import { swalConfirm } from '@/utils/confirmDialog';

export default function EmployeeLeaveDetails() {
  const router = useRouter();
  const { empid } = router.query;
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [leaveBalances, setLeaveBalances] = useState([]);

  useEffect(() => {
    if (empid) {
      fetch(`/api/hr/employee-leave-details?empid=${empid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEmployeeData(data.data);
            calculateLeaveBalances(data.data.leaveHistory);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching employee details:', err);
          setLoading(false);
        });
    }
  }, [empid]);


  const formatDate = (dateString) => {
    return moment(dateString).isValid() ? moment(dateString).format('DD/MM/YYYY') : 'Invalid Date';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'On Leave': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const isCurrentlyOnLeave = (leave) => {
    if (leave.status !== 'Approved') return false;
    const today = moment();
    const startDate = moment(leave.from_date);
    const endDate = moment(leave.to_date);
    return today.isBetween(startDate, endDate, 'day', '[]');
  };


const handleStatusChange = async (leaveId, newStatus, currentStatus) => {
  // Business logic for status changes
  if (currentStatus === 'Rejected' && newStatus === 'Approved') {
    await swalConfirm('Cannot change status from Rejected to Approved. This action is not allowed.', false);
    return;
  }

  if ((currentStatus === 'Approved' || currentStatus === 'Rejected') && newStatus === 'Pending') {
    await swalConfirm('Cannot change status back to Pending once it has been Approved or Rejected.', false);
    return;
  }

  // Confirmation message
  let confirmMessage = '';
  if (newStatus === 'Approved') {
    confirmMessage = 'Are you sure you want to APPROVE this leave request? Once confirmed, this can only be changed to Rejected (one time only).';
  } else if (newStatus === 'Rejected') {
    if (currentStatus === 'Approved') {
      confirmMessage = 'Are you sure you want to REJECT this leave request? This is a one-time change from Approved to Rejected and cannot be reversed.';
    } else {
      confirmMessage = 'Are you sure you want to REJECT this leave request? Once confirmed, this cannot be changed.';
    }
  }

  const confirmed = await swalConfirm(confirmMessage);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/hr/update-leave-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leaveId, status: newStatus }),
    });
    
    const data = await res.json();
    if (data.success) {
      setEmployeeData(prev => ({
        ...prev,
        leaveHistory: prev.leaveHistory.map(leave =>
          leave.id === leaveId ? { ...leave, status: newStatus } : leave
        )
      }));
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
};



  const calculateLeaveBalances = async (leaveHistory) => {
  try {
    const res = await fetch('/api/hr/leave-types');
    const data = await res.json();
    
    if (data.success) {
      const leaveTypes = data.data;
      const currentYear = moment().year();
      
      const balances = leaveTypes.map(type => {
        const normalizeType = (str) => str.replace(/[_\s]/g, '').toLowerCase();
        
        const approvedLeaves = leaveHistory.filter(leave => 
          normalizeType(leave.leave_type) === normalizeType(type.type_name) && 
          leave.status === 'Approved' &&
          moment(leave.from_date).year() === currentYear
        );
        
        const usedDays = approvedLeaves.reduce((sum, leave) => {
          const days = moment(leave.to_date).diff(moment(leave.from_date), 'days') + 1;
          return sum + days;
        }, 0);
        
        return {
          type_name: type.type_name,
          max_days: type.max_days,
          used: usedDays,
          remaining: Math.max(0, type.max_days - usedDays),
          paid: type.paid // Add this line
        };
      });
      
      setLeaveBalances(balances);
    }
  } catch (error) {
    console.error('Error calculating leave balances:', error);
  }
};



  const handleLogout = () => {
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-700 text-xl font-semibold">Loading employee details...</div>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-700 text-xl">Employee not found</div>
        </div>
      </div>
    );
  }
  

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Leave Details</h1>
              <p className="text-gray-600">{employeeData.name} - ID: {employeeData.empid}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Breadcrumb items={[
            { label: 'Leave Requests', href: '/hr/view-leave-requests' },
            { label: employeeData?.name || 'Employee Details' }
          ]} />
          
          {/* Employee Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-semibold text-gray-900">{employeeData.name}</h2>
                <p className="text-gray-600">Employee ID: {employeeData.empid}</p>
                <p className="text-gray-600">Email: {employeeData.email}</p>
              </div>
            </div>
          </div>

          {/* Leave Balance Chart */}
          {leaveBalances.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              {/* <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Leave Balance ({moment().year()})
              </h3> */}
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Pending Leave Requests
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg border border-blue-100">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase">Total Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase">Used</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase">Remaining</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {leaveBalances.map((balance, index) => (
                      <tr key={index} className="hover:bg-blue-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {balance.type_name.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {balance.max_days}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {balance.used}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          {balance.remaining}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {balance.paid ? 'Paid' : 'Unpaid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            </div>
          )}


          {/* Leave History Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Leave History
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    if (!employeeData.leaveHistory || employeeData.leaveHistory.length === 0) return null;
                    
                    // Filter out past dates for completed leave requests
                    const today = moment().startOf('day');
                    const filteredLeaves = employeeData.leaveHistory.filter(leave => {
                      return leave.status === 'Pending';
                    });




                    
                    const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedLeaves = filteredLeaves.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedLeaves.map((leave, index) => {
                      const fromDate = moment(leave.from_date);
                      const toDate = moment(leave.to_date);
                      const duration = toDate.diff(fromDate, 'days') + 1;
                  

                      return (
                        <tr key={leave.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{leave.leave_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(leave.from_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(leave.to_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{duration} day{duration > 1 ? 's' : ''}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div 
                              className="text-sm text-gray-900 max-w-xs truncate cursor-pointer hover:text-indigo-600" 
                              title="Click to view full reason"
                              onClick={() => {
                                setSelectedReason(leave.reason);
                                setShowReasonModal(true);
                              }}
                            >
                              {leave.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                              {leave.status === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {leave.status === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                              {leave.status === 'Pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {leave.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isCurrentlyOnLeave(leave) ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                <Clock className="w-3 h-3 mr-1" />
                                On Leave
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {leave.attachment ? (
                              <a 
                                href={leave.attachment} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View
                              </a>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={leave.status}
                              onChange={(e) => handleStatusChange(leave.id, e.target.value, leave.status)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {leave.status === 'Pending' && (
                                <>
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                </>
                              )}
                              {leave.status === 'Approved' && (
                                <>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                </>
                              )}
                              {leave.status === 'Rejected' && (
                                <option value="Rejected">Rejected</option>
                              )}
                            </select>

                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {(!employeeData.leaveHistory || employeeData.leaveHistory.length === 0) && (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No leave history found for this employee</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {employeeData.leaveHistory && (() => {
              const today = moment().startOf('day');
              const filteredLeaves = employeeData.leaveHistory.filter(leave => {
                const toDate = moment(leave.to_date).startOf('day');
                return toDate.isSameOrAfter(today);
              });
              const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
              
              const handlePageChange = (page) => {
                setCurrentPage(page);
              };
              
              return totalPages > 1 ? (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing page {currentPage} of {totalPages} ({filteredLeaves.length} total requests)
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
              ) : null;
            })()}
          </div>
        </div>
      </div>
      {/* Reason Modal */}
{/* Reason Modal */}
{showReasonModal && (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg max-h-80 sm:max-h-96 overflow-hidden shadow-xl">
      <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
        <h3 className="text-lg font-bold text-gray-800">Leave Reason</h3>
        <button
          onClick={() => setShowReasonModal(false)}
          className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all"
        >
          ×
        </button>
      </div>
      <div className="p-6 text-sm text-gray-800 whitespace-pre-wrap overflow-y-auto max-h-64">
        {selectedReason}
      </div>
    </div>
  </div>
)}

    </div>
  );
}