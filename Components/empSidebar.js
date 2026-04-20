import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, User, FileText, CreditCard, Menu, X, LogOut, Calendar 
} from "lucide-react";

export default function Sidebar({ user: propUser }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser); // Only loading if no propUser
  const [userStatus, setUserStatus] = useState({
    verified: propUser?.verified === "verified" || false,
    formSubmitted: propUser?.form_submitted || false,
  });

  useEffect(() => {
    const initUser = async () => {
      try {
        if (propUser) {
          // User already provided, no need to fetch
          setUser(propUser);
          setUserStatus({
            verified: propUser.verified === "verified",
            formSubmitted: propUser.form_submitted || false,
          });
          setLoading(false);
        } else {
          // Only fetch if no propUser provided
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const userData = await res.json();
            setUser(userData.user);
            setUserStatus({
              verified: userData.user?.verified === "verified",
              formSubmitted: userData.user?.form_submitted || false,
            });
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setLoading(false);
      }
    };

    initUser();
  }, [propUser]);

  const isAccessEnabled = userStatus.verified && userStatus.formSubmitted;

  // Memoize access control to prevent recalculation
  const getItemAccess = (requiresAccess = false) => {
    return !requiresAccess || isAccessEnabled;
  };

  // Show loading skeleton while user data is being fetched
  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
        {/* Header Skeleton */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <div className="h-6 bg-gray-700 rounded w-32 animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
              </div>
            )}
            <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Menu Items Skeleton */}
        <div className="p-4">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderNavItem = (item) => {
    const IconComponent = item.icon;
    const canAccess = getItemAccess(item.requiresAccess);
    
    return (
      <button
        key={item.name}
        onClick={() => {
          if (canAccess) {
            router.push(item.path);
          }
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-3 ${
          !canAccess
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : router.pathname === item.path
            ? "bg-indigo-600 cursor-pointer"
            : "bg-gray-800 hover:bg-indigo-600 cursor-pointer"
        }`}
        title={isCollapsed ? (canAccess ? item.name : `${item.name} (Locked)`) : (!canAccess ? 'Complete verification and form submission to access' : '')}
        disabled={!canAccess}
      >
        <IconComponent size={18} className="flex-shrink-0" />
        {!isCollapsed && (
          <span className="text-sm font-medium">
            {item.name}
            {!canAccess && <span className="ml-2 text-xs">(🔒)</span>}
          </span>
        )}
      </button>
    );
  };

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
          {navItems.map((item) => (
            <li key={item.name}>
              {renderNavItem(item)}
            </li>
          ))}
          


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
