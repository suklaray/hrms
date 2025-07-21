import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "/Components/empSidebar";
import Image from "next/image";

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
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
    } catch (err) {
      console.error("Error fetching user:", err);
      router.replace("/employee/login");
    }
  }
  fetchUser();
}, [router]);


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
        body: JSON.stringify({ empid: user.empid }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsWorking(!isWorking);
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

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-indigo-100 to-sky-100">
      <Sidebar user={user} handleLogout={handleLogout} />
      <div className="flex-1 p-6 overflow-auto relative">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Welcome, {user.name}
          </h2>
          <div className="flex justify-center mb-6">
            <Image
              src={user.profile_photo || "/images/profile.png"}
              alt="Profile"
              width={128}
              height={128}
              className="rounded-full object-cover border-4 border-blue-500"
            />
          </div>
          <div className="mt-6 text-sm text-gray-700 border-t pt-4 space-y-1">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Position:</strong> {user.position}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
          <div className="mt-6 text-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isWorking}
                onChange={handleToggleWork}
              />
              <div className="w-12 h-7 bg-gray-300 rounded-full peer-checked:bg-indigo-500 transition-colors duration-300"></div>
              <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-md transform peer-checked:translate-x-5 transition-transform duration-300"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
