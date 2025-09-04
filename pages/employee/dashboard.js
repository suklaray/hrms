import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import Sidebar from "/Components/empSidebar";
import Image from "next/image";
import { Clock, Calendar, User, Mail, Briefcase, Shield, Bell, TrendingUp } from "lucide-react";


export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [stats, setStats] = useState({ todayHours: '0.0', weekHours: '0.0', monthHours: '0.0' });

  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/employee/me", {
          credentials: "include",
        });
        if (!res.ok) {
          return router.replace("/employee/login");
        }
        const data = await res.json();
        setUser(data.user);
        setIsWorking(data.user.isWorking);
        if (data.user.isWorking && data.user.workStartTime) {
          setWorkStartTime(new Date(data.user.workStartTime));
        } else {
          setWorkStartTime(null);
        }
        
        // Fetch stats
        const statsRes = await fetch("/api/employee/stats", {
          credentials: "include",
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setUser({ error: 'Unable to load profile data' });
      }
    }
    fetchUser();
  }, [router]);



  // Timer effect
  useEffect(() => {
    let interval;
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now - workStartTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [isWorking, workStartTime]);


  const handleLogout = async () => {
    try {
      await fetch("/api/auth/employee/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/employee/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleToggleWork = async () => {
    if (!user) return;
    const endpoint = isWorking ? "checkout" : "checkin";
    try {
      const res = await fetch(`/api/employee/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        // Refetch user data to get updated work status
        const userRes = await fetch("/api/auth/employee/me", {
          credentials: "include",
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
          setIsWorking(userData.user.isWorking);
          if (userData.user.isWorking && userData.user.workStartTime) {
            setWorkStartTime(new Date(userData.user.workStartTime));
          } else {
            setWorkStartTime(null);
            setElapsedTime('00:00:00');
          }
        }
        alert(
          data.message + (data.hours ? ` (Worked: ${data.hours} hrs)` : "")
        );
      } else {
        alert(data.error || "An error occurred.");
      }
    } catch (err) {
      console.error("Work toggle error:", err);
      alert("Failed to update work status.");
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (user.error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{user.error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value || '0'}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Employee Dashboard - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} handleLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Work Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Clock className={`w-8 h-8 ${isWorking ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isWorking ? 'Currently Working' : 'Not Working'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isWorking ? 'You are checked in' : 'Click to start your work day'}
                  </p>
                  {isWorking && (
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-lg font-mono font-bold text-green-600">{elapsedTime}</span>
                    </div>
                  )}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isWorking}
                  onChange={handleToggleWork}
                />
                <div className="w-40 sm:w-44 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full peer-checked:from-green-400 peer-checked:to-green-600 transition-all duration-500 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-xs sm:text-sm font-medium">
                    <span className={`transition-all duration-300 whitespace-nowrap ${isWorking ? 'text-white' : 'text-gray-700'}`}>
                      Check In
                    </span>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isWorking ? 'text-white' : 'text-gray-700'}`}>
                      Check Out
                    </span>
                  </div>
                </div>
                <div className="absolute left-1 top-1 w-18 sm:w-20 h-10 bg-white rounded-full shadow-lg transform peer-checked:translate-x-20 sm:peer-checked:translate-x-22 transition-all duration-500 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {isWorking ? 'Check Out' : 'Check In'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Profile Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Profile Card */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Profile Overview</h3>
                <p className="text-sm text-gray-600">Your personal information</p>
              </div>
              <div className="p-6">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-indigo-200 overflow-hidden">
                      {user?.profile_photo ? (
                        <Image
                          src={user.profile_photo}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${user?.profile_photo ? 'hidden' : ''}`}>
                        <User className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium text-gray-900">{user.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Position</p>
                          <p className="font-medium text-gray-900">{user.position ||'Not specified' }</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Role</p>
                          <p className="font-medium text-gray-900 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
                <p className="text-sm text-gray-600">Your work summary</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Todays Hours</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.todayHours}h</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">This Week</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.weekHours}h</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">This Month</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{stats.monthHours}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">Common tasks and shortcuts</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => router.push('/employee/leave-request')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Apply Leave</p>
                      <p className="text-sm text-blue-600">Request time off</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/employee/attendance')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">View Attendance</p>
                      <p className="text-sm text-green-600">Check your records</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/employee/profile')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Update Profile</p>
                      <p className="text-sm text-purple-600">Edit your details</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/employee/emp-payslip')}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200 text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">Payslips & Docs</p>
                      <p className="text-sm text-orange-600">View documents</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
    </>
  );
}
