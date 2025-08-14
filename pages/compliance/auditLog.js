import { useState } from 'react';
import SideBar from '@/Components/SideBar';
import { useRouter } from 'next/router';
import { Search, Filter, Download, Eye, Calendar } from 'lucide-react';

export default function AuditLogs() {
  const router = useRouter();
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

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        {/* Search and Filter Bar */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Logs"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 transition-all">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Audit Logs</h2>
          <table className="min-w-full divide-y divide-indigo-300 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-left">Log ID</th>
                <th className="px-4 py-3 text-sm font-medium text-left">User</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Action Type</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Timestamp</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Details</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={log.id} className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}>
                  <td className="px-4 py-2">{log.id}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{log.user}</td>
                  <td className="px-4 py-2">{log.actionType}</td>
                  <td className="px-4 py-2">{log.timestamp}</td>
                  <td className="px-4 py-2">{log.details}</td>
                  <td className="px-4 py-2">
                    <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
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
 