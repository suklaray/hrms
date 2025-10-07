// pages/task-management/user-task.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import EmpSideBar from '@/Components/empSidebar';
import { CheckCircle, Clock, AlertCircle, Calendar, User, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function UserTasks() {
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


  useEffect(() => {
    fetchUserAndTasks();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [tasks]);

  const fetchUserAndTasks = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      setUser(userData.user);

      const res = await fetch('/api/task-management/user-task');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'Completed').length;
    
    setStats({ total, pending, inProgress, completed, overdue });
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const res = await fetch('/api/task-management/user-task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status })
      });

      if (res.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status } : task
        ));
      }
    } catch (error) {
      console.error('Error updating task:', error);
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

  const getDeadlineStatus = (deadline, status) => {
    if (status === 'Completed') return null;
    
    const today = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, color: 'text-red-600', bg: 'bg-red-50' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-orange-600', bg: 'bg-orange-50' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} days left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: 'text-blue-600', bg: 'bg-blue-50' };
    }
    return null;
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
                    (task.assignedBy?.name || '').toLowerCase().includes(lower) ||
                    new Date(task.deadline).toLocaleDateString().toLowerCase().includes(lower);
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

    const SidebarComponent = user && ['hr', 'admin', 'superadmin'].includes(user.role) ? SideBar : EmpSideBar;

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
            <title>My Tasks - HRMS</title>
        </Head>
        <div className="flex min-h-screen bg-gray-50">
            <SidebarComponent handleLogout={handleLogout} user={user} />
            
            <div className="flex-1 overflow-auto">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
                <p className="text-gray-600">Manage your assigned tasks</p>
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
                {/* Status Buttons */}
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    >
                    {label}
                    </button>
                ))}
                </div>

                {/* Date + Search */}
                <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {dateFilter && (
                    <button
                    onClick={() => { setDateFilter(''); setCurrentPage(1); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                    Clear
                    </button>
                )}

                {/* Search Input */}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Given By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deadline
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {filter === 'all' && !dateFilter ? 'You have no assigned tasks.' : 'No tasks match your filters.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((task, index) => {
                        const deadlineStatus = getDeadlineStatus(task.deadline, task.status);
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {task.description || 'No description'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {task.assignedBy?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(task.deadline).toLocaleDateString()}
                              </div>
                              {deadlineStatus && (
                                <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${deadlineStatus.bg} ${deadlineStatus.color}`}>
                                  {deadlineStatus.text}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
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
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
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
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
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
