import jwt from "jsonwebtoken";
import SideBar from "@/Components/SideBar";
import ProfileSection from "@/Components/ProfileSection";
import CalendarSection from "@/Components/CalendarSection";
import Head from "next/head";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileText, Calendar, Bell } from "lucide-react";
import Image from "next/image";
import { getUserFromToken } from "@/lib/getUserFromToken";
import prisma from "@/lib/prisma";

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || req?.cookies?.employeeToken || "";
  const user = getUserFromToken(token);

  if (!user || !["superadmin", "admin", "hr"].includes(user.role)) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid || user.id },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        role: true
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
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
      },
    },
  };
}
 const loaderProp =({ src }) => {
     return src;
}
export default function Dashboard({ user }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Stats API failed:', response.status);
        setStats(null);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} user={user} />
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
                  <span>
                    {mounted
                      ? new Date().toLocaleDateString("en-US", {
                          weekday: "long",   // Thursday
                          day: "numeric",    // 4
                          month: "long",     // September
                          year: "numeric",   // 2025
                        })
                      : ""}
                  </span>
                </div>

              {/*<button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>*/}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <ProfileSection user={user} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-500 text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-md font-medium text-gray-600">Total Employees</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats ? (stats.totalEmployees || 'No employees') : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-500 text-white">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-md font-medium text-gray-600">Currently Logged In</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats ? (stats.activeEmployees || 'None logged in') : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-500 text-white">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-md font-medium text-gray-600">Pending Leaves</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats ? (stats.pendingLeaves || 'No requests') : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-500 text-white">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-md font-medium text-gray-600">Total Candidates</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {stats ? (stats.totalCandidates || 'No candidates') : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar and Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CalendarSection />
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => router.push('/registerEmployee')}
                  className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Add Employee</span>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/hr/attendance')}
                  className="w-full text-left p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">View Attendance</span>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/hr/payroll/generate')}
                  className="w-full text-left p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">Generate Payroll</span>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/Recruitment/recruitment')}
                  className="w-full text-left p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <UserCheck className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-900">Recruitment</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Employees Section */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Employees</h3>
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
                ) : stats?.recentEmployees?.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentEmployees.map((employee, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          {employee.profile_photo ? (
                            <>
                              <Image
                                src={employee.profile_photo}
                                alt={employee.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                                loader={loaderProp}
                              />
                              <div className="hidden w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {employee.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-white font-medium text-sm">
                              {employee.name?.charAt(0)?.toUpperCase() || 'U'}
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
                          <p className="text-xs text-gray-400">
                            {new Date(employee.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {stats === null ? 'Unable to load data' : 'No employees added yet'}
                    </p>
                    {stats === null && (
                      <p className="text-xs text-gray-400 mt-1">Check server connection</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}