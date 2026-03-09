// pages/task-management/index.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { CheckCircle, Clock, AlertCircle, Calendar, AlertTriangle } from 'lucide-react';

export default function TaskManagement() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });

  const calculateStats = useCallback(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'Completed').length;
    
    setStats({ total, pending, inProgress, completed, overdue });
  }, [tasks]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [tasks, calculateStats]);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      setUser(userData.user);

      // Check if user has permission
      if (!['hr', 'admin', 'superadmin'].includes(userData.user?.role)) {
        router.push('/task-management/user-task');
        return;
      }

      const res = await fetch('/api/task-management/all-tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const filteredTasks = tasks.filter(task => {
    let matchesStatus = filter === 'all' 
        || (filter === 'overdue' 
            ? new Date(task.deadline) < new Date() && task.status !== 'Completed'
            : task.status.toLowerCase().replace(' ', '') === filter);

    let matchesDate = true;
    if (dateFilter) {
        const taskDate = new Date(task.deadline).toDateString();
        const filterDate = new Date(dateFilter).toDateString();
        matchesDate = taskDate === filterDate;
    }

    let matchesSearch = true;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        matchesSearch = task.title.toLowerCase().includes(lower) || 
                    (task.description || '').toLowerCase().includes(lower) ||
                    task.status.toLowerCase().includes(lower) ||
                    (task.assignee?.name || '').toLowerCase().includes(lower) ||
                    (task.assignedBy?.name || '').toLowerCase().includes(lower);
    }

    return matchesStatus && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="w-64 bg-white shadow-lg"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Task Management - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} user={user} />
        
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                <p className="text-gray-600">Manage and track all tasks</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total', value: stats.total, key: 'all', icon: <CheckCircle className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100' },
                { label: 'Pending', value: stats.pending, key: 'pending', icon: <Clock className="h-6 w-6 text-yellow-600" />, bg: 'bg-yellow-100' },
                { label: 'In Progress', value: stats.inProgress, key: 'inprogress', icon: <AlertCircle className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100' },
                { label: 'Completed', value: stats.completed, key: 'completed', icon: <CheckCircle className="h-6 w-6 text-green-600" />, bg: 'bg-green-100' },
                { label: 'Overdue', value: stats.overdue, key: 'overdue', icon: <AlertTriangle className="h-6 w-6 text-red-600" />, bg: 'bg-red-100' },
              ].map(({ label, value, key, icon, bg }) => (
                <div
                  key={key}
                  onClick={() => { setFilter(key); setCurrentPage(1); }}
                  className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${bg}`}>
                      {icon}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All Tasks' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'inprogress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setFilter(key); setCurrentPage(1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">{task.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{task.assignee?.name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(task.deadline)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{task.assignedBy?.name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-2 border rounded-md text-sm font-medium ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}