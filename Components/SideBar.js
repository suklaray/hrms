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
  Clock,
  DollarSign,
  Shield,
  Phone,
  Settings,
  LogOut,
  ListChecks,
} from "lucide-react";


const SIDEBAR_STRUCTURE = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/dashboard',
    permission: 'dashboard.view',
  },
  {
    name: 'Recruitment',
    icon: UserPlus,
    permission: 'recruitment.view',
    children: [
      { title: 'Recruitment',         route: '/Recruitment/recruitment',               permission: 'recruitment.view' },
    ],
  },
  {
    name: 'Employee Management',
    icon: Users,
    permission: 'employee.view',
    children: [
      { title: 'Employee List',       route: '/employeeList',                          permission: 'employee.view' },
      { title: 'Register Employee',   route: '/registerEmployee',                      permission: 'employee.create' },
    ],
  },
  {
    name: 'Attendance & Leave',
    icon: Clock,
    permission: 'attendance.view',
    children: [
      { title: 'Attendance',          route: '/hr/attendance',                         permission: 'attendance.view' },
      { title: 'Leave Management',    route: '/hr/view-leave-requests',                permission: 'leave.view' },
      { title: 'Attendance Analytics',route: '/attendance/analytics',                  permission: 'attendance.analytics' },
    ],
  },
  {
    name: 'Payroll Management',
    icon: DollarSign,
    permission: 'payroll.view',
    children: [
      { title: 'Payroll Record',      route: '/hr/payroll/payroll-view',               permission: 'payroll.view' },
      { title: 'Generate Payroll',    route: '/hr/payroll/generate',                   permission: 'payroll.generate' },
    ],
  },
  {
    name: 'Compliance',
    icon: Shield,
    permission: 'compliance.view',
    children: [
      { title: 'Employee Compliance', route: '/compliance/empCompliance',              permission: 'compliance.view' },
      { title: 'Document Center',     route: '/compliance/documentCenter',             permission: 'compliance.view_documents' },
    ],
  },
  {
    name: 'Task Management',
    icon: ListChecks,
    permission: 'task.view',
    children: [
      { title: 'Task Management',     route: '/task-management/manage-tasks',          permission: 'task.create' },
      { title: 'Daily Reports',       route: '/task-management/daily-reports',         permission: 'report.view' },
    ],
  },
  
  {
    name: 'Customer Connect',
    icon: Phone,
    route: '/customer-connect',
    permission: 'customer.view',
  },
  {
    name: 'Settings',
    icon: Settings,
    permission: 'settings.profile',
    children: [
      { title: 'Profile Management',  route: '/settings/profile',                      permission: 'settings.profile' },
      { title: 'My Attendance',       route: '/hr/attendance/my-attendance',           permission: 'attendance.my' },
      { title: 'Leave Request',       route: '/leave-request/leave-request',           permission: 'leave.request' },
      { title: 'Add Position',        route: '/settings/position-management',          permission: 'settings.position_manage' },
      { title: 'Leave Requests',      route: '/leave-request/leave-request',           permission: 'settings.leave_requests' },
      { title: 'Payslip & Documents', route: '/payslip/payslip-lists',                 permission: 'payslip.view' },
      { title: 'Manage Tasks',        route: '/task-management/user-task',             permission: 'task.my' },
      { title: 'Employee Types',      route: '/settings/employee-types',               permission: 'settings.employee_types_manage' },
      { title: 'Bot Settings',        route: '/settings/bot-settings',                 permission: 'settings.bot' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar({ user: propUser }) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({ verified: false, formSubmitted: false });
  const [permissions, setPermissions] = useState(new Set());
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [openModules, setOpenModules] = useState({});

  const isActivePath = (path) => {
    return router.pathname === path;
  };

  const canSee = useCallback(
    (permission) => {
      if (!permission) return true;
      if (isSuperAdminUser) return true;
      return permissions.has(permission);
    },
    [isSuperAdminUser, permissions]
  );

  // ── Fetch user + permissions ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        let userData = propUser;
        if (!propUser) {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const json = await res.json();
            userData = json.user;
          }
        }
        if (userData) {
          setUser(userData);
          setUserStatus({
            verified: userData.verified === 'verified',
            formSubmitted: userData.form_submitted || false,
          });
        }

        const sbRes = await fetch('/api/sidebar');
        if (sbRes.ok) {
          const data = await sbRes.json();
          setIsSuperAdminUser(data.isSuperAdmin);
          setPermissions(new Set(data.permissions));
        }
      } catch (err) {
        console.error('Sidebar init failed:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [propUser]);

  // ── Auto-open dropdowns ───────────────────────────────────────────────────
  useEffect(() => {
    const next = {};
    for (const item of SIDEBAR_STRUCTURE) {
      if (!item.children) continue;
      const routes = item.children.map((c) => c.route);
      next[item.name] = routes.some((r) => isActivePath(r));
    }
    setOpenModules(next);
  }, [router.pathname]);

  // ── Screen size ───────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsCollapsed(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const role = user?.role?.toLowerCase() || 'hr';
  const isAccessEnabled =
    isSuperAdminUser ||
    role === 'superadmin' ||
    (userStatus.verified && userStatus.formSubmitted);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && <div className="h-8 bg-gray-700 rounded w-32 animate-pulse" />}
            <div className="h-8 w-8 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render flat nav item ──────────────────────────────────────────────────
  const renderFlat = (item) => {
    if (!canSee(item.permission)) return null;
    const canAccess = isAccessEnabled || item.name === 'Dashboard';
    const Icon = item.icon || Settings;

    if (!canAccess) {
      return (
        <li key={item.name}>
          <div
            className="w-full px-3 py-2.5 bg-gray-700 rounded-lg text-gray-500 cursor-not-allowed flex items-center gap-3"
            title={isCollapsed ? `${item.name} (Locked)` : 'Complete verification to access'}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">{item.name} 🔒</span>}
          </div>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <Link href={item.route}>
          <div
            className={`w-full px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${
              isActivePath(item.route) ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-indigo-600'
            }`}
            title={isCollapsed ? item.name : ''}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
          </div>
        </Link>
      </li>
    );
  };

  // ── Render dropdown module ────────────────────────────────────────────────
  const renderDropdown = (item) => {
    const Icon = item.icon || Settings;
    // Filter children by permission
    const visibleChildren = item.children.filter((c) => canSee(c.permission));
    if (visibleChildren.length === 0) return null;

    const isOpen = openModules[item.name] || false;
    const toggle = () => setOpenModules((prev) => ({ ...prev, [item.name]: !prev[item.name] }));
    const canAccess = isAccessEnabled;
    const isModuleActive = visibleChildren.some((c) => isActivePath(c.route));

    return (
      <li key={item.name}>
        <button
          onClick={canAccess ? (isCollapsed ? () => router.push(visibleChildren[0].route) : toggle) : undefined}
          disabled={!canAccess}
          className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${
            canAccess
              ? isModuleActive
                ? 'bg-indigo-600 text-white cursor-pointer'
                : 'bg-gray-800 hover:bg-indigo-600 cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          title={isCollapsed ? item.name : ''}
        >
          <div className="flex items-center gap-3">
            <Icon size={18} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">
                {item.name}
                {!canAccess && ' 🔒'}
              </span>
            )}
          </div>
          {!isCollapsed && canAccess && (isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </button>

        {!isCollapsed && isOpen && canAccess && (
          <ul className="pl-6 pt-2 space-y-2">
            {visibleChildren.map((child) => (
              <li key={child.route}>
                <Link href={child.route}>
                  <span
                    className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${
                      isActivePath(child.route)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-700 hover:bg-indigo-500'
                    }`}
                  >
                    {child.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-72'
      } ${isMobile && !isCollapsed ? 'absolute z-50 h-full' : ''}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && <h2 className="text-2xl font-bold">HRMS Panel</h2>}
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
          {SIDEBAR_STRUCTURE.map((item) =>
            item.children ? renderDropdown(item) : renderFlat(item)
          )}

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
