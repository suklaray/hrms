import jwt from "jsonwebtoken";
import SideBar from "@/Components/SideBar";
import ProfileSection from "@/Components/ProfileSection";
import NotificationSidebar from "@/Components/NotificationSidebar";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileText, TrendingUp, Calendar, Bell } from "lucide-react";
import { withRoleProtection } from "@/lib/withRoleProtection";
import Image from "next/image";

export const getServerSideProps = withRoleProtection(["superadmin", "admin", "hr"]);

export default function Dashboard({ user }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats();
    fetchNotifications();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setHasUnread(data.some(n => !n.viewed));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleNotificationClick = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, viewed: true } : n)
    );
    setHasUnread(notifications.some(n => !n.viewed && n.id !== notificationId));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value || '0'}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{mounted ? new Date().toLocaleDateString() : ''}</span>
              </div>
              <button 
                onClick={() => setShowNotifications(true)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Profile Section */}
          <div className="mb-6">
            <ProfileSection user={user} />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Employees"
              value={stats?.totalEmployees}
              icon={Users}
              color="bg-blue-500"
              trend="+12% from last month"
            />
            <StatCard
              title="Active Employees"
              value={stats?.activeEmployees}
              icon={UserCheck}
              color="bg-green-500"
              trend="+5% from last month"
            />
            <StatCard
              title="Pending Leaves"
              value={stats?.pendingLeaves}
              icon={Clock}
              color="bg-orange-500"
            />
            <StatCard
              title="Total Candidates"
              value={stats?.totalCandidates}
              icon={FileText}
              color="bg-purple-500"
              trend="+8% from last month"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Employees */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Recent Employees</h3>
                <p className="text-sm text-gray-600">Latest employee registrations</p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.recentEmployees?.map((employee, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                          {employee.profile_photo ? (
                            <Image 
                              src={employee.profile_photo} 
                              alt={employee.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-indigo-600 font-medium text-sm">
                              {employee.name?.charAt(0)?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.role} • ID: {employee.empid}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(employee.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common tasks</p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => router.push('/registerEmployee')}
                  className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Add Employee</p>
                      <p className="text-sm text-blue-600">Register new employee</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/hr/attendance')}
                  className="w-full text-left p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Attendance</p>
                      <p className="text-sm text-green-600">View attendance records</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/hr/payroll/generate')}
                  className="w-full text-left p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Generate Payroll</p>
                      <p className="text-sm text-purple-600">Process monthly payroll</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/Recruitment/recruitment')}
                  className="w-full text-left p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                >
                  <div className="flex items-center space-x-3">
                    <UserCheck className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">Recruitment</p>
                      <p className="text-sm text-orange-600">Manage candidates</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <NotificationSidebar 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}
