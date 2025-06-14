import { useEffect, useState } from 'react';
import moment from 'moment'; 
import SideBar from "@/Components/SideBar";

export default function ViewLeaveRequests() {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hr/leave-requests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLeaveData(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching leave requests:', err);
        setLoading(false);
      });
  }, []);

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

  // Helper function to format dates using moment.js
  const formatDate = (dateString) => {
    return moment(dateString).isValid() ? moment(dateString).format('DD/MM/YYYY') : 'Invalid Date';
  };

  if (loading) return <div className="p-6 text-center text-xl">Loading...</div>;

  return (
    <div className="flex">
  {/* Sidebar */}
  <SideBar />

  {/* Main Content */}
  <div className="min-h-screen w-full p-8 text-gray-900 "> {/* Adjusted to leave space for sidebar */}
    <h2 className="text-3xl font-bold mb-6 text-center text-indigo-700">Employee Leave Requests</h2>
    <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
      <table className="min-w-full text-sm text-gray-900">
        <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <tr>
            <th className="p-3 text-left">Emp ID</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Leave Type</th>
            <th className="p-3 text-left">Start Date</th>
            <th className="p-3 text-left">End Date</th>
            <th className="p-3 text-left">Reason</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {leaveData.map((leave, index) => (
            <tr key={leave.id} className={`border-b ${index % 2 === 0 ? 'bg-indigo-100' : 'bg-white'} hover:bg-indigo-300`}>
              <td className="p-3">{leave.empid}</td>
              <td className="p-3">{leave.name}</td>
              <td className="p-3">{leave.leave_type}</td>
              <td className="p-3">{formatDate(leave.from_date)}</td>
              <td className="p-3">{formatDate(leave.to_date)}</td>
              <td className="p-3">{leave.reason}</td>
              <td className="p-3">
                <select
                  value={leave.status}
                  onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                  className={`border rounded px-2 py-1
                    ${
                      leave.status === 'Approved'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : leave.status === 'Rejected'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }
                  `}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
);
}
