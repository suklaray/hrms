import { useEffect, useState } from 'react';
import moment from 'moment'; 
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';
import { Eye, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function ViewLeaveRequests() {
  const router = useRouter();
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetch('/api/hr/leave-requests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Group by employee and get latest request
          const groupedData = data.data.reduce((acc, leave) => {
            if (!acc[leave.empid] || new Date(leave.created_at) > new Date(acc[leave.empid].created_at)) {
              acc[leave.empid] = leave;
            }
            return acc;
          }, {});
          setLeaveData(Object.values(groupedData));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching leave requests:', err);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    router.push("/login");
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
        setLeaveData((prev) =>
          prev.map((leave) =>
            leave.id === leaveId ? { ...leave, status: newStatus } : leave
          )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).isValid() ? moment(dateString).format('DD/MM/YYYY') : 'Invalid Date';
  };

  const getLeaveStatus = (leave) => {
    const today = moment();
    const startDate = moment(leave.from_date);
    const endDate = moment(leave.to_date);
    
    if (leave.status === 'Approved' && today.isBetween(startDate, endDate, 'day', '[]')) {
      return 'On Leave';
    }
    return leave.status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'On Leave': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleViewEmployee = (empid) => {
    router.push(`/hr/employee-leave-details/${empid}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-indigo-700 text-xl font-semibold">Loading leave requests...</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests Management</h1>
          <p className="text-gray-600">Manage employee leave requests and track leave status</p>
        </div>

        <div className="p-6">
          {/* Leave Requests List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Employee Leave Requests</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveData.map((leave) => {
                    const currentStatus = getLeaveStatus(leave);
                    return (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{leave.name}</div>
                              <div className="text-sm text-gray-500">ID: {leave.empid}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{leave.leave_type}</div>
                          <div className="text-sm text-gray-500">{leave.reason}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div>{formatDate(leave.from_date)}</div>
                              <div className="text-gray-500">to {formatDate(leave.to_date)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentStatus)}`}>
                            {currentStatus === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {currentStatus === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {currentStatus === 'Pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {currentStatus === 'On Leave' && <Clock className="w-3 h-3 mr-1" />}
                            {currentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewEmployee(leave.empid)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={leave.status}
                            onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {leaveData.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No leave requests found</p>
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
