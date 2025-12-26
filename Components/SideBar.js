import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
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
  ListChecks,
  ListCheck,
} from "lucide-react";

export default function Sidebar({ user: propUser }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(propUser || null);
  const [userStatus, setUserStatus] = useState({
    verified: propUser?.verified === "verified" || false,
    formSubmitted: propUser?.form_submitted || false,
  });

  // Helper function to check if path is active
  const isActivePath = (path) => {
    if (path === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    // Exact match for specific paths to avoid conflicts
    if (path === '/hr/attendance') {
      return router.pathname === '/hr/attendance';
    }
    return router.pathname.startsWith(path);
  };

  // Helper function to check if dropdown should be open based on active path
  const shouldDropdownBeOpen = useCallback((paths) => {
    return paths.some(path => isActivePath(path));
  }, [router.pathname]);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      setUserStatus({
        verified: propUser.verified === "verified",
        formSubmitted: propUser.form_submitted || false,
      });
    } else {
      const fetchUser = async () => {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const userData = await res.json();
            setUser(userData.user);
            setUserStatus({
              verified: userData.user?.verified === 'verified',
              formSubmitted: userData.user?.form_submitted || false
            });
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      };
      fetchUser();
    }
  }, [propUser]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

  // Auto-open dropdowns based on current path
  useEffect(() => {
    setEmployeeOpen(shouldDropdownBeOpen(['/registerEmployee', '/employeeList']));
    setAttendanceOpen(shouldDropdownBeOpen(['/hr/attendance', '/hr/view-leave-requests', '/attendance/analytics']) && !router.pathname.startsWith('/hr/attendance/my-attendance'));
    setPayrollOpen(shouldDropdownBeOpen(['/hr/payroll']));
    setComplianceOpen(shouldDropdownBeOpen(['/compliance']));
    setSettingsOpen(shouldDropdownBeOpen(['/settings', '/hr/attendance/my-attendance', '/leave-request', '/payslip', '/task-management/user-task']));
  }, [router.pathname, shouldDropdownBeOpen]);
  const [checkedIn, setCheckedIn] = useState(false);

  const role = user?.role?.toLowerCase() || "hr";
  const isSuperAdmin = role === "superadmin";
  const isAccessEnabled = isSuperAdmin || (userStatus.verified && userStatus.formSubmitted);
  // console.log("User Role:", role, "Is Super Admin:", isSuperAdmin, "Access Enabled:", isAccessEnabled);

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
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, allowUnverified: true },
    { name: "Recruitment", path: "/Recruitment/recruitment", icon: UserCheck, allowUnverified: false },
  ];

  const employeeSubItems = [
    { name: "Register Employee", path: "/registerEmployee" },
    { name: "Employees List", path: "/employeeList" },
  ];

  const attendanceSubItems = [
    { name: "Attendance", path: "/hr/attendance" },
    { name: "Leave Management", path: "/hr/view-leave-requests" },
    //...(role === "hr"
    //  ? [{ name: "My Leave Requests", path: "/hr/leave-request" }]
    //  : []),
    { name: "Attendance Analytics", path: "/attendance/analytics" },
  ];

  const payrollSubItems = [
    { name: "Payroll Records", path: "/hr/payroll/payroll-view" },
    { name: "Generate Payroll", path: "/hr/payroll/generate" },
  ];

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
            const canAccess = isAccessEnabled || item.allowUnverified;
            return (
              <li key={item.name}>
                {canAccess ? (
                  <Link href={item.path}>
                    <div
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${
                        isActivePath(item.path)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 hover:bg-indigo-600'
                      }`}
                      title={isCollapsed ? item.name : ""}
                    >
                      <IconComponent size={18} className="flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div
                    className="w-full text-left px-3 py-2.5 bg-gray-700 rounded-lg text-gray-500 cursor-not-allowed flex items-center gap-3"
                    title={isCollapsed ? `${item.name} (Locked)` : "Complete verification and form submission to access"}
                  >
                    <IconComponent size={18} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">
                        {item.name} <span className="ml-2 text-xs">(🔒)</span>
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}

          {/* Employee Management Dropdown */}
          <li>
            <button
              onClick={
                isAccessEnabled
                  ? (isCollapsed
                    ? () => router.push("/employeeList")
                      : toggleEmployeeMenu)
                  : undefined
              }
              className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${
                isAccessEnabled
                  ? (shouldDropdownBeOpen(['/registerEmployee', '/employeeList'])
                    ? 'bg-indigo-600 text-white cursor-pointer'
                    : 'bg-gray-800 hover:bg-indigo-600 cursor-pointer')
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              title={isCollapsed ? (isAccessEnabled ? "Employee Management" : "Employee Management (Locked)") : (isAccessEnabled ? "" : "Complete verification and form submission to access")}
              disabled={!isAccessEnabled}
            >
              <div className="flex items-center gap-3">
                <Users size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Employee Management
                    {!isAccessEnabled && <span className="ml-2 text-xs">(🔒)</span>}
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
            {!isCollapsed && employeeOpen && isAccessEnabled && (
              <ul className="pl-6 pt-2 space-y-2">
                {employeeSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath(subItem.path)
                            ? 'bg-indigo-500 text-white'
                            : `bg-gray-700 ${hoverColor.replace("600", "500")}`
                        }`}
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
                isAccessEnabled
                  ? (isCollapsed
                    ? () => router.push("/hr/attendance")
                      : toggleAttendanceMenu)
                  : undefined
              }
              className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${
                isAccessEnabled
                  ? (shouldDropdownBeOpen(['/hr/attendance', '/hr/view-leave-requests', '/attendance/analytics'])
                    ? 'bg-indigo-600 text-white cursor-pointer'
                    : 'bg-gray-800 hover:bg-indigo-600 cursor-pointer')
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              title={isCollapsed ? (isAccessEnabled ? "Attendance & Leave" : "Attendance & Leave (Locked)") : (isAccessEnabled ? "" : "Complete verification and form submission to access")}
              disabled={!isAccessEnabled}
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Attendance & Leave
                    {!isAccessEnabled && <span className="ml-2 text-xs">(🔒)</span>}
                  </span>
                )}
              </div>
              {!isCollapsed && isAccessEnabled &&
                (attendanceOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && attendanceOpen && isAccessEnabled && (
              <ul className="pl-6 pt-2 space-y-2">
                {attendanceSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath(subItem.path)
                            ? 'bg-indigo-500 text-white'
                            : `bg-gray-700 ${hoverColor.replace("600", "500")}`
                        }`}
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
                isAccessEnabled
                  ? (isCollapsed
                    ? () => router.push("/hr/payroll/payroll-view")
                      : togglePayrollMenu)
                  : undefined
              }
              className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${
                isAccessEnabled
                  ? (shouldDropdownBeOpen(['/hr/payroll'])
                    ? 'bg-indigo-600 text-white cursor-pointer'
                    : 'bg-gray-800 hover:bg-indigo-600 cursor-pointer')
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              title={isCollapsed ? (isAccessEnabled ? "Payroll Management" : "Payroll Management (Locked)") : (isAccessEnabled ? "" : "Complete verification and form submission to access")}
              disabled={!isAccessEnabled}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Payroll Management
                    {!isAccessEnabled && <span className="ml-2 text-xs">(🔒)</span>}
                  </span>
                )}
              </div>
              {!isCollapsed && isAccessEnabled &&
                (payrollOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && payrollOpen && isAccessEnabled && (
              <ul className="pl-6 pt-2 space-y-2">
                {payrollSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath(subItem.path)
                            ? 'bg-indigo-500 text-white'
                            : `bg-gray-700 ${hoverColor.replace("600", "500")}`
                        }`}
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
                isAccessEnabled
                  ? (isCollapsed
                    ? () => router.push("/compliance/empCompliance")
                      : toggleComplianceMenu)
                  : undefined
              }
              className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${
                isAccessEnabled
                  ? (shouldDropdownBeOpen(['/compliance'])
                    ? 'bg-indigo-600 text-white cursor-pointer'
                    : 'bg-gray-800 hover:bg-indigo-600 cursor-pointer')
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              title={isCollapsed ? (isAccessEnabled ? "Compliance Management" : "Compliance Management (Locked)") : (isAccessEnabled ? "" : "Complete verification and form submission to access")}
              disabled={!isAccessEnabled}
            >
              <div className="flex items-center gap-3">
                <Shield size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Compliance
                    {!isAccessEnabled && <span className="ml-2 text-xs">(🔒)</span>}
                  </span>
                )}
              </div>
              {!isCollapsed && isAccessEnabled &&
                (complianceOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                ))}
            </button>
            {!isCollapsed && complianceOpen && isAccessEnabled && (
              <ul className="pl-6 pt-2 space-y-2">
                {complianceSubItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link href={subItem.path}>
                      <span
                        className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath(subItem.path)
                            ? 'bg-indigo-500 text-white'
                            : `bg-gray-700 ${hoverColor.replace("600", "500")}`
                        }`}
                      >
                        {subItem.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* Task Management */}
          <li>
            {isAccessEnabled ? (
              <Link href="/task-management/manage-tasks">
                <div
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${
                    isActivePath('/task-management/manage-tasks')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 hover:bg-indigo-600'
                  }`}
                  title={isCollapsed ? "Task Management" : ""}
                >
                  <ListChecks size={19} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">Task Management</span>
                  )}
                </div>
              </Link>
            ) : (
              <div
                className="w-full text-left px-3 py-2.5 bg-gray-700 rounded-lg text-gray-500 cursor-not-allowed flex items-center gap-3"
                title={isCollapsed ? "Task Management (Locked)" : "Complete verification and form submission to access"}
              >
                <ListChecks size={19} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Task Management <span className="ml-2 text-xs">(🔒)</span>
                  </span>
                )}
              </div>
            )}
          </li>

          {/* Customer Connect */}
          <li>
            {isAccessEnabled ? (
              <Link href="/customer-connect">
                <div
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${
                    isActivePath('/customer-connect')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 hover:bg-indigo-600'
                  }`}
                  title={isCollapsed ? "Customer Connect" : ""}
                >
                  <Phone size={18} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">Customer Connect</span>
                  )}
                </div>
              </Link>
            ) : (
              <div
                className="w-full text-left px-3 py-2.5 bg-gray-700 rounded-lg text-gray-500 cursor-not-allowed flex items-center gap-3"
                title={isCollapsed ? "Customer Connect (Locked)" : "Complete verification and form submission to access"}
              >
                <Phone size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Customer Connect <span className="ml-2 text-xs">(🔒)</span>
                  </span>
                )}
              </div>
            )}
          </li>

          {/* Settings Dropdown */}
          <li>
            <button
              onClick={
                isCollapsed
                  ? () => router.push("/settings/profile")
                  : toggleSettingsMenu
              }
              className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition cursor-pointer ${
                shouldDropdownBeOpen(['/settings', '/hr/attendance/my-attendance', '/leave-request', '/payslip', '/task-management/user-task'])
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 hover:bg-indigo-600'
              }`}
              title={isCollapsed ? "Settings" : ""}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">
                    Accounts & Settings
                  </span>
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
                    <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                      isActivePath('/settings/profile')
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-700 hover:bg-indigo-500'
                    }`}>
                      Profile Management
                    </span>
                  </Link>
                </li>

                {/* Other settings - only accessible if verified and form submitted */}
                {isAccessEnabled && (
                  <>
                    {/* Users own attendance */}
                    {["hr", "admin", "superadmin"].includes(role) && (
                      <li>
                        <Link href="/hr/attendance/my-attendance">
                          <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                            isActivePath('/hr/attendance/my-attendance')
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-700 hover:bg-indigo-500'
                          }`}>
                            My Attendance
                          </span>
                        </Link>
                      </li>
                    )}
                    {/* Bot Settings - Only for superadmin */}
                    {role === "superadmin" && (
                      <li>
                        <Link href="/settings/bot-settings">
                          <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                            router.pathname === '/settings/bot-settings'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-700 hover:bg-indigo-500'
                          }`}>
                            Bot Settings
                          </span>
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link href="/settings/position-management">
                        <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          router.pathname === '/settings/position-management'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-700 hover:bg-indigo-500'
                        }`}>
                          Add Position
                        </span>
                      </Link>
                    </li>
                    {/* <li>
                      <Link href="/leave-request/leave-request">
                        <span className="block text-sm px-3 py-2 bg-gray-700 rounded-lg hover:bg-indigo-500 transition cursor-pointer">
                          Leave Requests
                        </span>
                      </Link>
                    </li> */}
                    {role !== "superadmin" && (
                      <li>
                        <Link href="/leave-request/leave-request">
                          <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                            isActivePath('/leave-request')
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-700 hover:bg-indigo-500'
                          }`}>
                            Leave Requests
                          </span>
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link href="/payslip/payslip-lists">
                        <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath('/payslip')
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-700 hover:bg-indigo-500'
                        }`}>
                          Payslip & Documents
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/task-management/user-task">
                        <span className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                          isActivePath('/task-management/user-task')
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-700 hover:bg-indigo-500'
                        }`}>
                          Manage Tasks
                        </span>
                      </Link>
                    </li>
                  </>
                )}

                {/* Show locked items for non-verified users */}
                {!isAccessEnabled && (
                  <>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        My Attendance (🔒)
                      </span>
                    </li>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        Bot Settings (🔒)
                      </span>
                    </li>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        Add Position (🔒)
                      </span>
                    </li>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        Leave Requests (🔒)
                      </span>
                    </li>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        Payslip & Documents (🔒)
                      </span>
                    </li>
                    <li>
                      <span className="block text-sm px-3 py-2 bg-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                        Manage Tasks (🔒)
                      </span>
                    </li>
                  </>
                )}
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
