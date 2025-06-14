import { useState } from 'react';
import SideBar from '@/Components/SideBar';

export default function AuditLogs() {
  const [logs, setLogs] = useState([
    {
      id: 'LOG001',
      user: 'HR Admin',
      actionType: 'Document Uploaded',
      timestamp: '2025-04-20 14:35:00',
      details: 'ID Proof for Employee ID: E1234',
    },
    {
      id: 'LOG002',
      user: 'Admin',
      actionType: 'Policy Updated',
      timestamp: '2025-04-18 11:20:00',
      details: 'Updated Leave Policy (Rule for Paid Leave)',
    },
    {
      id: 'LOG003',
      user: 'Employee E1234',
      actionType: 'Logged In',
      timestamp: '2025-04-20 09:00:00',
      details: 'Accessed Employee Dashboard',
    },
    {
      id: 'LOG004',
      user: 'HR Admin',
      actionType: 'Document Uploaded',
      timestamp: '2025-04-15 10:00:00',
      details: 'Signed Employment Contract for Employee E1235',
    },
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-700">Audit Logs</h1>
        
        {/* Search and Filter Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search Logs"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200">
              Filter
            </button>
          </div>
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200">
            Export Logs
          </button>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto bg-white shadow rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-gray-100 text-sm text-gray-700">
              <tr>
                <th className="px-6 py-3 font-semibold text-left">Log ID</th>
                <th className="px-6 py-3 font-semibold text-left">User</th>
                <th className="px-6 py-3 font-semibold text-left">Action Type</th>
                <th className="px-6 py-3 font-semibold text-left">Timestamp</th>
                <th className="px-6 py-3 font-semibold text-left">Details</th>
                <th className="px-6 py-3 font-semibold text-left">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 text-sm">{log.id}</td>
                  <td className="px-6 py-4 text-sm">{log.user}</td>
                  <td className="px-6 py-4 text-sm">{log.actionType}</td>
                  <td className="px-6 py-4 text-sm">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm">{log.details}</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-indigo-600 hover:underline">View</button>
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
 