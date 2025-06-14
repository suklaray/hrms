import SideBar from '@/Components/SideBar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Jan', performance: 70 },
  { name: 'Feb', performance: 80 },
  { name: 'Mar', performance: 65 },
  { name: 'Apr', performance: 90 },
  { name: 'May', performance: 70 },
  { name: 'Jun', performance: 80 },
  { name: 'Jul', performance: 65 },
  { name: 'Aug', performance: 90 },
  { name: 'Sep', performance: 70 },
  { name: 'Oct', performance: 80 },
  { name: 'Nov', performance: 65 },
  { name: 'Dec', performance: 90 },
];

export default function Reports() {
  return (
    <div className="flex">
      <SideBar />
      <div className="w-full p-6 bg-white min-h-screen">
        <h1 className="text-2xl font-bold text-indigo-700 mb-6">Performance Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-indigo-50 p-4 rounded-lg shadow hover:shadow-md transition">
            <p className="text-sm text-gray-600">Top Performer</p>
            <p className="text-lg font-semibold text-indigo-700">Jane Smith</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg shadow hover:shadow-md transition">
            <p className="text-sm text-gray-600">Average Rating</p>
            <p className="text-lg font-semibold text-indigo-700">4.5</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg shadow hover:shadow-md transition">
            <p className="text-sm text-gray-600">Employees Reviewed</p>
            <p className="text-lg font-semibold text-indigo-700">15</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-50 p-6 rounded-xl shadow">
          <h2 className="text-lg font-bold text-purple-700 mb-4">Monthly Performance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="performance" fill="#6366f1" /> {/* Indigo-500 */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
