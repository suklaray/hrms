"use client";
//keep sidebar in client component as it uses react hooks and nextjs router
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/lib/compatRouter";
import { useAppShell } from "@/contexts/AppShellContext";
import { isSidebarShellActive } from "@/lib/appShell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/authSlice";
import { SIDEBAR_STRUCTURE, type SidebarItem } from "@/lib/sidebarStructure";
import {
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar({
  isSharedShell = false,
}: { isSharedShell?: boolean } = {}) {
  const router = useRouter();
  const { showAppShell } = useAppShell();
  const authUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const reduxPermissions = useAppSelector((state) => state.auth.permissions);
  const initialized = useAppSelector((state) => state.auth.initialized);
  const authLoading = useAppSelector((state) => state.auth.loading);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const loggingOut = useAppSelector((state) => state.auth.loggingOut);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openModules, setOpenModules] = useState({});

  const isSuperAdminUser = Boolean(authUser?.isSuperAdmin);

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

      const permissionList = Array.isArray(permission) ? permission : [permission];
      return permissionList.some((item) => {
        if (!item) return false;
        return reduxPermissions.includes(item);
      });
    },
    [isSuperAdminUser, reduxPermissions]
  );

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

  if (
    (showAppShell && !isSharedShell) ||
    (!isSharedShell && isSidebarShellActive()) ||
    !initialized ||
    !isAuthenticated ||
    loggingOut
  ) {
    return null;
  }

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push('/');
  };

  const isAccessEnabled =
    isSuperAdminUser ||
    (authUser?.verified === 'verified' && Boolean(authUser?.form_submitted)) ||
    reduxPermissions.length > 0;

  if (authLoading) {
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
          {SIDEBAR_STRUCTURE.map((item: SidebarItem) =>
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
