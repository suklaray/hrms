"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "@/lib/compatRouter";
import {
  User,
  LogOut,
  Menu,
  X,
  Home,
  Info,
  Mail,
  UserPlus,
  Building2,
  Bell,
} from "lucide-react";
import { formatDayMonthDate } from "@/utils/dateTime";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";

const Header = ({ user: propUser }: any = {}) => {
  const reduxUser = useAppSelector((state) => state.auth.user);
  const authInitialized = useAppSelector((state) => state.auth.initialized);
  const effectiveUser = propUser ?? reduxUser ?? null;
  const [user, setUser] = useState(effectiveUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const dispatch = useAppDispatch();
  const authReady = hasHydrated || authInitialized || Boolean(propUser) || Boolean(reduxUser);
  const showLoggedInView = hasHydrated && Boolean(effectiveUser);

  // Sync user state when Redux user or propUser updates
  useEffect(() => {
    setUser(effectiveUser);
  }, [effectiveUser]);

  // Load existing notifications from localStorage on mount
  useEffect(() => {
    setHasHydrated(true);
    const storedNotifications = localStorage.getItem("currentNotifications");
    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
      } catch (error) {
        console.error("Error parsing stored notifications:", error);
        localStorage.removeItem("currentNotifications");
      }
    }
  }, []);

  // Function to check for recent notifications that might have been missed
  const checkRecentNotifications = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const url = token
        ? `/api/notifications/recent?token=${encodeURIComponent(token)}`
        : `/api/notifications/recent`;

      const response = await fetch(url, {
        credentials: "include",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.notifications && data.notifications.length > 0) {
          data.notifications.forEach((notification: any) => {
            mergeNotification(notification);
          });
        }
      }
    } catch (error) {
      // Background check failure is non-fatal
    }
  };

  // Function to merge new notification with existing ones (deduplication)
  const mergeNotification = (newNotification: any) => {
    setNotifications((prevNotifications: any[]) => {
      const exists = prevNotifications.some((n: any) => n.id === newNotification.id);
      if (exists) {
        return prevNotifications;
      }
      const updatedNotifications = [...prevNotifications, newNotification];
      localStorage.setItem("currentNotifications", JSON.stringify(updatedNotifications));
      return updatedNotifications as any;
    });
  };

  // SSE Real-time Notifications
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isConnecting = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let isCleanedUp = false;

    const connectSSE = () => {
      if (isCleanedUp || isConnecting) {
        return;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const hasCookieToken = typeof document !== "undefined" && document.cookie.includes("token=");
      if (!token && !hasCookieToken) {
        return;
      }

      isConnecting = true;

      try {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        const sseUrl = token
          ? `/api/notifications/stream?token=${encodeURIComponent(token)}`
          : `/api/notifications/stream`;

        eventSource = new EventSource(sseUrl, { withCredentials: true });

        eventSource.onopen = () => {
          if (isCleanedUp) {
            eventSource?.close();
            return;
          }
          setSseConnected(true);
          isConnecting = false;
          reconnectAttempts = 0;

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }

          setTimeout(() => {
            if (!isCleanedUp) checkRecentNotifications();
          }, 1000);
        };

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);

            // Skip heartbeat messages
            if (notification.type === "heartbeat") {
              return;
            }

            // Skip system connection messages
            if (notification.type === "system" && notification.id === "sse-connected") {
              return;
            }

            // Process all other notifications
            mergeNotification(notification);
          } catch (error) {
            console.error("SSE: Error parsing notification:", error);
          }
        };

        eventSource.onerror = () => {
          setSseConnected(false);
          isConnecting = false;

          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            eventSource.close();
            eventSource = null;
          }

          if (isCleanedUp) return;

          reconnectAttempts++;
          if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts - 1), 20000);
            if (!reconnectTimeout) {
              reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                connectSSE();
              }, delay);
            }
          } else {
            console.warn("SSE: Real-time notification reconnection limit reached. Will retry upon next interaction.");
          }
        };

      } catch {
        setSseConnected(false);
        isConnecting = false;

        if (!isCleanedUp && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        }
      }
    };

    // Initial connection
    connectSSE();

    // Cleanup on unmount or user change
    return () => {
      isCleanedUp = true;
      isConnecting = false;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      setSseConnected(false);
    };
  }, [user]);

  const dismissNotification = (notificationId) => {
    const updatedNotifications = notifications.filter((n) => n.id !== notificationId);
    setNotifications(updatedNotifications);
    localStorage.setItem("currentNotifications", JSON.stringify(updatedNotifications));
  };

  const router = useRouter();
  useEffect(() => {
    setHasHydrated(true);
    setUser(effectiveUser);
  }, [effectiveUser]);

  const handleLogout = async () => {
    await dispatch(logoutUser()).unwrap();
    setUser(null);
  };

  // notification function called on check-in - DISABLED FOR SSE
  useEffect(() => {
    // Disabled in favor of SSE real-time notifications
    // The old polling logic has been replaced with SSE
    return;
  }, [user]);

  return (
    <header className="bg-gradient-to-r from-indigo-700 to-purple-600 sticky top-0 z-50 shadow-lg">
      <div className="px-12 lg:px-20">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">HRMS</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`flex items-center space-x-2 transition-colors duration-200 font-medium ${
                router.pathname === '/' 
                  ? 'text-yellow-300 bg-white/20 px-3 py-2 rounded-lg' 
                  : 'text-white hover:text-yellow-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link
              href="/AboutUs"
              className={`flex items-center space-x-2 transition-colors duration-200 font-medium ${
                router.pathname === '/AboutUs' 
                  ? 'text-yellow-300 bg-white/20 px-3 py-2 rounded-lg' 
                  : 'text-white hover:text-yellow-300'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
            <Link
              href="/Contact"
              className={`flex items-center space-x-2 transition-colors duration-200 font-medium ${
                router.pathname === '/Contact' 
                  ? 'text-yellow-300 bg-white/20 px-3 py-2 rounded-lg' 
                  : 'text-white hover:text-yellow-300'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </Link>

            {showLoggedInView ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium hover:text-yellow-300 transition-colors">
                    {effectiveUser.name}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-white hover:text-red-300 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                    router.pathname === '/login'
                      ? 'text-yellow-300 bg-white/20'
                      : 'text-white hover:text-yellow-300 hover:bg-white/10'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              </div>
            )}
            {showLoggedInView && (
              <button
                className="relative flex items-center justify-center w-10 h-10 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200"
                onClick={() => {
                  // console.log('Bell clicked, notifications:', notifications.length);
                  setShowModal(true);
                }}
                title={`${notifications.length} notifications • ${sseConnected ? 'Real-time notifications active' : 'Notifications (polling mode)'}`}
              >
                <Bell className="w-5 h-5 text-white" />
                {notifications.length > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  </>
                )}
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-2">
            <Link
              href="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                router.pathname === '/' 
                  ? 'text-yellow-300 bg-white/20' 
                  : 'text-white hover:text-yellow-300 hover:bg-white/10'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/AboutUs"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                router.pathname === '/AboutUs' 
                  ? 'text-yellow-300 bg-white/20' 
                  : 'text-white hover:text-yellow-300 hover:bg-white/10'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <Info className="w-5 h-5" />
              <span>About</span>
            </Link>
            <Link
              href="/Contact"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                router.pathname === '/Contact' 
                  ? 'text-yellow-300 bg-white/20' 
                  : 'text-white hover:text-yellow-300 hover:bg-white/10'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </Link>

            {showLoggedInView ? (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium">{effectiveUser.name}</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 text-white hover:text-red-300 hover:bg-white/10 rounded-lg transition-all duration-200 w-full cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <Link
                  href="/login"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    router.pathname === '/login'
                      ? 'text-yellow-300 bg-white/20'
                      : 'text-white hover:text-yellow-300 hover:bg-white/10'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Login</span>
                </Link>
              </div>
            )}
            {showLoggedInView && (
              <div className="flex px-4">
                <button
                  className="relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200"
                  onClick={() => setShowModal(true)}
                >
                  <Bell className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-2/3 lg:w-1/2 rounded-2xl shadow-xl p-6 relative">
            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-500"
              onClick={() => setShowModal(false)}
            >
              ✖
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Notifications
            </h2>

            {/* Notifications list */}
            {notifications.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="text-sm text-gray-500 mb-2">
                  {notifications.length} notification{notifications.length > 1 ? 's' : ''} • SSE: {sseConnected ? 'Connected' : 'Disconnected'}
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-lg border ${n.bgColor} ${n.borderColor} text-white`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{n.title}</h3>
                      <span className="text-xs opacity-75">{n.type}</span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{n.message}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs opacity-75">
                        {n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : 'Now'}
                      </span>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="text-xs underline text-white/90 hover:text-white px-2 py-1 rounded"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center">
                No new notifications 🎉
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
