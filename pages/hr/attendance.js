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

  return (
    <div className="flex">
      <SideBar />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          Employee Attendance List
        </h1>
        {loading ? (
          <p>Loading...</p>
        ) : data.length === 0 ? (
          <p>No data found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 ">Employee ID</th>
                  <th className="py-3 px-4 ">Name</th>
                  <th className="py-3 px-4 ">Email</th>
                  <th className="py-3 px-4 ">Role</th>
                  <th className="py-3 px-4 ">Last Login</th>
                  <th className="py-3 px-4 ">Last Logout</th>
                  <th className="py-3 px-4 ">Total Time Spent</th>
                  <th className="py-3 px-4 ">Attendance</th>
                  <th className="py-3 px-4 ">Status</th>
                  <th className="py-3 px-4 ">View</th>
                </tr>
              </thead>
              <tbody>
                {data.map((emp, idx) => (
                  <tr
                    key={idx}
                    className={`text-center transition-all ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-100"
                    } hover:bg-blue-100`}
                  >
                    <td className="py-2 px-4">
                      {emp.last_login
                        ? new Date(emp.last_login).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-2 px-4 ">{emp.empid}</td>
                    <td className="py-2 px-4 ">{emp.name}</td>
                    <td className="py-2 px-4 ">{emp.email}</td>
                    <td className="py-2 px-4 ">{emp.role}</td>
                    <td className="py-2 px-4 ">{emp.last_login}</td>
                    <td className="py-2 px-4 ">
                      {emp.last_logout || "N/A"}
                    </td>
                    <td className="py-2 px-4 ">{emp.total_hours}</td>
                    <td className="py-2 px-4  font-semibold text-sm">
                      {emp.attendance_status === "Present" ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Present
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 ">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          emp.status === "Logged In"
                            ? "bg-green-100 text-green-800"
                            : emp.status === "Logged Out"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 ">
                      <FaEye
                        className="text-blue-600 hover:text-blue-800 cursor-pointer inline"
                        onClick={() => router.push(`/hr/attendance/${emp.empid}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
