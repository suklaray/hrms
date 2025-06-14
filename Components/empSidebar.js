import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Sidebar({ handleLogout }) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const navItems = [
    { name: "Dashboard", path: "/employee/dashboard" },
    { name: "Profile Management", path: "/employee/profile" },
    { name: "Leave Requests & Status Tracking", path: "/employee/leave-request" },
    { name: "Payslips & Documents", path: "/employee/documents" },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("employee"));
    if (storedUser) setUser(storedUser);
  }, []);

  const handleToggleWork = async () => {
    const storedUser = JSON.parse(localStorage.getItem("employee"));
    const endpoint = isWorking ? "checkout" : "checkin";

    const res = await fetch(`/api/employee/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empid: storedUser.empid }),
    });
    
    const data = await res.json();
    if (res.ok) {
      setIsWorking(!isWorking);
      alert(data.message + (data.hours ? `(Worked: ${data.hours} hrs)` : ""));
    } else {
      alert(data.error);
    }
};

  return (
    <div className="min-h-screen w-72 bg-gray-900 text-white p-6 shadow-lg">
      {/* Toggle with Label */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-sm font-semibold text-white">Office Work</h1>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isWorking}
            onChange={handleToggleWork}
            disabled={loading}
          />
          <div className="w-12 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:bg-indigo-500 transition-colors duration-300"></div>

          <div className="absolute left-1 w-5 h-5 rounded-full shadow-md bg-white transition-transform duration-300 transform peer-checked:translate-x-full"></div>

        </label>
      </div>

      <ul className="space-y-4">
        {navItems.map((item) => (
          <li key={item.name}>
            <button
              onClick={() => router.push(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                router.pathname === item.path
                  ? "bg-indigo-600"
                  : "bg-gray-800 hover:bg-indigo-600"
              }`}
            >
              {item.name}
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 bg-red-600 hover:bg-red-700 transition rounded-lg mt-6"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
}
