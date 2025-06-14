import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import { FaEye } from 'react-icons/fa';
import { useRouter } from "next/router";


export default function AttendanceTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch("/api/hr/attendance");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-100 text-indigo-700 text-xl font-semibold">
        Loading attendance data...
      </div>
    );
  }

  const handleViewClick = (empid) => {
    // Redirect the user to a new page with the empid in the URL
    router.push(`/hr/attendance/${empid}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 to-indigo-100 flex">
      {/* Sidebar */}
      <SideBar />
  
      {/* Main Content */}
      <div className="p-8 w-full">
        <h2 className="text-3xl font-bold mb-8 text-indigo-700 text-center">
          Logged In Employee Attendance
        </h2>
        <div className="overflow-x-auto shadow-lg rounded-xl">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider">🆔 Emp ID</th>
                <th className="px-6 py-3 text-left text-sm uppercase">Name</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Email</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Role</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Last Login</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Last Logout</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Total Time Spent</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Attendance</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> Status</th>
                <th className="px-6 py-3 text-left text-sm uppercase"> View Details</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {Array.isArray(data) && data.length > 0 ? (
                data.map((user, index) => {
                  const lastLogin = parseDate(user.last_login);
                  const lastLogout = parseDate(user.last_logout);
  
                  // Calculate the difference in minutes between last_login and last_logout
                  const totalTimeSpent = calculateTimeSpent(user.last_login, user.last_logout);
  
                  const attendanceStatus = totalTimeSpent >= 4 ? "Present" : "Absent";
                  const status = user.status;
  
                  return (
                    <tr
                      key={user.empid}
                      className={`border-b hover:bg-indigo-300 transition ${index % 2 === 0 ? "bg-indigo-100" : "bg-white"}`}
                    >
                      <td className="px-6 py-4 font-semibold">{user.empid}</td>
                      <td className="px-6 py-4">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4 capitalize">{user.role}</td>
                      <td className="px-6 py-4">{lastLogin}</td>
                      <td className="px-6 py-4">{lastLogout}</td>
                      <td className="px-6 py-4 font-mono">{totalTimeSpent} mins</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${attendanceStatus === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {attendanceStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${status === "Logged In" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewClick(user.empid)} // Click handler to navigate to the view page
                          className="text-blue-600 hover:text-blue-800 content-center"
                        >
                          <FaEye className="text-xl" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
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

// for Handle Invalid Dates
const parseDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
};

//  Calculate the difference between last_login and last_logout in hh:mm:ss format (positive value)
const calculateTimeSpent = (lastLogin, lastLogout) => {
  if (!lastLogin || !lastLogout) return "00:00:00";  

  const loginTime = new Date(lastLogin);
  const logoutTime = new Date(lastLogout);

  // If either time is invalid, return "Invalid Date"
  if (isNaN(loginTime.getTime()) || isNaN(logoutTime.getTime())) {
    return "Invalid Date";
  }

  const diffInMilliseconds = Math.abs(logoutTime - loginTime); // Get the absolute difference
  const totalSeconds = diffInMilliseconds / 1000;  // Convert milliseconds to seconds

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(totalSeconds / 3600);  // Total hours
  const minutes = Math.floor((totalSeconds % 3600) / 60);  // Total minutes after removing full hours
  const seconds = Math.floor(totalSeconds % 60);  // Remaining seconds after removing full minutes

  // Format as hh:mm:ss
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
