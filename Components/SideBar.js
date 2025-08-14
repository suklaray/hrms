import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { 
  ChevronDown, ChevronUp, Menu, X, LayoutDashboard, UserPlus, Users, 
  UserCheck, Clock, DollarSign, Shield, TrendingUp, Phone, Settings, LogOut 
} from "lucide-react";

export default function Sidebar({ handleLogout, user }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const role = user?.role?.toLowerCase() || 'hr';

  const toggleAttendanceMenu = () => setAttendanceOpen(!attendanceOpen);
  const togglePayrollMenu = () => setPayrollOpen(!payrollOpen);
  const toggleComplianceMenu = () => setComplianceOpen(!complianceOpen);
  const togglePerformanceMenu = () => setPerformanceOpen(!performanceOpen);
  const toggleSettingsMenu = () => setSettingsOpen(!settingsOpen);
  const hoverColor =
    role === "superadmin"
      ? "hover:bg-purple-600"
      : role === "admin"
      ? "hover:bg-sky-600"
      : "hover:bg-indigo-600"; // default to HR

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Register Employee", path: "/registerEmployee", icon: UserPlus },
    { name: "Employee List", path: "/employeeList", icon: Users },
    { name: "Recruitment", path: "/Recruitment/recruitment", icon: UserCheck },
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
    <div className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && <h2 className="text-2xl font-bold">HRMS Panel</h2>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>
      
      <div className="p-4">
      <ul className="space-y-4">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <li key={item.name}>
              <button
                onClick={() => router.push(item.path)}
                className="w-full text-left px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer flex items-center gap-3"
                title={isCollapsed ? item.name : ''}
              >
                <IconComponent size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            </li>
          );
        })}

        {/* Attendance Dropdown */}
        <li>
          <button
            onClick={isCollapsed ? () => router.push('/hr/attendance') : toggleAttendanceMenu}
            className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
            title={isCollapsed ? 'Attendance & Leave' : ''}
          >
            <div className="flex items-center gap-3">
              <Clock size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Attendance & Leave</span>}
            </div>
            {!isCollapsed && (attendanceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
          {!isCollapsed && attendanceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {attendanceSubItems.map((subItem) => (
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

        {/* Payroll Dropdown */}
        <li>
          <button
            onClick={isCollapsed ? () => router.push('/hr/payroll/payroll-view') : togglePayrollMenu}
            className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
            title={isCollapsed ? 'Payroll Management' : ''}
          >
            <div className="flex items-center gap-3">
              <DollarSign size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Payroll Management</span>}
            </div>
            {!isCollapsed && (payrollOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
          {!isCollapsed && payrollOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {payrollSubItems.map((subItem) => (
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

        {/* Compliance Dropdown */}
        <li>
          <button
            onClick={isCollapsed ? () => router.push('/compliance/empCompliance') : toggleComplianceMenu}
            className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
            title={isCollapsed ? 'Compliance Management' : ''}
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Compliance</span>}
            </div>
            {!isCollapsed && (complianceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
          {!isCollapsed && complianceOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              {complianceSubItems.map((subItem) => (
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

        {/* Performance Dropdown */}
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

          <li>
            <button
              onClick={() => router.push("/customer-connect")}
              className="w-full text-left px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer flex items-center gap-3"
              title={isCollapsed ? 'Customer Connect' : ''}
            >
              <Phone size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Customer Connect</span>}
            </button>
          </li>

        {/* Settings Dropdown */}
        <li>
          <button
            onClick={isCollapsed ? () => router.push('/settings/profile') : toggleSettingsMenu}
            className="w-full text-left flex justify-between items-center px-3 py-2.5 bg-gray-800 rounded-lg hover:bg-indigo-600 transition cursor-pointer"
            title={isCollapsed ? 'Settings' : ''}
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
            </div>
            {!isCollapsed && (settingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
          {!isCollapsed && settingsOpen && (
            <ul className="pl-6 pt-2 space-y-2">
              <li>
                <button
                  onClick={() => router.push("/settings/profile")}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer"
                >
                  Profile
                </button>
              </li>
            </ul>
          )}
        </li>

        {/* Logout */}
        <li>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 bg-red-600 hover:bg-red-700 transition rounded-lg mt-6 cursor-pointer flex items-center gap-3"
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </li>
      </ul>
      </div>
    </div>
  );
}
