import jwt from "jsonwebtoken";
import SideBar from "@/Components/SideBar";
import ProfileSection from "@/Components/ProfileSection";
import CalendarSection from "@/Components/CalendarSection";
import Head from "next/head";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, FileText, Calendar, Bell, User } from "lucide-react";
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
        verified: user.verified || null,
        form_submitted: user.form_submitted || null,
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

  const isAccessEnabled = user.role === 'superadmin' || (user.verified === 'verified' && user.form_submitted === true);

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
      <SideBar user={user}/>
      <div className="flex-1 overflow-auto">
        <div className="p-6">
        {isAccessEnabled ? (
          // Verified User Dashboard
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ProfileSection user={user} />
              <div></div> {/* Empty div to maintain grid layout */}
            </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className={`bg-white rounded-lg shadow p-6 transition-shadow ${
              isAccessEnabled ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (isAccessEnabled) {
                router.push('/employeeList');
              }
            }}
          >
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

          <div 
            className={`bg-white rounded-lg shadow p-6 transition-shadow ${
              isAccessEnabled ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (isAccessEnabled) {
                router.push('/hr/attendance');
              }
            }}
          >
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

          <div 
            className={`bg-white rounded-lg shadow p-6 transition-shadow ${
              isAccessEnabled ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (isAccessEnabled) {
                router.push('/hr/view-leave-requests');
              }
            }}>
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

          <div 
            className={`bg-white rounded-lg shadow p-6 transition-shadow ${
              isAccessEnabled ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (isAccessEnabled) {
                router.push('/Recruitment/recruitment');
              }
            }}
          >
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
                {isAccessEnabled ? (
                  // Verified User Actions
                  <>
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
                    <button
                      onClick={() => router.push('/compliance/empCompliance')}
                      className="w-full text-left p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-900">Employee Compliance</span>
                      </div>
                    </button>
                  </>
                ) : (
                  // Unverified User Actions
                  <>
                    <div className="w-full text-left p-4 bg-gray-100 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-500">Add Employee (Locked)</span>
                      </div>
                    </div>
                    <div className="w-full text-left p-4 bg-gray-100 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-500">View Attendance (Locked)</span>
                      </div>
                    </div>
                    <div className="w-full text-left p-4 bg-gray-100 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-500">Generate Payroll (Locked)</span>
                      </div>
                    </div>
                    <div className="w-full text-left p-4 bg-gray-100 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-3">
                        <UserCheck className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-500">Recruitment (Locked)</span>
                      </div>
                    </div>
                    <div className="w-full text-left p-4 bg-gray-100 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-500">Employee Compliance (Locked)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          </>
        ) : (
          // Unverified User - Profile Completion Card
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600 mb-6">
                Please complete your profile verification and form submission to access all HRMS features.
              </p>
              <button
                onClick={() => router.push('/settings/profile')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Complete Profile Setup
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
    </>
  );
}