import { useEffect, useState } from 'react';
import moment from 'moment'; 
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';

export default function ViewLeaveRequests() {
  const router = useRouter();
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
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        {/* Table */}
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Employee Leave Requests</h2>
          <table className="min-w-full divide-y divide-indigo-300 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-left">Emp ID</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Name</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Leave Type</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Start Date</th>
                <th className="px-4 py-3 text-sm font-medium text-left">End Date</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Reason</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaveData.map((leave, index) => (
                <tr key={leave.id} className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}>
                  <td className="px-4 py-2">{leave.empid}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{leave.name}</td>
                  <td className="px-4 py-2">{leave.leave_type}</td>
                  <td className="px-4 py-2">{formatDate(leave.from_date)}</td>
                  <td className="px-4 py-2">{formatDate(leave.to_date)}</td>
                  <td className="px-4 py-2">{leave.reason}</td>
                  <td className="px-4 py-2">
                    <select
                      value={leave.status}
                      onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        leave.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
              {leaveData.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500 py-6">
                    No leave requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
