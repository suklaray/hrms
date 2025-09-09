import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import {
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  LayoutDashboard,
  UserPlus,
  Users,
  UserCheck,
  Clock,
  DollarSign,
  Shield,
  TrendingUp,
  Phone,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar({ handleLogout, user }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const role = user?.role?.toLowerCase() || "hr";

  const toggleAttendanceMenu = () => setAttendanceOpen(!attendanceOpen);
  const togglePayrollMenu = () => setPayrollOpen(!payrollOpen);
  const toggleComplianceMenu = () => setComplianceOpen(!complianceOpen);
  const togglePerformanceMenu = () => setPerformanceOpen(!performanceOpen);
  const toggleSettingsMenu = () => setSettingsOpen(!settingsOpen);
  const toggleEmployeeMenu = () => setEmployeeOpen(!employeeOpen);
  const hoverColor =
    role === "superadmin"
      ? "hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600"
      : role === "admin"
      ? "hover:bg-purple-600"
      : "hover:bg-blue-600"; // hr

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Recruitment", path: "/Recruitment/recruitment", icon: UserCheck },
  ];

  const employeeSubItems = [
    { name: "Register Employee", path: "/registerEmployee" },
    { name: "Employees List", path: "/employeeList" },
  ];

  const attendanceSubItems = [
    { name: "Attendance", path: "/hr/attendance" },
    { name: "Leave Management", path: "/hr/view-leave-requests" },
    ...(role === "hr"
      ? [{ name: "My Leave Requests", path: "/hr/leave-request" }]
      : []),
    { name: "Attendance Analytics", path: "/attendance/analytics" },
  ];

  const payrollSubItems = [
    { name: "View Payrolls", path: "/hr/payroll/payroll-view" },
    { name: "Generate Payroll", path: "/hr/payroll/generate" },
  ];

  /*const performanceSubItems = [
    { name: "Goal Setting", path: "/hr/performance/goals" },
    { name: "Report Apraisal", path: "/hr/performance/reports" },
  ];*/

  const complianceSubItems = [
    { name: "Employee Compliance", path: "/compliance/empCompliance" },
    //{ name: "Statutory Compliance", path: "/compliance/statutoryCompliance" },
    { name: "Document Center", path: "/compliance/documentCenter" },
    //{ name: "Policy Acknowledgements", path: "/compliance/policyAcknowledge" },
    //{ name: "Audit Logs", path: "/compliance/auditLog" },
    //{ name: "Reports & Filings", path: "/compliance/ReportFillings" },
  ];

  return (
    <div
      className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-72"
      } ${isMobile && !isCollapsed ? "absolute z-50 h-full" : ""}`}
    >
      {/* Header with Toggle and Notifications */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && <h2 className="text-2xl font-bold">HRMS Panel</h2>}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              {isCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <ul className="space-y-4">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.path}>
                  <div
                    className="w-full text-left px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer flex items-center gap-3"
                    title={isCollapsed ? item.name : ""}
                  >
                    <IconComponent size={18} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}

          {/* Employee Management Dropdown */}
          <li>
            <button
              onClick={
                isCollapsed
                  ? () => router.push("/employeeList")
                  : toggleEmployeeMenu
              }
              className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              title={isCollapsed ? "Employee Management" : ""}
            >
              <div className="flex items-center gap-3">
                <Users size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Employee Management
                  </span>
                )}
              </div>
              {!isCollapsed &&
                (employeeOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && employeeOpen && (
              <ul className="pl-6 pt-2 space-y-2">
                {employeeSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 bg-gray-700 rounded-lg ${hoverColor.replace(
                          "600",
                          "500"
                        )} transition cursor-pointer`}
                      >
                        {subItem.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* Attendance Dropdown */}
          <li>
            <button
              onClick={
                isCollapsed
                  ? () => router.push("/hr/attendance")
                  : toggleAttendanceMenu
              }
              className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              title={isCollapsed ? "Attendance & Leave" : ""}
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Attendance & Leave
                  </span>
                )}
              </div>
              {!isCollapsed &&
                (attendanceOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && attendanceOpen && (
              <ul className="pl-6 pt-2 space-y-2">
                {attendanceSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 bg-gray-700 rounded-lg ${hoverColor.replace(
                          "600",
                          "500"
                        )} transition cursor-pointer`}
                      >
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
              onClick={
                isCollapsed
                  ? () => router.push("/hr/payroll/payroll-view")
                  : togglePayrollMenu
              }
              className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              title={isCollapsed ? "Payroll Management" : ""}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Payroll Management
                  </span>
                )}
              </div>
              {!isCollapsed &&
                (payrollOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && payrollOpen && (
              <ul className="pl-6 pt-2 space-y-2">
                {payrollSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 bg-gray-700 rounded-lg ${hoverColor.replace(
                          "600",
                          "500"
                        )} transition cursor-pointer`}
                      >
                        {subItem.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* Compliance Dropdown */}
          <li>
            <button
              onClick={
                isCollapsed
                  ? () => router.push("/compliance/empCompliance")
                  : toggleComplianceMenu
              }
              className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              title={isCollapsed ? "Compliance Management" : ""}
            >
              <div className="flex items-center gap-3">
                <Shield size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Compliance</span>
                )}
              </div>
              {!isCollapsed &&
                (complianceOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && complianceOpen && (
              <ul className="pl-6 pt-2 space-y-2">
                {complianceSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 bg-gray-700 rounded-lg ${hoverColor.replace(
                          "600",
                          "500"
                        )} transition cursor-pointer`}
                      >
                        {subItem.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* {/* Performance Dropdown 
        <li>
          <button
            onClick={isCollapsed ? () => router.push('/hr/performance/goals') : togglePerformanceMenu}
            className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
            title={isCollapsed ? 'Performance Management' : ''}
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Performance</span>}
            </div>
            {!isCollapsed && (performanceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
          {!isCollapsed && performanceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {performanceSubItems.map((subItem) => (
                <li key={subItem.name}>
                  <Link href={subItem.path}>
                    <span
                      className={`block text-sm px-3 py-2 bg-gray-700 rounded-lg ${hoverColor.replace("600", "500")} transition cursor-pointer`}
                    >
                      {subItem.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
        */}

          {/* Customer Connect */}
          <li>
            <Link href="/customer-connect">
              <div
                className="w-full text-left px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer flex items-center gap-3"
                title={isCollapsed ? "Customer Connect" : ""}
              >
                <Phone size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Customer Connect</span>
                )}
              </div>
            </Link>
          </li>

          {/* Settings Dropdown */}
          <li>
            <button
              onClick={
                isCollapsed
                  ? () => router.push("/settings/profile")
                  : toggleSettingsMenu
              }
              className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
              title={isCollapsed ? "Settings" : ""}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Settings</span>
                )}
              </div>
              {!isCollapsed &&
                (settingsOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && settingsOpen && (
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
              className="w-full text-left px-3 py-2.5 bg-red-600 hover:bg-red-700 transition rounded-lg mt-6 cursor-pointer flex items-center gap-3"
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
