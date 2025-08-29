import { useState, useEffect } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import { withRoleProtection } from "@/lib/withRoleProtection";
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, TrendingUp, 
  BarChart3, PieChart as PieChartIcon, Activity, Target
} from "lucide-react";

export const getServerSideProps = withRoleProtection(["hr", "admin", "superadmin"]);

export default function AttendanceAnalytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/attendance/analytics?period=${period}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Attendance Analytics</h1>
              <p className="text-gray-600">Comprehensive workforce attendance insights</p>
            </div>
            <div className="flex space-x-2">
              {['month', 'quarter', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    period === p 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Working Days"
              value={data?.workingDays || 0}
              subtitle={`in ${period}`}
              icon={<Calendar className="w-5 h-5" />}
              color="bg-blue-100 text-blue-600"
            />
            <MetricCard
              title="Total Employees"
              value={data?.totalEmployees || 0}
              subtitle="considered in analysis"
              icon={<Users className="w-5 h-5" />}
              color="bg-green-100 text-green-600"
            />
            <MetricCard
              title="Average Attendance"
              value={`${data?.avgAttendance || 0}%`}
              subtitle="across company"
              icon={<CheckCircle className="w-5 h-5" />}
              color="bg-purple-100 text-purple-600"
            />
            <MetricCard
              title="Absenteeism Rate"
              value={`${data?.absenteeismRate || 0}%`}
              subtitle="unplanned absences"
              icon={<XCircle className="w-5 h-5" />}
              color="bg-red-100 text-red-600"
            />
          </div>

          {/* Time & Status Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-700">Check-in/out Times</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Avg Check-in:</span>
                  <span className="text-sm font-semibold">{data?.avgCheckinTime || '--:--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Avg Check-out:</span>
                  <span className="text-sm font-semibold">{data?.avgCheckoutTime || '--:--'}</span>
                </div>
              </div>
            </div>
            <MetricCard
              title="Avg Working Hours"
              value={`${data?.avgWorkingHours || 0}h`}
              subtitle="per employee"
              icon={<Activity className="w-5 h-5" />}
              color="bg-orange-100 text-orange-600"
            />
            <MetricCard
              title="Leave Utilization"
              value={`${data?.leaveUtilization || 0}%`}
              subtitle="approved leave taken"
              icon={<Target className="w-5 h-5" />}
              color="bg-teal-100 text-teal-600"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Yearly Pie Chart */}
            <ChartCard title="Yearly Overview" subtitle="Annual attendance distribution">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data?.yearlyPieData || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                  >
                    {(data?.yearlyPieData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b'][index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Trend Analysis */}
            <ChartCard title="Trend Analysis" subtitle="Attendance over time">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data?.trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="period" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                  <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex items-center mb-2">
        <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mr-3`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
