import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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

const Header = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const showCheckInNotifications = async () => {
    try {
      const newNotifications = [];

      // Check leave notifications
      const leaveRes = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "check leave status" }),
      });
      const leaveData = await leaveRes.json();

      if (
        leaveData.answer &&
        leaveData.answer.includes("✅") &&
        leaveData.answer.includes("Approved")
      ) {
        const lines = leaveData.answer.split("\n");
        const approvedLeaves = lines.filter(
          (line) => line.includes("✅") && line.includes("Approved")
        );

        if (approvedLeaves.length > 0) {
          newNotifications.push({
            id: "leave-approved",
            type: "leave",
            status: "approved",
            title: "Leave Approved!",
            message: `🎉 You have approved leave requests:\n\n${approvedLeaves.join(
              "\n"
            )}\n\n📍 View details in Leave Management`,
            bgColor:
              "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600",
            borderColor: "border-yellow-300/80",
          });
        }
      }

      if (
        leaveData.answer &&
        leaveData.answer.includes("❌") &&
        leaveData.answer.includes("Rejected")
      ) {
        const lines = leaveData.answer.split("\n");
        const rejectedLeaves = lines.filter(
          (line) => line.includes("❌") && line.includes("Rejected")
        );

        if (rejectedLeaves.length > 0) {
          newNotifications.push({
            id: "leave-rejected",
            type: "leave",
            status: "rejected",
            title: "Leave Rejected!",
            message: `😔 Your leave request(s) were rejected:\n\n${rejectedLeaves.join(
              "\n"
            )}\n\n📍 View details in Leave Management`,
            bgColor: "bg-gradient-to-br from-red-400 via-red-500 to-red-600",
            borderColor: "border-orange-300/80",
          });
        }
      }

      // Check payslip notifications
      const payslipRes = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "general hr query" }),
      });
      const payslipData = await payslipRes.json();

      if (
        payslipData.answer &&
        payslipData.answer.includes("💰") &&
        payslipData.answer.includes("payslip is ready")
      ) {
        // Extract payslip details from the response
        const lines = payslipData.answer.split("\n");
        let payslipInfo = "";
        let foundPayslip = false;

        lines.forEach((line) => {
          if (
            line.includes("✅") &&
            (line.includes("Payslip") ||
              line.includes("Generated") ||
              line.includes("Salary"))
          ) {
            payslipInfo += line.trim() + "\n";
            foundPayslip = true;
          }
        });

        if (foundPayslip) {
          newNotifications.push({
            id: "payslip-ready",
            type: "payslip",
            status: "ready",
            title: "Payslip Ready!",
            message: `💰 Your payslip is now available:\n\n${payslipInfo}\n📍 View in Payroll Management`,
            bgColor: "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
            borderColor: "border-cyan-300/80",
          });
        }
      }

      // Check for holiday notifications
      const holidayRes = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "is tomorrow holiday?" }),
      });
      const holidayData = await holidayRes.json();

      if (holidayData.answer && holidayData.answer.includes("🎉 Yes!")) {
        // Extract holiday name from response
        const holidayMatch = holidayData.answer.match(/Tomorrow.*is (.+?)\n/);
        const holidayName = holidayMatch ? holidayMatch[1] : "a holiday";
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        newNotifications.push({
          id: "holiday-tomorrow",
          type: "holiday",
          status: "info",
          priority: 1,
          title: "Holiday Tomorrow!",
          message: `🎉 Tomorrow (${tomorrowDate}) is ${holidayName}\n\n🏖️ Enjoy your holiday break!\n\n💡 Office will be closed tomorrow.`,
          bgColor: "bg-gradient-to-br from-purple-400 via-pink-500 to-red-500",
          borderColor: "border-yellow-300/80",
          autoDismiss: false, // Important notifications stay
        });
      } else {
        // Check for weekend holiday tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay(); // 0 = Sunday, 6 = Saturday

        if (tomorrowDay === 0 || tomorrowDay === 6) {
          const dayName = tomorrowDay === 0 ? "Sunday" : "Saturday";
          const tomorrowDate = tomorrow.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

          newNotifications.push({
            id: "weekend-holiday",
            type: "holiday",
            status: "info",
            priority: 2,
            title: "Weekend Holiday Tomorrow!",
            message: `🎉 Tomorrow is ${dayName} (${tomorrowDate})\n\n🏖️ Enjoy your weekend break!\n\n💡 Office will be closed tomorrow.`,
            bgColor:
              "bg-gradient-to-br from-purple-400 via-pink-500 to-red-500",
            borderColor: "border-yellow-300/80",
            autoDismiss: true,
          });
        }
      }

      // Check for upcoming holidays in next 3 days
      const upcomingHolidayRes = await fetch("/api/assistant/answer", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ question: "next holiday" }),
      });
      const upcomingHolidayData = await upcomingHolidayRes.json();

      if (
        upcomingHolidayData.answer &&
        upcomingHolidayData.answer.includes("Next Holiday:")
      ) {
        const daysMatch = upcomingHolidayData.answer.match(
          /Days remaining: (\d+) days/
        );
        const holidayNameMatch = upcomingHolidayData.answer.match(
          /Next Holiday: (.+?)\n/
        );

        if (daysMatch && holidayNameMatch) {
          const daysRemaining = parseInt(daysMatch[1]);
          const holidayName = holidayNameMatch[1];

          // Show notification if holiday is within next 3 days (but not tomorrow, already handled above)
          if (daysRemaining > 1 && daysRemaining <= 3) {
            newNotifications.push({
              id: "upcoming-holiday",
              type: "holiday",
              status: "info",
              priority: 3,
              title: "Upcoming Holiday!",
              message: `🗓️ ${holidayName} is coming up in ${daysRemaining} days\n\n📅 Plan your work accordingly\n\n💡 Don't forget to complete pending tasks!`,
              bgColor:
                "bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500",
              borderColor: "border-orange-300/80",
              autoDismiss: true,
            });
          }
        }
      }

      const finalNotifications = newNotifications.length > 0 ? newNotifications : [
        {
          id: "checkin-welcome",
          type: "welcome",
          status: "success",
          priority: 4,
          title: "Attendance Checked In!",
          message: `🎉 You've successfully checked in for attendance. Have a productive day!`,
          bgColor: "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600",
          borderColor: "border-cyan-300/80",
        },
      ];
      
      setNotifications(finalNotifications);
      localStorage.setItem("currentNotifications", JSON.stringify(finalNotifications));
    } catch (error) {
      console.error("Error showing check-in notifications:", error);
    }
  };

  const dismissNotification = (notificationId) => {
    const updatedNotifications = notifications.filter((n) => n.id !== notificationId);
    setNotifications(updatedNotifications);
    localStorage.setItem("currentNotifications", JSON.stringify(updatedNotifications));
  };

  // Persistent notifications - no auto-dismiss during work session

  const router = useRouter();
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        //  console.log("Fetch /api/auth/me", res);
        if (res.status === 401) {
          setUser(null);
        } else if (res.ok) {
          const data = await res.json();
          // console.log("User data:", data);
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
        setUser(null);
      }
    };

    fetchUser();
  }, [router.pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout");
    document.cookie = "token=; Max-Age=0; path=/";
    setUser(null);
    router.push("/");
    router.reload();
  };

  // notification function called on check-in
  useEffect(() => {
    // Check work status from backend

    const fetchStatus = async () => {
      try {
        const checkInStatus = await fetch("/api/employee/work-status");
        if (!checkInStatus.ok) return;

        const statusData = await checkInStatus.json();
        const hasNotifications = localStorage.getItem("workSessionNotifications");

        if (statusData.isWorking) {
          if (!hasNotifications) {
            console.log("User checked in, showing notifications");
            showCheckInNotifications();
            localStorage.setItem("workSessionNotifications", "true");
          } else {
            const storedNotifications = localStorage.getItem("currentNotifications");
            if (storedNotifications) {
              setNotifications(JSON.parse(storedNotifications));
            }
          }
        } else {
          setNotifications([]);
          localStorage.removeItem("workSessionNotifications");
          localStorage.removeItem("currentNotifications");
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link
              href="/AboutUs"
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
            <Link
              href="/Contact"
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </Link>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href={
                    user.role === "employee"
                      ? "/employee/dashboard"
                      : "/dashboard"
                  }
                  className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium hover:text-yellow-300 transition-colors">
                    {user.name}
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
                  className="flex items-center space-x-2 px-4 py-2 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Admin Login</span>
                </Link>
                <Link
                  href="/employee/login"
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Employee Login</span>
                </Link>
              </div>
            )}
            {user && (
              <button
                className="relative flex items-center justify-center w-10 h-10 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200"
                onClick={() => setShowModal(true)}
              >
                <Bell className="w-5 h-5 text-white" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
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
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/AboutUs"
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Info className="w-5 h-5" />
              <span>About</span>
            </Link>
            <Link
              href="/Contact"
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </Link>

            {user ? (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <Link
                  href={
                    user.role === "employee"
                      ? "/employee/dashboard"
                      : "/dashboard"
                  }
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium">{user.name}</span>
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
                  className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Admin Login</span>
                </Link>
                <Link
                  href="/employee/login"
                  className="flex items-center space-x-3 px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Employee Login</span>
                </Link>
              </div>
            )}
            {user && (
              <div className="flex px-4">
                <button
                  className="relative flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200"
                  onClick={() => setShowModal(true)}
                >
                  <Bell className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
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
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-lg border ${n.bgColor} ${n.borderColor} text-white`}
                  >
                    <h3 className="font-semibold">{n.title}</h3>
                    <p className="text-sm whitespace-pre-line">{n.message}</p>
                    <button
                      onClick={() =>
                        setNotifications((prev) =>
                          prev.filter((x) => x.id !== n.id)
                        )
                      }
                      className="mt-2 text-xs underline text-white/90 hover:text-white"
                    >
                      Dismiss
                    </button>
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
