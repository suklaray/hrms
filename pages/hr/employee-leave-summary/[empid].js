import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SideBar from "@/Components/SideBar";
import { ArrowLeft, Calendar, User, CheckCircle, XCircle, AlertCircle, Clock, FileText, Filter } from 'lucide-react';
import moment from 'moment';

export default function EmployeeLeaveSummary() {
  const router = useRouter();
  const { empid } = router.query;
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

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
            paid: type.paid
          };
        });
        
        setLeaveBalances(balances);
      }
    } catch (error) {
      console.error('Error calculating leave balances:', error);
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).isValid() ? moment(dateString).format('DD/MM/YYYY') : 'Invalid Date';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status === statusFilter ? 'all' : status);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-700 text-xl font-semibold">Loading...</div>
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

  // Filter leave history based on status and date
  const filteredLeaveHistory = employeeData?.leaveHistory?.filter(leave => {
    const statusMatch = statusFilter === 'all' || leave.status === statusFilter;
    const fromDateMatch = !dateFilter.from || moment(leave.from_date).isSameOrAfter(dateFilter.from);
    const toDateMatch = !dateFilter.to || moment(leave.from_date).isSameOrBefore(dateFilter.to);
    return statusMatch && fromDateMatch && toDateMatch;
  }) || [];

  const sortedLeaveHistory = filteredLeaveHistory.sort((a, b) => 
    new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at)
  );

  // Calculate leave status counts from filtered data
  const leaveStatusCounts = {
    approved: filteredLeaveHistory.filter(leave => leave.status === 'Approved').length,
    pending: filteredLeaveHistory.filter(leave => leave.status === 'Pending').length,
    rejected: filteredLeaveHistory.filter(leave => leave.status === 'Rejected').length
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Leave Summary</h1>
              <p className="text-gray-600">{employeeData.name} - ID: {employeeData.empid}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info */}
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  <div className="flex items-start justify-between">
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
    
    {/* Small Leave Status Cards */}
    <div className="flex gap-3">
      <div 
        className={`border rounded-lg p-3 cursor-pointer transition-all min-w-[80px] ${
          statusFilter === 'Approved' 
            ? 'bg-green-100 border-green-300 shadow-md' 
            : 'bg-green-50 border-green-200 hover:bg-green-100'
        }`}
        onClick={() => handleStatusFilter('Approved')}
      >
        <div className="text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-green-800">Approved</p>
          <p className="text-lg font-bold text-green-900">{leaveStatusCounts.approved}</p>
        </div>
      </div>
      
      <div 
        className={`border rounded-lg p-3 cursor-pointer transition-all min-w-[80px] ${
          statusFilter === 'Pending' 
            ? 'bg-yellow-100 border-yellow-300 shadow-md' 
            : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
        }`}
        onClick={() => handleStatusFilter('Pending')}
      >
        <div className="text-center">
          <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-yellow-800">Pending</p>
          <p className="text-lg font-bold text-yellow-900">{leaveStatusCounts.pending}</p>
        </div>
      </div>
      
      <div 
        className={`border rounded-lg p-3 cursor-pointer transition-all min-w-[80px] ${
          statusFilter === 'Rejected' 
            ? 'bg-red-100 border-red-300 shadow-md' 
            : 'bg-red-50 border-red-200 hover:bg-red-100'
        }`}
        onClick={() => handleStatusFilter('Rejected')}
      >
        <div className="text-center">
          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-red-800">Rejected</p>
          <p className="text-lg font-bold text-red-900">{leaveStatusCounts.rejected}</p>
        </div>
      </div>
    </div>
  </div>
</div>


          {/* Date Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    setDateFilter({ from: '', to: '' });
                    setStatusFilter('all');
                  }}
                  className="mt-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Leave Balance Chart */}
          {leaveBalances.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Leave Balance ({moment().year()})
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
              <h3 className="text-lg font-semibold text-gray-900">
                {statusFilter !== 'all' ? `${statusFilter} ` : ''}Leave History
                {(dateFilter.from || dateFilter.to) && ' (Filtered)'}
              </h3>
              <p className="text-sm text-gray-600">
                Showing {sortedLeaveHistory.length} of {employeeData.leaveHistory?.length || 0} records
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedLeaveHistory.map((leave) => {
                    const duration = moment(leave.to_date).diff(moment(leave.from_date), 'days') + 1;
                    return (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {leave.leave_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(leave.from_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(leave.to_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {duration} day{duration > 1 ? 's' : ''}
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
                      </tr>
                    );
                  })}
                  {sortedLeaveHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>No leave records found for the selected filters</p>
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
  );
}
