"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/lib/compatRouter";
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
  UserCog,
  Banknote
} from "lucide-react";


const SIDEBAR_STRUCTURE = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    route: '/dashboard',
    permission: 'dashboard.view',
  },
  {
    name: 'Recruitment Management',
    icon: UserPlus,
    permission: 'recruitment.view',
    children: [
      { title: 'Recruitment', route: '/Recruitment/recruitment', permission: 'recruitment.view' },
    ],
  },
  {
    name: 'Employee Management',
    icon: Users,
    permission: 'employee.view',
    children: [
      { title: 'Employee List', route: '/employeeList', permission: 'employee.view' },
      { title: 'Register Employee', route: '/registerEmployee', permission: 'employee.create' },
    ],
  },
  {
    name: 'Attendance & Leave',
    icon: Clock,
    permission: 'attendance.view',
    children: [
      { title: 'Attendance', route: '/attendance', permission: 'attendance.view' },
      { title: 'Leave Management', route: '/view-leave-requests', permission: 'leave.view' },
      { title: 'Attendance Analytics', route: '/attendance/analytics', permission: 'attendance.analytics' },
    ],
  },
  {
    name: 'Payroll Management',
    icon: Banknote,
    permission: 'payroll.view',
    children: [
      {
        name: 'Payroll Setup',
        icon: Banknote,
        permission: 'payroll.generate',
        children: [
          {
            name: 'Payroll Configuration',
            icon: Banknote,
            permission: 'payroll.generate',
            children: [
              { title: 'Create Configuration', route: '/payroll/payroll-setup/payroll-create-config', permission: 'payroll.generate' },
              { title: 'Manage Configurations', route: '/payroll/payroll-setup/payroll-get-configs', permission: 'payroll.view' },
            ],
          }
        ]
      },
      { title: 'Payroll Record', route: '/payroll/payroll-view', permission: 'payroll.view' },
      { title: 'Generate Payroll', route: '/payroll/generate', permission: 'payroll.generate' },
    ],
  },
  {
    name: 'Compliance',
    icon: Shield,
    permission: 'compliance.view',
    children: [
      { title: 'Employee Compliance', route: '/compliance/empCompliance', permission: 'compliance.view' },
      { title: 'Document Center', route: '/compliance/documentCenter', permission: 'compliance.view_documents' },
    ],
  },
  {
    name: 'Task Management',
    icon: ListChecks,
    permission: 'task.view',
    children: [
      { title: 'Task Management', route: '/task-management/manage-tasks', permission: 'task.create' },
      { title: 'Daily Reports', route: '/task-management/daily-reports', permission: 'report.view' },
    ],
  },
  {
    name: 'Roles & Titles',
    icon: UserCog,
    permission: 'settings.position_view',
    children: [
      { title: 'Designation Management', route: '/settings/position-management', permission: 'settings.position_manage' },
      { title: 'Role Management', route: '/settings/employee-types', permission: 'settings.employee_types_manage' },
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
      { title: 'My profile', route: '/settings/profile', permission: 'settings.profile' },
      { title: 'My Attendance', route: '/attendance/my-attendance', permission: 'attendance.my' },
      { title: 'Leave Request', route: '/leave-request/leave-request', permission: 'leave.request' },
      { title: 'Payslip & Documents', route: '/payslip/payslip-lists', permission: 'payslip.view' },
      { title: 'My Tasks', route: '/task-management/user-task', permission: ['task.my', 'report.submit'] },
      { title: 'Bot Settings', route: '/settings/bot-settings', permission: 'settings.bot' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar({ user: propUser, handleLogout: propHandleLogout }: any = {}) {
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
    if (!path) return false;
    return router.pathname === path || router.asPath === path;
  };

  const hasActiveRoute = (item, currentPath) => {
    if (item.route && (item.route === currentPath || isActivePath(item.route))) return true;
    if (item.children && Array.isArray(item.children)) {
      return item.children.some((child) => hasActiveRoute(child, currentPath));
    }
    return false;
  };

  const getFirstRoute = (item) => {
    if (item.route) return item.route;
    if (item.children && Array.isArray(item.children)) {
      for (const child of item.children) {
        if (canSee(child.permission)) {
          const found = getFirstRoute(child);
          if (found) return found;
        }
      }
    }
    return null;
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
    const checkOpen = (items) => {
      for (const item of items) {
        const key = item.name || item.title;
        if (item.children && item.children.length > 0) {
          if (hasActiveRoute(item, router.pathname)) {
            next[key] = true;
          }
          checkOpen(item.children);
        }
      }
    };
    checkOpen(SIDEBAR_STRUCTURE);
    setOpenModules((prev) => ({ ...prev, ...next }));
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
    if (propHandleLogout) {
      return propHandleLogout();
    }
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isAccessEnabled =
    isSuperAdminUser ||
    (userStatus.verified && userStatus.formSubmitted) ||
    permissions.size > 0;

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
        <Link href={item.route || '#'}>
          <div
            className={`w-full px-3 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-3 ${isActivePath(item.route) ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-indigo-600'
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

  // ── Render child items (supports recursive nesting for sub-tabs) ──────────
  const renderChildItem = (child, depth = 1) => {
    if (!canSee(child.permission)) return null;

    // Submenu with nested children (e.g. Payroll Setup)
    if (child.children && child.children.length > 0) {
      const visibleSubChildren = child.children.filter((c) => canSee(c.permission));
      if (visibleSubChildren.length === 0) return null;

      const childKey = child.name || child.title || `sub-${depth}`;
      const isSubOpen = openModules[childKey] || false;
      const toggleSub = (e) => {
        e.stopPropagation();
        setOpenModules((prev) => ({ ...prev, [childKey]: !prev[childKey] }));
      };
      const isSubActive = hasActiveRoute(child, router.pathname);
      const SubIcon = child.icon;

      return (
        <li key={childKey} className="space-y-1">
          <button
            type="button"
            onClick={toggleSub}
            className={`w-full text-left flex justify-between items-center px-3 py-2 rounded-lg transition cursor-pointer text-sm font-medium ${isSubActive
              ? 'bg-indigo-600/70 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              }`}
          >
            <div className="flex items-center gap-2.5">
              {SubIcon && <SubIcon size={15} className="flex-shrink-0" />}
              <span>{child.name || child.title}</span>
            </div>
            {isSubOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isSubOpen && (
            <ul className="pl-3 pt-1 space-y-1 border-l-2 border-indigo-500/40 ml-2">
              {visibleSubChildren.map((subChild) => renderChildItem(subChild, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    // Leaf item with route
    if (child.route) {
      const isCurrentActive = isActivePath(child.route);
      return (
        <li key={child.route}>
          <Link href={child.route}>
            <span
              className={`block text-sm px-3 py-2 rounded-lg transition cursor-pointer ${isCurrentActive
                ? 'bg-indigo-500 text-white font-medium'
                : 'bg-gray-700 hover:bg-indigo-500 text-gray-200'
                }`}
            >
              {child.title || child.name}
            </span>
          </Link>
        </li>
      );
    }

    return null;
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
    const isModuleActive = hasActiveRoute(item, router.pathname);
    const firstRoute = getFirstRoute(item);

    return (
      <li key={item.name}>
        <button
          onClick={canAccess ? (isCollapsed ? () => (firstRoute && router.push(firstRoute)) : toggle) : undefined}
          disabled={!canAccess}
          className={`w-full text-left flex justify-between items-center px-3 py-2.5 rounded-lg transition ${canAccess
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
            {visibleChildren.map((child) => renderChildItem(child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className={`min-h-screen bg-gray-900 text-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'
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
