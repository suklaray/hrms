import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { FaEye } from "react-icons/fa";
import { useRouter } from "next/router";

export default function AttendanceList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/hr/attendance")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching attendance:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
        <SideBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-indigo-700 text-xl font-semibold">
            Loading attendance data...
          </div>
        </div>
      </div>
    );
  }

  const handleViewClick = (empid) => {
    router.push(`/hr/attendance/${empid}`);
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-200 via-white to-purple-200">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 p-6">
        <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Employee Attendance</h2>
          <table className="min-w-full divide-y divide-indigo-300 rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white uppercase">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-left">Emp ID</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Name</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Role</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Last Login</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Last Logout</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Time Spent</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Attendance</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.isArray(data) && data.length > 0 ? (
                data.map((user, index) => (
                    <tr key={user.empid} className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}>
                      <td className="px-4 py-2">{user.empid}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{user.name}</td>
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2 uppercase">{user.role}</td>
                      <td className="px-4 py-2">{user.last_login}</td>
                      <td className="px-4 py-2">{user.last_logout}</td>
                      <td className="px-4 py-2 font-mono">{user.total_hours}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.attendance_status === "Present"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.attendance_status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.status === "Logged In"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleViewClick(user.empid)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-full"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center text-gray-500 py-6">
                    No attendance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

