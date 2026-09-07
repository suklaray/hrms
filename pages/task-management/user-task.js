// pages/task-management/user-task.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { getUserFromToken } from '@/lib/getUserFromToken';
import { checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

export async function getServerSideProps({ req }) {
  const token = req?.cookies?.token || '';
  const user = getUserFromToken(token);
  if (!user) return { redirect: { destination: '/login', permanent: false } };

  const [canViewTasks, canSubmitReport] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.TASK_MY),
    checkPermission(user, PERMISSION_KEYS.REPORT_SUBMIT),
  ]);

  if (!canViewTasks && !canSubmitReport) {
    return { redirect: { destination: '/403', permanent: false } };
  }

  return {
    props: {
      permissions: {
        tasks: canViewTasks,
        report: canSubmitReport,
      },
    },
  };
}
import WorkReportModal from '@/Components/WorkReportModal';
import { CheckCircle, Clock, AlertCircle, Calendar, ChevronLeft, ChevronRight, AlertTriangle, FileText, X } from 'lucide-react';
import { formatDateTime } from '@/utils/dateTime';

export default function UserTasks({ permissions }) {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(() => permissions.tasks ? 'tasks' : 'reports');
  const [workReports, setWorkReports] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filteredReports, setFilteredReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [showWorkReportModal, setShowWorkReportModal] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedTaskDescription, setSelectedTaskDescription] = useState({ title: '', description: '' });

  const calculateStats = useCallback(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'Completed').length;
    setStats({ total, pending, inProgress, completed, overdue });
  }, [tasks]);

  useEffect(() => { fetchUserAndTasks(); }, []);
  useEffect(() => { calculateStats(); }, [tasks, calculateStats]);
  useEffect(() => {
    if (workReports.length > 0) {
      const filtered = workReports.filter(report => {
        const d = new Date(report.report_date);
        const reportMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return reportMonth === selectedMonth;
      });
      setFilteredReports(filtered);
    }
  }, [workReports, selectedMonth]);

  const fetchUserAndTasks = async () => {
    try {
      const fetches = [fetch('/api/auth/me')];
      if (permissions.tasks) fetches.push(fetch('/api/task-management/user-task'));
      if (permissions.report) fetches.push(fetch('/api/employee/work-report'));

      const results = await Promise.all(fetches);
      let idx = 0;
      const userData = await results[idx++].json();
      setUser(userData.user);
      if (permissions.tasks) {
        const data = await results[idx++].json();
        setTasks(data.tasks || []);
      }
      if (permissions.report) {
        const reportsRes = results[idx++];
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setWorkReports(reportsData.reports || []);
          setLeaves(reportsData.leaves || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const res = await fetch('/api/task-management/user-task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });
      if (res.ok) {
        setTasks(tasks.map(task => task.id === taskId ? { ...task, status } : task));
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
    const now = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffTime < 0) return { text: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
    if (diffDays === 0) {
      if (diffHours < 2) return { text: `Due in ${diffHours === 0 ? Math.max(1, diffMinutes) + ' minute(s)' : diffHours + ' hour(s)'}`, color: 'text-red-600', bg: 'bg-red-50' };
      return { text: 'Due today', color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (diffDays <= 3) return { text: `${diffDays} days left`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: 'text-blue-600', bg: 'bg-blue-50' };
    return null;
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'all'
      || (filter === 'overdue' ? new Date(task.deadline) < new Date() && task.status !== 'Completed'
        : task.status.toLowerCase().replace(' ', '') === filter);
    const matchesDate = !dateFilter || new Date(task.deadline).toDateString() === new Date(dateFilter).toDateString();
    const matchesSearch = !searchTerm || [task.title, task.description || '', task.status, task.assignedBy?.name || '']
      .some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const handleDescriptionClick = (task) => {
    setSelectedTaskDescription({ title: task.title, description: task.description || 'No description available' });
    setShowDescriptionModal(true);
  };

  const generateMonthlyReportRows = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const rows = [];
    for (let day = daysInMonth; day >= 1; day--) {
      const currentDate = new Date(year, month - 1, day);
      if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth() && currentDate.getDate() > today.getDate()) continue;
      const dateStr = currentDate.toLocaleDateString('en-CA');
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const report = filteredReports.find(r => new Date(r.report_date).toLocaleDateString('en-CA') === dateStr);
      const leaveOnDate = leaves.find(l => {
        const from = new Date(l.from_date); from.setHours(0, 0, 0, 0);
        const to = new Date(l.to_date); to.setHours(0, 0, 0, 0);
        const cur = new Date(currentDate); cur.setHours(0, 0, 0, 0);
        return cur >= from && cur <= to;
      });
      if (report) rows.push({ date: currentDate, report, rowType: isWeekend ? 'worked_dayoff' : 'submitted' });
      else if (isWeekend) rows.push({ date: currentDate, report: null, rowType: 'dayoff' });
      else if (leaveOnDate) rows.push({ date: currentDate, report: null, rowType: 'leave', leaveInfo: leaveOnDate });
      else rows.push({ date: currentDate, report: null, rowType: 'missing' });
    }
    return rows;
  };

  const getAvailableMonths = () => {
    const currentYear = new Date().getFullYear();
    const availableMonths = [...new Set(workReports.map(r => {
      const d = new Date(r.report_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse();
    return availableMonths.length > 0 ? availableMonths : Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
  };

  const monthlyReportRows = generateMonthlyReportRows();
  const availableMonths = getAvailableMonths();

  return (
    <>
      <Head><title>My Tasks - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar user={user} />
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                <p className="text-gray-600">Manage your tasks and work reports</p>
              </div>
              {permissions.report && (
                <button onClick={() => setShowWorkReportModal(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText className="h-4 w-4 mr-2" />Daily Work Report
                </button>
              )}
            </div>
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  permissions.tasks && { key: 'tasks', label: 'My Tasks' },
                  permissions.report && { key: 'reports', label: 'Work Reports History' },
                ].filter(Boolean).map(({ key, label }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : activeTab === 'tasks' ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  {[
                    { label: 'Total', value: stats.total, key: 'all', icon: <CheckCircle className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100' },
                    { label: 'Pending', value: stats.pending, key: 'pending', icon: <Clock className="h-6 w-6 text-yellow-600" />, bg: 'bg-yellow-100' },
                    { label: 'In Progress', value: stats.inProgress, key: 'inprogress', icon: <AlertCircle className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100' },
                    { label: 'Completed', value: stats.completed, key: 'completed', icon: <CheckCircle className="h-6 w-6 text-green-600" />, bg: 'bg-green-100' },
                    { label: 'Overdue', value: stats.overdue, key: 'overdue', icon: <AlertTriangle className="h-6 w-6 text-red-600" />, bg: 'bg-red-100' },
                  ].map(({ label, value, key, icon, bg }) => (
                    <div key={key} onClick={() => { setFilter(key); setCurrentPage(1); }} className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
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
                      {[{ key: 'all', label: 'All Tasks' }, { key: 'pending', label: 'Pending' }, { key: 'inprogress', label: 'In Progress' }, { key: 'completed', label: 'Completed' }].map(({ key, label }) => (
                        <button key={key} onClick={() => { setFilter(key); setCurrentPage(1); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {dateFilter && <button onClick={() => { setDateFilter(''); setCurrentPage(1); }} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">Clear</button>}
                      <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {['S.No', 'Task Title', 'Description', 'Status', 'Given By', 'Deadline'].map(h => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTasks.length === 0 ? (
                          <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No tasks found.</td></tr>
                        ) : paginatedTasks.map((task, index) => {
                          const deadlineStatus = getDeadlineStatus(task.deadline, task.status);
                          return (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">{startIndex + index + 1}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.title}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {task.description && task.description.length > 50 ? (
                                  <span className="cursor-pointer truncate max-w-xs block" onClick={() => handleDescriptionClick(task)} title="Click to view full description">
                                    {task.description.substring(0, 50)}...
                                  </span>
                                ) : <span>{task.description || 'No description'}</span>}
                              </td>
                              <td className="px-6 py-4">
                                <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)} focus:outline-none`}>
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{task.assignedBy?.name || 'Unknown'}</td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{formatDateTime(task.deadline)}</div>
                                {deadlineStatus && <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${deadlineStatus.bg} ${deadlineStatus.color}`}>{deadlineStatus.text}</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks</div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i + 1} onClick={() => setCurrentPage(i + 1)}
                          className={`px-3 py-2 border rounded-md text-sm font-medium ${currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Work Reports Tab */
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Work Reports History</h3>
                    <p className="text-sm text-gray-600">View your past daily work reports</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Month:</label>
                    <div className="relative">
                      <button type="button" onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm w-32 text-left flex items-center justify-between">
                        <span>{(() => { const [y, m] = selectedMonth.split('-'); return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y}`; })()}</span>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transform transition-transform ${showMonthDropdown ? 'rotate-90' : ''}`} />
                      </button>
                      {showMonthDropdown && (
                        <div className="absolute z-10 mt-1 w-32 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {availableMonths.map(m => {
                            const [y, mn] = m.split('-');
                            const label = `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mn)-1]} ${y}`;
                            return (
                              <button key={m} type="button" onClick={() => { setSelectedMonth(m); setShowMonthDropdown(false); }}
                                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${m === selectedMonth ? 'bg-blue-50 text-blue-600' : 'text-gray-900'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Date', 'Tasks Completed', 'Tasks for Tomorrow', 'Issues', 'Status'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyReportRows.map((row, index) => {
                        const { rowType } = row;
                        if (rowType === 'dayoff') return (
                          <tr key={index} className="bg-blue-50">
                            <td className="px-6 py-3 text-sm font-medium text-blue-700">{row.date.toLocaleDateString()}</td>
                            <td colSpan="4" className="px-6 py-3 text-center"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Weekend / Day Off</span></td>
                          </tr>
                        );
                        if (rowType === 'leave') return (
                          <tr key={index} className="bg-yellow-50">
                            <td className="px-6 py-3 text-sm font-medium text-yellow-700">{row.date.toLocaleDateString()}</td>
                            <td colSpan="4" className="px-6 py-3 text-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${row.leaveInfo.status === 'Approved' ? 'bg-green-100 text-green-700' : row.leaveInfo.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                On Leave — {row.leaveInfo.leave_type} ({row.leaveInfo.status})
                              </span>
                            </td>
                          </tr>
                        );
                        if (rowType === 'missing') return (
                          <tr key={index} className="bg-red-50">
                            <td className="px-6 py-3 text-sm font-medium text-red-600">{row.date.toLocaleDateString()}</td>
                            <td colSpan="4" className="px-6 py-3 text-center"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">No Report</span></td>
                          </tr>
                        );
                        return (
                          <tr key={index} className={rowType === 'worked_dayoff' ? 'bg-green-50' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4 text-sm text-gray-900">{row.date.toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm">{row.report.tasks_completed}</td>
                            <td className="px-6 py-4 text-sm">{row.report.tasks_tomorrow}</td>
                            <td className="px-6 py-4 text-sm">{row.report.issues || '-'}</td>
                            <td className="px-6 py-4"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{rowType === 'worked_dayoff' ? 'Submitted (Day Off)' : 'Submitted'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <WorkReportModal isOpen={showWorkReportModal} onClose={() => setShowWorkReportModal(false)} onSubmit={() => fetchUserAndTasks()} />

      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Description</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedTaskDescription.title}</p>
              </div>
              <button onClick={() => setShowDescriptionModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTaskDescription.description}</p>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button onClick={() => setShowDescriptionModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
