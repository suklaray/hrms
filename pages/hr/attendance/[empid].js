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

  // Function to calculate total days up to today in the current month
  const calculateTotalDaysUpToToday = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate the difference in days between today and the start of the month
    const diffTime = today - startOfMonth;
    return Math.ceil(diffTime / (1000 * 3600 * 24)) + 1; // Adding 1 to include today
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-100 text-indigo-700 text-xl font-semibold">
        Loading attendance details...
      </div>
    );
  }

  // Calculation of absent days based on total days up to today and present days
  const totalDaysUpToToday = calculateTotalDaysUpToToday();
  const presentDays = employeeData?.daysPresent || 0;
  const absentDays = totalDaysUpToToday - presentDays;

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 to-indigo-100 flex">
      <SideBar />
      <div className="p-8 w-full">
        <h2 className="text-3xl font-bold mb-8 text-indigo-700 text-center">
          Attendance Details for Employee {empid}
        </h2>

        {/* Display Employee Summary */}
        <div className="mb-6 p-4 border border-indigo-300 rounded-md bg-indigo-50">
          <p><strong>Name:</strong> {employeeData?.name || "N/A"}</p>
          <p><strong>Email:</strong> {employeeData?.email || "N/A"}</p>
          <p><strong>Days Present:</strong> {presentDays}</p>
          <p><strong>Days Absent:</strong> {absentDays}</p>
        </div>

        <div className="overflow-x-auto shadow-lg rounded-xl">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-sm uppercase">Login Time</th>
                <th className="px-6 py-3 text-left text-sm uppercase">Logout Time</th>
                <th className="px-6 py-3 text-left text-sm uppercase">Total Time</th>
                <th className="px-6 py-3 text-left text-sm uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {attendanceData.length > 0 ? (
                attendanceData.map((attendance, index) => {
                  const loginTime = attendance.check_in || "N/A";
                  const logoutTime = attendance.check_out || "N/A";
                  const totalTime = attendance.total_hours ? `${attendance.total_hours} ` : "N/A";
                  const status = totalTime !== "N/A" && attendance.total_hours >= 240 ? "Present" : "Absent";

                  return (
                    <tr key={attendance.date} className={`border-b hover:bg-indigo-300 transition ${index % 2 === 0 ? "bg-indigo-100" : "bg-white"}`}>
                      <td className="px-6 py-4">{attendance.date}</td>
                      <td className="px-6 py-4">{loginTime}</td>
                      <td className="px-6 py-4">{logoutTime}</td>
                      <td className="px-6 py-4">{totalTime}</td>
                      <td className="px-6 py-4">{status}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
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
