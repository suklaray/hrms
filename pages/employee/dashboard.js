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
      const res = await fetch("/api/auth/employee/me");
      if (!res.ok) return router.push("/employee/login");
      const data = await res.json();
      setUser(data.user);
    }
    fetchUser();
  }, [router]); 

  const handleLogout = async () => {
  console.log("Logout clicked"); // Add this

  await fetch("/api/auth/employee/logout", {
    method: "POST",
    credentials: "include",
  });

  router.push("/employee/login");
};



  const handleToggleWork = async () => {
    const endpoint = isWorking ? "checkout" : "checkin";
    const res = await fetch(`/api/employee/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empid: user?.empid }),
    });
    const data = await res.json();
    if (res.ok) {
      setIsWorking(!isWorking);
      alert(data.message + (data.hours ? `(Worked: ${data.hours} hrs)` : ""));
    } else {
      alert(data.error);
    }
  };

  if (!user) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar user={user} handleLogout={handleLogout} />
      <div className="flex-1 p-6 overflow-auto relative">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Welcome, {user?.name || "Employee"} 👋
          </h2>
          <p className="text-center text-gray-600 mb-4">
            This is your employee dashboard.
          </p>

          <div className="flex justify-center mb-6">
            <Image
              src={user?.profile_photo || "/profile.png"}
              alt="Profile Image"
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
              <div className="w-12 h-7 bg-gray-600 rounded-full peer peer-checked:bg-indigo-500 transition-colors duration-300"></div>
              <div className="absolute left-1 w-5 h-5 rounded-full shadow-md bg-white transition-transform duration-300 transform peer-checked:translate-x-full"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}