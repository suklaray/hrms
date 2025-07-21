import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";

const ViewAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const router = useRouter();
  const { empid } = router.query;

  useEffect(() => {
    if (empid) {
      const fetchAttendance = async () => {
        try {
          const res = await fetch(`/api/hr/attendance/${empid}`);
          const json = await res.json();
          setEmployeeData(json.employee);
          setAttendanceData(json.attendance);
        } catch (error) {
          console.error("Error fetching attendance details:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchAttendance();
    }
  }, [empid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-100 text-indigo-700 text-xl font-semibold">
        Loading attendance details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 to-indigo-100 flex">
      <SideBar />
      <div className="p-8 w-full">
        <h2 className="text-3xl font-bold mb-8 text-indigo-700 text-center">
          Attendance Details for Employee {empid}
        </h2>

        {/* Employee Summary */}
        <div className="mb-6 p-4 border border-indigo-300 rounded-md bg-indigo-50">
          <p><strong>Name:</strong> {employeeData?.name || "N/A"}</p>
          <p><strong>Email:</strong> {employeeData?.email || "N/A"}</p>
          <p><strong>Total Days (Till Today):</strong> {employeeData?.totalDays || 0}</p>
          <p><strong>Days Present:</strong> {employeeData?.daysPresent || 0}</p>
          <p><strong>Days Absent:</strong> {employeeData?.daysAbsent || 0}</p>
        </div>

        <div className="overflow-x-auto shadow-lg rounded-xl">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Login Time</th>
                <th className="border px-4 py-2">Logout Time</th>
                <th className="border px-4 py-2">Total Time</th>
                <th className="border px-4 py-2">Login Status</th>
                <th className="border px-4 py-2">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {attendanceData.length > 0 ? (
                attendanceData.map((attendance, index) => (
                  <tr
                    key={attendance.date}
                    className={`border-b hover:bg-indigo-300 transition ${
                      index % 2 === 0 ? "bg-indigo-100" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-4">{attendance.date}</td>
                    <td className="px-6 py-4">{attendance.check_in || "N/A"}</td>
                    <td className="px-6 py-4">{attendance.check_out || "N/A"}</td>
                    <td className="px-6 py-4">{attendance.total_hours || "N/A"}</td>
                    <td className="px-6 py-4">{attendance.login_status || "N/A"}</td>
                    <td className="px-6 py-4">{attendance.attendance_status || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No attendance data available for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewAttendance;
