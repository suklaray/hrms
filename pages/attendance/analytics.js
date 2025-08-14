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

const dailyData = [
  { name: "Mon", Present: 30, Absent: 2 },
  { name: "Tue", Present: 28, Absent: 4 },
  { name: "Wed", Present: 32, Absent: 1 },
  { name: "Thu", Present: 31, Absent: 2 },
  { name: "Fri", Present: 29, Absent: 3 },
];

const monthlyStats = [
  { name: "Present", value: 580 },
  { name: "Absent", value: 20 },
];

const yearlyStats = [
  { name: "Present", value: 7200 },
  { name: "Absent", value: 300 },
];

const COLORS = ["#4ade80", "#f43f5e"];

export default function AttendanceAnalytics() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        <h2 className="text-3xl font-bold text-center text-indigo-700 mb-8">
          Attendance Analytics
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Employees" value="150" />
          <SummaryCard title="Working Today" value="138" />
          <SummaryCard title="On Sick Leave" value="5" />
          <SummaryCard title="Present Today" value="143" />
        </div>

        {/* Daily Bar Chart */}
        <div className="bg-white shadow-xl rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Daily Attendance (This Week)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Present" fill="#4ade80" />
              <Bar dataKey="Absent" fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Charts for Monthly & Yearly */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PieCard title="Monthly Attendance" data={monthlyStats} />
          <PieCard title="Yearly Attendance" data={yearlyStats} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-4 text-center">
      <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
      <p className="text-2xl font-bold text-indigo-700 mt-2">{value}</p>
    </div>
  );
}

function PieCard({ title, data }) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
