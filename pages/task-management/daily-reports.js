// pages/task-management/daily-reports.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Calendar,
} from "lucide-react";

export default function DailyReports() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [allEmployeeReports, setAllEmployeeReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [userRole, setUserRole] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [openTask, setOpenTask] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      setUser(userData.user);

      if (!["hr", "admin", "superadmin"].includes(userData.user?.role)) {
        router.push("/task-management/user-task");
        return;
      }
      setUserRole(userData.user?.role);
      const [reportsRes, usersRes, positionsRes] = await Promise.all([
        fetch("/api/hr/all-work-reports"),
        fetch("/api/hr/employees"),
        fetch("/api/settings/positions"),
      ]);

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setAllEmployeeReports(Array.isArray(reportsData) ? reportsData : []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setEmployees(
          Array.isArray(usersData.employees) ? usersData.employees : [],
        );
      }

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setPositions(Array.isArray(positionsData) ? positionsData : []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };
  const getRoleOptions = () => {
    switch (userRole) {
      case "hr":
        return [{ value: "employee", label: "Employee" }];
      case "admin":
        return [
          { value: "hr", label: "HR" },
          { value: "employee", label: "Employee" },
        ];
      case "superadmin":
        return [
          { value: "employee", label: "Employee" },
          { value: "hr", label: "HR" },
          { value: "admin", label: "Admin" },
          { value: "superadmin", label: "Superadmin" },
        ];
      default:
        return [{ value: "employee", label: "Employee" }];
    }
  };
  /* ================= FILTER LOGIC ================= */

  const filteredReports = (() => {
  const results = [];

  const start = new Date(fromDate);
  const end = new Date(toDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const dateList = [];
  const tempDate = new Date(start);

  /* GENERATE ALL DATES BETWEEN FROM & TO */

  while (tempDate <= end) {
  const day = tempDate.getDay();

  // Skip Sunday (0) and Saturday (6)
  if (day !== 0 && day !== 6) {
    dateList.push(new Date(tempDate));
  }

  tempDate.setDate(tempDate.getDate() + 1);
}

  employees.forEach((emp) => {
    /* APPLY EMPLOYEE FILTER */

    if (
      employeeFilter &&
      !emp.name?.toLowerCase().includes(employeeFilter.toLowerCase())
    ) {
      return;
    }

    if (selectedRole && emp.role !== selectedRole) return;

    if (selectedPosition && emp.position !== selectedPosition) return;

    /* LOOP EVERY DATE */

    dateList.forEach((date) => {
      const dateStr = date.toLocaleDateString("en-CA");

      const report = allEmployeeReports.find((rep) => {
        const reportDate = new Date(rep.report_date).toLocaleDateString("en-CA");

        return rep.user?.empid === emp.empid && reportDate === dateStr;
      });

      if (report) {
        results.push(report);
      } else {
        results.push({
          id: `missing-${emp.empid}-${dateStr}`,
          report_date: dateStr,
          created_at: null,
          tasks_completed: "No data found",
          tasks_tomorrow: "No data found",
          issues: "No data found",
          user: emp,
        });
      }
    });
  });

 return results.sort((a, b) => {
  const dateA = new Date(a.report_date);
  const dateB = new Date(b.report_date);

  // 1️⃣ Sort by date first
  if (dateA.getTime() !== dateB.getTime()) {
    return dateA - dateB;
  }

  // 2️⃣ Submitted first
  const submittedA = !!a.created_at;
  const submittedB = !!b.created_at;

  if (submittedA !== submittedB) {
    return submittedB - submittedA;
  }

  // 3️⃣ Sort by employee name
  return (a.user?.name || "").localeCompare(b.user?.name || "");
});
})();

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedReports = filteredReports.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="w-64 bg-white"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Daily Reports</title>
      </Head>

      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} user={user} />

        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b px-6 py-4">
            <h1 className="text-2xl font-bold">Employee Daily Reports</h1>
          </div>

          <div className="p-6">
            {/* FILTERS */}

            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>From</span>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border px-3 py-2 rounded-lg text-gray-700"
                  />

                  <span>to</span>

                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border px-3 py-2 rounded-lg text-gray-700"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Employee name..."
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="border px-3 py-2 rounded-lg text-gray-700"
                />

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="border px-3 py-2 rounded-lg text-gray-700"
                >
                  <option value="">All Roles</option>
                  {getRoleOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="border px-3 py-2 rounded-lg text-gray-700"
                >
                  <option value="">All Positions</option>

                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.position_name}>
                      {pos.position_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setEmployeeFilter("");
                    setSelectedRole("");
                    setSelectedPosition("");
                    setFromDate(new Date().toISOString().split("T")[0]);
                    setToDate(new Date().toISOString().split("T")[0]);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* TABLE */}

            <div className="bg-white rounded-xl shadow-md overflow-x-scroll">
              {paginatedReports.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No reports found</h3>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-xs uppercase">
                    <tr className="border-b">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">TimeStamp</th>
                      <th className="px-4 py-3">Tasks Done</th>
                      <th className="px-4 py-3">Tomorrow</th>
                      <th className="px-4 py-3">Issues</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {paginatedReports.map((report) => {
                      const employee = employees.find(
                        (emp) => emp.empid === report.user?.empid,
                      );

                      return (
                        <tr
                          key={report.id}
                          className={!report.created_at ? "bg-red-50" : ""}
                        >
                          <td className="px-4 py-3 font-medium">
                            {report.user?.name}
                          </td>

                          <td className="px-4 py-3">
                            {employee?.position || "N/A"}
                          </td>

                          <td className="px-4 py-3">{report.user?.role}</td>

                          <td className="px-4 py-3">
                            {report.report_date
                              ? new Date(
                                  report.report_date,
                                ).toLocaleDateString()
                              : "Not Submitted"}
                          </td>

                          {
                            report.created_at ? (
                            <>
                            <td className="px-4 py-3">
                            {report.created_at
                              ? new Date(report.created_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second:"2-digit",
                                    hour12: true,
                                  },
                                )
                              : "No data found, for this time period"}
                          </td>

                          <td className="px-4 py-3">
                            <div
                              className="max-w-[250px] truncate cursor-pointer hover:underline"
                              onClick={() =>
                                setOpenTask(report.tasks_completed)
                              }
                            >
                              {report.tasks_completed}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="max-w-[250px] truncate cursor-pointer hover:underline"
                              onClick={() => setOpenTask(report.tasks_tomorrow)}
                            >
                              {report.tasks_tomorrow}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="max-w-[250px] truncate cursor-pointer hover:underline"
                              onClick={() => setOpenTask(report.issues)}
                            >
                              {report.issues || "None"}
                            </div>
                          </td>
                          </>
                          ):(
                            <td colSpan={4} className="px-4 py-3 text-center">No Data Found</td>
                          )
                          }

                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                router.push(
                                  `/task-management/employee-reports/${report.user?.empid}`,
                                )
                              }
                              className="text-blue-600"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <ChevronLeft />
                </button>

                <span>
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                >
                  <ChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {openTask && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg w-[500px] max-h-[400px] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">Completed Task</h2>

            <p className="text-gray-700 whitespace-pre-wrap">{openTask}</p>

            <div className="mt-6 text-right">
              <button
                onClick={() => setOpenTask(null)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
