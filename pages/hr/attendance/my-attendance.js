import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import SideBar from '../../../Components/SideBar';

export default function MyAttendance() {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [user, setUser] = useState(null);

    const fetchAttendance = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`/api/hr/attendance/my-attendance?month=${currentMonth + 1}&year=${currentYear}`, {
                method: "GET",
                credentials: "include", 
            });
            
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setAttendance(data.attendance);
            } else {
                setError('Failed to fetch attendance');
            }
        } catch (err) {
            setError('Error fetching attendance');
        } finally {
            setLoading(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getWorkingDaysUpToToday = (month, year) => {
        const today = new Date();
        const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
        const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();
        
        let workingDays = 0;
        for (let day = 1; day <= lastDay; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
        }
        return workingDays;
    };

    const getTotalWorkingDaysInMonth = (month, year) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
        }
        return workingDays;
    };

    const formatTime = (timeString) => {
        if (!timeString) return '--';
        return new Date(timeString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const presentDays = attendance.filter(record => record.attendance_status === 'Present').length;
    const totalWorkingDaysUpToToday = getWorkingDaysUpToToday(currentMonth, currentYear);
    const totalWorkingDaysInMonth = getTotalWorkingDaysInMonth(currentMonth, currentYear);
    const absentDays = totalWorkingDaysUpToToday - presentDays;

    return (
        <>
            <Head>
                <title>My Attendance - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gray-50">
                <SideBar />
                <div className="flex-1 p-6">
                    {/* Header with user info */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Calendar className="h-8 w-8 text-blue-600" />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
                                    <p className="text-gray-600">
                                        {user ? `${user.name} (${user.email}) - ${user.role}` : 'Loading user info...'}
                                    </p>
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
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center">
                                <Calendar className="h-8 w-8 text-blue-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Days ({monthNames[currentMonth]})</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalWorkingDaysInMonth}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Present Days</p>
                                    <p className="text-2xl font-bold text-gray-900">{presentDays}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center">
                                <XCircle className="h-8 w-8 text-red-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Absent Days</p>
                                    <p className="text-2xl font-bold text-gray-900">{absentDays}</p>
                                </div>
                            </div>
                        </div>

                        
                        
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center">
                                <Clock className="h-8 w-8 text-purple-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {error ? 'Unable to load' : (totalWorkingDaysUpToToday > 0 ? `${Math.round((presentDays / totalWorkingDaysUpToToday) * 100)}%` : 'No data')}
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Check In</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Check In</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Check Out</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Status</th>
                                        </tr>
                                    </thead>

                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {attendance.length > 0 ? (
                                            attendance.map((record, index) => {
                                                const totalHours = record.total_hours ? Number(record.total_hours) : 0;
                                                const loginStatus = record.check_in ? (record.check_out ? 'Logged Out' : 'Logged In') : 'No Login';
                                                const attendanceStatus = record.attendance_status || 'Absent';
                                                
                                                return (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.date}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.first_check_in || '--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.last_check_in || '--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.check_out || '--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {record.total_hours || '--'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                record.login_status === 'Logged Out' ? 'bg-gray-100 text-gray-800' :
                                                                record.login_status === 'Logged In' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {record.login_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                record.attendance_status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {record.attendance_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                    No attendance records found for {monthNames[currentMonth]} {currentYear}
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
        </>
    );
}
