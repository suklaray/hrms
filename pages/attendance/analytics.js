import { useState, useEffect, useCallback } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';
import Head from 'next/head';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area} from "recharts";
import { getUserFromToken } from "@/lib/getUserFromToken";
const formatTimeToAMPM = (timeString) => {
  if (!timeString) return '--:--';
  
    let date;
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      date = new Date(timeString);
    }
    
    if (isNaN(date.getTime())) return '--:--';
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  export async function getServerSideProps(context) {
    const { req } = context;
    const token = req?.cookies?.token || "";
    const user = getUserFromToken(token);
    if (!user || !["hr", "admin", "superadmin"].includes(user.role)) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    return {
      props: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
        },
      },
    };
  }

export default function AttendanceAnalytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/analytics?period=${period}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Attendance Analytics - HRMS</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        </Head>
        <div className="min-h-screen bg-gray-50 flex">
          <SideBar handleLogout={handleLogout} />
          <div className="flex-1 overflow-auto">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <i className="fas fa-chart-bar text-blue-600"></i>
                    Attendance Analytics
                  </h1>
                  <p className="text-gray-600">Comprehensive workforce attendance insights</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['today', 'month', 'year'].map((p) => (
                    <button
                      key={p}
                      className="px-3 md:px-4 py-2 rounded-lg capitalize bg-gray-100 text-gray-700 text-sm md:text-base"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Attendance Analytics - HRMS</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar handleLogout={handleLogout} />
        <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-chart-bar text-blue-600"></i>
                Attendance Analytics
              </h1>
              <p className="text-gray-600">Comprehensive workforce attendance insights</p>
            </div>
            <div className="flex flex-wrap gap-2 ">
              {['today', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 md:px-4 py-2 rounded-lg capitalize transition-colors text-sm md:text-base cursor-pointer ${
                    period === p 
                      ? 'bg-blue-600 text-white ' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 '
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Working Days"
              value={data?.workingDays || 0}
              subtitle={`in ${period}`}
              icon="fas fa-calendar-alt"
              color="bg-blue-100 text-blue-600"
            />
            <MetricCard
              title="Total Employees"
              value={data?.totalEmployees || 0}
              subtitle="considered in analysis"
              icon="fas fa-users"
              color="bg-green-100 text-green-600"
            />
            <MetricCard
              title="Average Attendance"
              value={`${data?.avgAttendance || 0}%`}
              subtitle="across company"
              icon="fas fa-check-circle"
              color="bg-purple-100 text-purple-600"
            />
            <MetricCard
              title="Absenteeism Rate"
              value={`${data?.absenteeismRate || 0}%`}
              subtitle="unplanned absences"
              icon="fas fa-times-circle"
              color="bg-red-100 text-red-600"
            />
          </div>

          {/* Time & Status Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center mb-3">
                <i className="fas fa-clock text-indigo-600 mr-2"></i>
                <h3 className="text-sm font-medium text-gray-700">Check-in/out Times</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg Check-in:</span>
                  <span className="text-sm font-bold text-green-600">{formatTimeToAMPM(data?.avgCheckinTime) || '--:--'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg Check-out:</span>
                  <span className="text-sm font-bold text-red-600">{formatTimeToAMPM(data?.avgCheckoutTime) || '--:--'}</span>
                </div>
              </div>
            </div>
            <MetricCard
              title="Avg Working Hours"
              value={`${data?.avgWorkingHours || 0}h`}
              subtitle="per employee"
              icon="fas fa-business-time"
              color="bg-orange-100 text-orange-600"
            />
            <MetricCard
              title="Leave Utilization"
              value={period === 'today' ? `${data?.totalLeaveDays || 0}` : `${data?.leaveUtilization || 0}`}
              subtitle={period === 'today' ? 'employees on leave today' : 'approved leave taken'}
              icon="fas fa-calendar-check"
              color="bg-teal-100 text-teal-600"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Dynamic Pie Chart */}
            <ChartCard title={`${period.charAt(0).toUpperCase() + period.slice(1)} Overview`} subtitle={`${period.charAt(0).toUpperCase() + period.slice(1)} attendance distribution`}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.yearlyPieData || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    fill="#8884d8"
                    label={false}
                  >
                    {(data?.yearlyPieData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#ef4444', '#f59e0b'][index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={50}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {value}: {entry.payload.value}%
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Trend Analysis */}
            <ChartCard title="Trend Analysis" subtitle="Attendance over time">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.trendData || []} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="period" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis 
                    fontSize={11}
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}${period === 'today' ? '' : '%'}`, period === 'today' ? 'Check-ins' : 'Attendance Rate']}
                    labelFormatter={(label) => `${getPeriodLabel(period)}: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name={period === 'today' ? 'Check-ins' : 'Attendance Rate'}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex items-center mb-2">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mr-3`}>
          <i className={`${icon} text-sm`}></i>
        </div>
        <h3 className="text-xs md:text-sm font-medium text-gray-700 leading-tight">{title}</h3>
      </div>
      <p className="text-lg md:text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-xs md:text-sm text-gray-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function getPeriodLabel(period) {
  if (period === 'year') return 'Months';
  if (period === 'month') return 'Weeks';
  return 'Hours';
}
