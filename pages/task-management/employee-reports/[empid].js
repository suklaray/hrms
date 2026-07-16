import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { ArrowLeft, Calendar, Search, FileText } from 'lucide-react';
import { formatDate, formatTimeWithSeconds } from '@/utils/dateTime';

export default function EmployeeReports() {
  const router = useRouter();
  const { empid } = router.query;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (empid) {
      fetchData();
    }
  }, [empid]);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, fromDate, toDate]);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      setUser(userData.user);

      if (!['hr', 'admin', 'superadmin'].includes(userData.user?.role)) {
        router.push('/task-management/user-task');
        return;
      }

      const reportsRes = await fetch(`/api/hr/employee-work-reports/${empid}`);
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
        setLeaves(data.leaves || []);
        setEmployee(data.employee);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    let start, end;

    if (fromDate && toDate) {
      start = new Date(fromDate); start.setHours(0,0,0,0);
      end = new Date(toDate); end.setHours(0,0,0,0);
    } else {
      // Infer start from earliest report OR earliest leave, end = today
      const reportDates = reports.map(r => new Date(r.report_date).getTime());
      const leaveDates = leaves.map(l => new Date(l.from_date).getTime());
      const allDates = [...reportDates, ...leaveDates].filter(Boolean);
      if (allDates.length === 0) { setFilteredReports([]); return; }
      start = new Date(Math.min(...allDates)); start.setHours(0,0,0,0);
      end = today;
    }

    const rows = [];
    const cur = new Date(end);

    while (cur >= start) {
      const dateStr = cur.toLocaleDateString('en-CA');
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;

      const dayReports = reports.filter(r => {
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          if (!r.tasks_completed.toLowerCase().includes(lower) &&
              !r.tasks_tomorrow.toLowerCase().includes(lower) &&
              !(r.issues || '').toLowerCase().includes(lower)) return false;
        }
        return new Date(r.report_date).toLocaleDateString('en-CA') === dateStr;
      });

      const leaveOnDate = leaves.find(l => {
        const from = new Date(l.from_date); from.setHours(0,0,0,0);
        const to = new Date(l.to_date); to.setHours(0,0,0,0);
        return cur >= from && cur <= to;
      });

      if (dayReports.length > 0) {
        dayReports.forEach(r => rows.push({ ...r, rowType: isWeekend ? 'worked_dayoff' : 'submitted' }));
      } else if (isWeekend) {
        rows.push({ id: `dayoff-${dateStr}`, report_date: dateStr, rowType: 'dayoff' });
      } else if (leaveOnDate) {
        rows.push({ id: `leave-${dateStr}`, report_date: dateStr, rowType: 'leave', leaveInfo: leaveOnDate });
      } else {
        rows.push({ id: `missing-${dateStr}`, report_date: dateStr, rowType: 'missing' });
      }

      cur.setDate(cur.getDate() - 1);
    }

    setFilteredReports(rows);
  };

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
        <title>Employee Reports - {employee?.name} - HRMS</title>
      </Head>

      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} user={user} />

        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Work Reports - {employee?.name}</h1>
                <p className="text-gray-600">Employee ID: {employee?.empid}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-50 border-b border-gray-200 ">
                  <tr>
                    <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tasks Completed</th>
                    <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tasks Tomorrow</th>
                    <th className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-12 text-center">
                        <div className="text-gray-500">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium mb-2">No reports found</h3>
                          <p className="text-sm">No work reports match your current filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((row) => {
                      const { rowType } = row;

                      if (rowType === 'dayoff') return (
                        <tr key={row.id} className="bg-blue-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-700">{formatDate(row.report_date)}</td>
                          <td colSpan="4" className="px-3 py-3 text-center">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Weekend / Day Off</span>
                          </td>
                        </tr>
                      );

                      if (rowType === 'leave') return (
                        <tr key={row.id} className="bg-yellow-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-yellow-700">{formatDate(row.report_date)}</td>
                          <td colSpan="4" className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                              row.leaveInfo.status === 'Approved' ? 'bg-green-100 text-green-700'
                              : row.leaveInfo.status === 'Rejected' ? 'bg-red-100 text-red-700'
                              : row.leaveInfo.status === 'Cancelled' ? 'bg-gray-100 text-gray-600'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              On Leave — {row.leaveInfo.leave_type} 
                             </span>
                          </td>
                        </tr>
                      );

                      if (rowType === 'missing') return (
                        <tr key={row.id} className="bg-red-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-red-600">{formatDate(row.report_date)}</td>
                          <td colSpan="4" className="px-3 py-3 text-center">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">No Report Submitted</span>
                          </td>
                        </tr>
                      );

                      // submitted or worked_dayoff
                      return (
                        <tr key={row.id} className={`transition-colors ${rowType === 'worked_dayoff' ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(row.report_date)}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeWithSeconds(row.created_at)}</td>
                          <td className="px-3 py-4 text-sm text-gray-900 max-w-md break-words">{row.tasks_completed}</td>
                          <td className="px-3 py-4 text-sm text-gray-900 max-w-md break-words">{row.tasks_tomorrow}</td>
                          <td className="px-3 py-4 text-sm text-gray-900 max-w-xs break-words">
                            {row.issues || 'None'}
                            {rowType === 'worked_dayoff' && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Worked on Day Off</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}