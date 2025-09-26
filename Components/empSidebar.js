import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, User, FileText, CreditCard, Menu, X, LogOut, Calendar 
} from "lucide-react";

export default function Sidebar({ user }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navItems = [
    { name: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
    { name: "Profile Management", path: "/employee/profile", icon: User },
    { name: "Attendance Record", path: "/employee/attendance", icon: Calendar },
    { name: "Leave Requests", path: "/employee/leave-request", icon: FileText },
    { name: "Payslips & Docs", path: "/employee/emp-payslip", icon: CreditCard },
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${
                    router.pathname === item.path
                      ? "bg-indigo-600"
                      : "bg-gray-800 hover:bg-indigo-600"
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <IconComponent size={18} className="flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
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
