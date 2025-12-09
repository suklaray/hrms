import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import Sidebar from '../../Components/empSidebar';

export default function EmployeeAttendance() {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/employee/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setError('Failed to fetch user data');
      }
    } catch (err) {
      setError('Error loading user data');
    }
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar/yearly-events?year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        const holidayList = [];
        Object.keys(data.events || {}).forEach(month => {
          data.events[month].forEach(event => {
            if (event.type === 'holiday') {
              holidayList.push(event);
            }
          });
        });
        setHolidays(holidayList);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);


  const downloadHolidaysPDF = () => {
    if (holidays.length === 0) {
      alert('No holidays found for this year');
      return;
    }
    
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.text(`Holidays ${currentYear}`, 20, 20);
      
      let yPosition = 40;
      holidays.forEach((holiday) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`${holiday.date} - ${holiday.title}`, 20, yPosition);
        yPosition += 10;
      });
      
      doc.save(`holidays-${currentYear}.pdf`);
    });
  };

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/employee/attendance?month=${currentMonth + 1}&year=${currentYear}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Attendance response:', data.attendance);
        setAttendance(data.attendance || []);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to fetch attendance records');
      }
    } catch (err) {
      setError('Network error while fetching attendance');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, fetchAttendance]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatTime = (timeString) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };
// Get working days of selected month
const getWorkingDays = () => {
  const days = [];
  const start = new Date(currentYear, currentMonth, 1);
  const end = new Date(currentYear, currentMonth + 1, 0);

  const today = new Date();

  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);

    // ⛔ If month == current month AND day > today → skip it
    if (
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear() &&
      day > today
    ) {
      continue;
    }

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    const formatted = day.toISOString().slice(0, 10).split("-").reverse().join("-");
    const isHoliday = holidays.some(h => h.date === formatted);

    if (!isWeekend && !isHoliday) {
      days.push(formatted);
    }
  }

  return days;
};

const workingDays = getWorkingDays();

// Count Present
const presentDays = attendance.filter(rec => rec.attendance_status === "Present").length;

// Absent Days = Working Days - Present Days
const absentDays = workingDays.length - presentDays;

// Attendance Rate
const attendanceRate = workingDays.length > 0 
  ? Math.round((presentDays / workingDays.length) * 100)
  : 0;

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Attendance - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
                  <p className="text-gray-600">View your monthly attendance records</p>
                </div>
              </div>
              
              {/* Month/Year Selector */}
              <div className="flex items-center space-x-4">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[2023, 2024, 2025].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <button
                    onClick={downloadHolidaysPDF}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium cursor-pointer">
                    Holiday List PDF
                  </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present Days</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {error ? 'Unable to load' : (presentDays || 'No records')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Absent Days</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {error ? 'Unable to load' : (absentDays || 'No records')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {error ? 'Unable to load' : (`${attendanceRate}%` || 'No data')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Monthly Attendance Summary - {monthNames[currentMonth]} {currentYear}
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading attendance records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(attendance) && attendance.length > 0 ? (
                      attendance.map((record, index) => {
                        // Parse dd-MM-yyyy format to get month
                        const dateParts = record.date.split('-');
                        const monthIndex = parseInt(dateParts[1]) - 1;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {monthNames[monthIndex]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.check_in || '--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.check_out || '--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.total_hours || '--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record.attendance_status === 'Present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.attendance_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          {error ? (
                            <div>
                              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                              <p>Unable to load attendance records</p>
                              <button 
                                onClick={fetchAttendance}
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                Try Again
                              </button>
                            </div>
                          ) : (
                            <div>
                              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p>No attendance records found for {monthNames[currentMonth]} {currentYear}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}