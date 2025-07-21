import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Sidebar({ handleLogout }) {
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false); 
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Register New Employee", path: "/registerEmployee" },
    { name: "View Employees Details", path: "/employeeList" },
    { name: "Recruitment Management", path: "/Recruitment/recruitment" },
  ];

  const attendanceSubItems = [
    { name: "Attendance", path: "/hr/attendance" },
    { name: "Leave Management", path: "/hr/view-leave-requests" },
    { name: "Attendance Analytics", path: "/attendance/analytics" },
  ];

  const payrollSubItems = [
    { name: "View Payrolls", path: "/hr/payroll/payroll-view" },
    { name: "Generate Payroll", path: "/hr/payroll/generate" },
  ];

  const performanceSubItems = [
    { name: "Goal Setting", path: "/hr/performance/goals" },
    { name: "Report Apraisal", path: "/hr/performance/reports" },
  ];

  const complianceSubItems = [
    { name: "Employee Compliance", path: "/compliance/empCompliance" },
    { name: "Statutory Compliance", path: "/compliance/statutoryCompliance" },
    { name: "Document Center", path: "/compliance/documentCenter" },
    { name: "Policy Acknowledgements", path: "/compliance/policyAcknowledge" },
    { name: "Audit Logs", path: "/compliance/auditLog" },
    { name: "Reports & Filings", path: "/compliance/ReportFillings" },
  ];

  return (
    <div className="min-h-screen w-72 bg-gray-900 text-white p-6 shadow-lg">
      <h2 className="text-3xl font-bold mb-8">HRMS Panel</h2>
      <ul className="space-y-4">
        {navItems.map((item) => (
          <li key={item.name}>
            <Link href={item.path}>
              <span className="block w-full text-left px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer">
                {item.name}
              </span>
            </Link>
          </li>
        ))}

        {/* Attendance Dropdown */}
        <li>
          <button
            onClick={() => setAttendanceOpen(!attendanceOpen)}
            className="w-full text-left flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
          >
            <span>Attendance & Leave Management</span>
            {attendanceOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {attendanceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {attendanceSubItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link href={subItem.path}>
                    <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                      {subItem.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Payroll Dropdown */}
        <li>
          <button
            onClick={() => setPayrollOpen(!payrollOpen)}
            className="w-full text-left flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
          >
            <span>Payroll Management</span>
            {payrollOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {payrollOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {payrollSubItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link href={subItem.path}>
                    <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                      {subItem.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Compliance Management */}
        <li>
          <button
            onClick={() => setComplianceOpen(!complianceOpen)}
            className="w-full text-left flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
          >
            <span>Compliance Management</span>
            {complianceOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {complianceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {complianceSubItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link href={subItem.path}>
                    <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                      {subItem.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Performance Management */}
        <li>
          <button
            onClick={() => setPerformanceOpen(!performanceOpen)}
            className="w-full text-left flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
          >
            <span>Performance Management</span>
            {performanceOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {performanceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {performanceSubItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link href={subItem.path}>
                    <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                      {subItem.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>

        {/* Customer Connect */}
        <li>
          <Link href="/customer-connect">
            <span className="block w-full text-left px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer">
              Customer Connect
            </span>
          </Link>
        </li>

        {/* Settings Dropdown */}
        <li>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full text-left flex justify-between items-center px-4 py-3 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
          >
            <span>Settings</span>
            {settingsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {settingsOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              <li>
                <Link href="/settings/profile">
                  <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                    Profile
                  </span>
                </Link>
              </li>
            </ul>
          )}
        </li>

        {/* Logout */}
        <li>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 bg-red-600 hover:bg-red-700 transition rounded-lg mt-6 cursor-pointer"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
}
