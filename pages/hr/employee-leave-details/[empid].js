import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SideBar from "@/Components/SideBar";
import { ArrowLeft, Calendar, User, CheckCircle, XCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import moment from 'moment';

export default function EmployeeLeaveDetails() {
  const router = useRouter();
  const { empid } = router.query;
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empid) {
      fetch(`/api/hr/employee-leave-details?empid=${empid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEmployeeData(data.data);
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

  const handleStatusChange = async (leaveId, newStatus) => {
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
                  {employeeData.leaveHistory?.map((leave, index) => {
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
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={leave.reason}>
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
                          {leave.document_path ? (
                            <a 
                              href={leave.document_path} 
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
                            onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
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
          </div>
        </div>
      </div>
    </div>
  );
}