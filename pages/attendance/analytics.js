import { useState, useEffect } from "react";
import SideBar from "@/Components/SideBar";
import { useRouter } from 'next/router';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { withRoleProtection } from "@/lib/withRoleProtection";
import { FaUsers, FaCheckCircle, FaTimesCircle, FaCalendarAlt } from "react-icons/fa";

export const getServerSideProps = withRoleProtection(["hr", "admin", "superadmin"]);

const COLORS = ["#8b5cf6", "#6366f1"]; // purple, indigo

export default function AttendanceAnalytics({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/hr/attendance-analytics");
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white flex">
      <SideBar user={user} handleLogout={handleLogout} />
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Attendance Analytics
            </h2>
            <p className="text-gray-600 text-lg">Real-time insights into your workforce attendance</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <SummaryCard 
              title="Total Employees" 
              value={data?.summary?.totalEmployees || 0}
              icon={<FaUsers />}
              gradient="from-purple-500 to-purple-600"
              bgColor="bg-purple-50"
            />
            <SummaryCard 
              title="Present Today" 
              value={data?.summary?.presentToday || 0}
              icon={<FaCheckCircle />}
              gradient="from-green-500 to-green-600"
              bgColor="bg-green-50"
            />
            <SummaryCard 
              title="On Leave" 
              value={data?.summary?.onLeave || 0}
              icon={<FaCalendarAlt />}
              gradient="from-blue-500 to-blue-600"
              bgColor="bg-blue-50"
            />
            <SummaryCard 
              title="Absent Today" 
              value={data?.summary?.absentToday || 0}
              icon={<FaTimesCircle />}
              gradient="from-red-500 to-red-600"
              bgColor="bg-red-50"
            />
          </div>

          {/* Weekly Bar Chart */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full mr-4"></div>
              <h3 className="text-2xl font-bold text-gray-800">
                Weekly Attendance Overview
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data?.weeklyData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="Present" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Absent" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Charts for Monthly & Yearly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PieCard title="Monthly Attendance" data={data?.monthlyStats || []} />
            <PieCard title="Yearly Attendance" data={data?.yearlyStats || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, gradient, bgColor }) {
  return (
    <div className={`${bgColor} rounded-2xl shadow-lg p-6 text-center transform hover:scale-105 hover:shadow-xl transition-all duration-300 border border-gray-100`}>
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${gradient} text-white text-xl mb-4`}>
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function PieCard({ title, data }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full mr-3"></div>
        <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#374151', fontWeight: '500' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
