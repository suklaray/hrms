import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, User, FileText, CreditCard, Menu, X, LogOut, Calendar 
} from "lucide-react";

export default function Sidebar({ user }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userStatus, setUserStatus] = useState({ verified: false, formSubmitted: false });

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const userData = await res.json();
          setUserStatus({
            verified: userData.user?.verified === 'verified',
            formSubmitted: userData.user?.form_submitted || false
          });
        }
      } catch (error) {
        console.error("Failed to fetch user status:", error);
      }
    };
    fetchUserStatus();
  }, []);

  const isAccessEnabled = userStatus.verified && userStatus.formSubmitted;

  const navItems = [
    { name: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard, requiresAccess: false },
    { name: "Profile Management", path: "/employee/profile", icon: User, requiresAccess: false },
    { name: "Attendance Record", path: "/employee/attendance", icon: Calendar, requiresAccess: true },
    { name: "Leave Requests", path: "/employee/leave-request", icon: FileText, requiresAccess: true },
    { name: "Payslips & Docs", path: "/employee/emp-payslip", icon: CreditCard, requiresAccess: true },
    { name: "Manage Tasks", path: "/task-management/user-task", icon: CreditCard, requiresAccess: true },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/employee/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold">Employee Panel</h2>
              <p className="text-sm text-gray-400">{user?.name}</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <ul className="space-y-4">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isDisabled = item.requiresAccess && !isAccessEnabled;
            return (
              <li key={item.name}>
                <button
                  onClick={() => {
                    if (!isDisabled) {
                      router.push(item.path);
                    }
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3 ${
                    isDisabled
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : router.pathname === item.path
                      ? "bg-indigo-600 cursor-pointer"
                      : "bg-gray-800 hover:bg-indigo-600 cursor-pointer"
                  }`}
                  title={isCollapsed ? item.name : (isDisabled ? 'Complete verification and form submission to access' : '')}
                  disabled={isDisabled}
                >
                  <IconComponent size={18} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">
                      {item.name}
                      {isDisabled && <span className="ml-2 text-xs">(🔒)</span>}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          


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
