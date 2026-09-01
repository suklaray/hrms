import SideBar from "@/Components/SideBar";
import ProfileSection from "@/Components/ProfileSection";
import CalendarSection from "@/Components/CalendarSection";
import RegularizationCard from "@/Components/RegularizationCard";
import RegularizationModal from "@/Components/RegularizationModal";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileText, User } from "lucide-react";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";
import { toast } from "react-toastify";
import EmployeeDashboard from "./employee/dashboard";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  const hasDashboardAccess = await checkPermission(
    user,
    PERMISSION_KEYS.DASHBOARD_VIEW
  );

  if (!hasDashboardAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }
  const permissions = await getUserPermissions(user);
  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { empid: true, name: true, email: true, profile_photo: true, position: true, role: true ,roleId: true, rbacRole:{select:{id:true,name:true}}},
    });
  } catch (e) {
    console.error("Dashboard getServerSideProps error:", e);
  }

  return {
    props: {
      user: {
        id: user.id,
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: (userData?.role || user.role).toLowerCase(),
        email: userData?.email || user.email,
        profile_photo: userData?.profile_photo || null,
        position: userData?.position || null,
        verified: user.verified || null,
        form_submitted: user.form_submitted || false,
        roleId: userData?.roleId || user.roleId || null,
        rbacRole: userData?.rbacRole || null,
      },
      permissions: Array.from(permissions),
    },
  };
}

// ─── HR/Admin dashboard view ──────────────────────────────────────────────────
function HRDashboardView({ user, permissions }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [missedCheckout, setMissedCheckout] = useState(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const isAccessEnabled = user.role === "superadmin" || (user.verified === "verified" && user.form_submitted === true);
  const can = (permission) => {
    if (user.role === "superadmin") return true;

    return permissions.includes(permission);
  };
  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.ok ? r.json() : null).then(d => setStats(d)).catch(() => { toast.error("Failed to fetch dashboard stats"); });
    fetch("/api/attendance/check-missed-checkout", { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.hasMissedCheckout) setMissedCheckout(d.attendance); }).catch(() => { toast.error("Failed to check missed checkout"); });
  }, []);
  const dashboardCards = [
    {
      label: "Total Employees",
      value: stats?.totalEmployees,
      icon: Users,
      color: "bg-blue-500",
      route: "/employeeList",
      permission: PERMISSION_KEYS.EMPLOYEE_VIEW,
    },
    {
      label: "Currently Logged In",
      value: stats?.activeEmployees,
      icon: UserCheck,
      color: "bg-green-500",
      route: "/hr/attendance",
      permission: PERMISSION_KEYS.ATTENDANCE_VIEW,
    },
    {
      label: "Pending Leaves",
      value: stats?.pendingLeaves,
      icon: Clock,
      color: "bg-orange-500",
      route: "/hr/view-leave-requests",
      permission: PERMISSION_KEYS.LEAVE_VIEW,
    },
    {
      label: "Total Candidates",
      value: stats?.totalCandidates,
      icon: FileText,
      color: "bg-purple-500",
      route: "/Recruitment/recruitment",
      permission: PERMISSION_KEYS.RECRUITMENT_VIEW,
    },
  ];
  const quickActions = [
    {
      label: "Add Employee",
      icon: Users,
      color: "blue",
      route: "/registerEmployee",
      permission: PERMISSION_KEYS.EMPLOYEE_CREATE,
    },
    {
      label: "View Attendance",
      icon: Clock,
      color: "green",
      route: "/hr/attendance",
      permission: PERMISSION_KEYS.ATTENDANCE_VIEW,
    },
    {
      label: "Generate Payroll",
      icon: FileText,
      color: "purple",
      route: "/hr/payroll/generate",
      permission: PERMISSION_KEYS.PAYROLL_GENERATE,
    },
    {
      label: "Recruitment",
      icon: UserCheck,
      color: "orange",
      route: "/Recruitment/recruitment",
      permission: PERMISSION_KEYS.RECRUITMENT_VIEW,
    },
  ];
  return (
    <div className="p-6">
      {isAccessEnabled ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProfileSection user={user} />
            <RegularizationCard missedCheckout={missedCheckout} onOpenModal={() => setShowRegModal(true)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboardCards
              .filter((card) => can(card.permission))
              .map(({ label, value, icon: Icon, color, route }) => (
                <div
                  key={label}
                  onClick={() => router.push(route)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${color} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="ml-4">
                      <p className="text-md font-medium text-gray-600">
                        {label}
                      </p>

                      <p className="text-sm font-semibold text-gray-900">
                        {stats ? (value || "—") : "Loading..."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {can(PERMISSION_KEYS.CALENDAR_VIEW) && (
              <CalendarSection />
            )}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200"><h3 className="text-lg font-medium text-gray-900">Quick Actions</h3></div>
              <div className="p-6 space-y-3">
                {quickActions
                  .filter((action) => can(action.permission))
                  .map(({ label, icon: Icon, color, route }) => (
                    <button
                      key={label}
                      onClick={() => router.push(route)}
                      className={`w-full text-left p-4 bg-${color}-50 hover:bg-${color}-100 rounded-lg transition-colors cursor-pointer`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 text-${color}-600`} />
                        <span className={`font-medium text-${color}-900`}>
                          {label}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><User className="w-8 h-8 text-yellow-600" /></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
            <p className="text-gray-600 mb-6">Please complete your profile verification and form submission to access all HRMS features.</p>
            <button onClick={() => router.push("/settings/profile")} className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">Complete Profile Setup</button>
          </div>
        </div>
      )}
      {showRegModal && missedCheckout &&
        can(PERMISSION_KEYS.ATTENDANCE_REGULARIZE) && (
          <RegularizationModal
            attendance={missedCheckout}
            onClose={() => setShowRegModal(false)}
            onSubmitted={() => {
              setShowRegModal(false);
              setMissedCheckout(null);
            }}
          />
        )}
    </div>
  );
}

// ─── Main unified dashboard ───────────────────────────────────────────────────
export default function Dashboard({ user, permissions = [] }) {
  const isSuper = user?.role === "superadmin" || user?.rbacRole?.name === "Super Admin";
  const hasManagementPermissions =
    isSuper ||
    permissions.includes("employee.view") ||
    permissions.includes("attendance.view") ||
    permissions.includes("leave.view") ||
    permissions.includes("recruitment.view") ||
    permissions.includes("payroll.view") ||
    permissions.includes("compliance.view") ||
    ["admin", "hr", "ceo", "superadmin"].includes(user?.role?.toLowerCase());

  return (
    <>
      <Head><title>Dashboard - HRMS</title></Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar user={user} />
        <div className="flex-1 overflow-auto">
          {hasManagementPermissions ? (
            <HRDashboardView user={user} permissions={permissions} />
          ) : (
            <EmployeeDashboard user={user} permissions={permissions} />
          )}
        </div>
      </div>
    </>
  );
}
