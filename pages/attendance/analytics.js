import SideBar from "@/Components/SideBar";
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

const COLORS = ["#4ade80", "#f43f5e"]; // green, red

export default function AttendanceAnalytics() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 via-purple-100 to-white flex">
      <SideBar />
      <div className="flex-1 p-6 md:p-10">
        <h2 className="text-4xl font-bold text-center text-indigo-700 mb-10">
          Attendance Analytics
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <SummaryCard title="Total Employees" value="150" />
          <SummaryCard title="Working Today" value="138" />
          <SummaryCard title="On Sick Leave" value="5" />
          <SummaryCard title="Present Today" value="143" />
        </div>

        {/* Daily Bar Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-10">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <PieCard title="Monthly Attendance" data={monthlyStats} />
          <PieCard title="Yearly Attendance" data={yearlyStats} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-center">
      <h4 className="text-md font-semibold text-gray-600">{title}</h4>
      <p className="text-2xl font-bold text-indigo-700 mt-2">{value}</p>
    </div>
  );
}

function PieCard({ title, data }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
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
