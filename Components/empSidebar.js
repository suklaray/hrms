import { useRouter } from "next/router";

export default function Sidebar({ user }) {
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", path: "/employee/dashboard" },
    { name: "Profile Management", path: "/employee/profile" },
    { name: "Leave Requests", path: "/employee/leave-request" },
    { name: "Payslips & Docs", path: "/employee/emp-payslip" },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/employee/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/employee/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="min-h-screen w-72 bg-gray-900 text-white p-6 shadow-lg">
      <div className="mb-8">
        <h2 className="text-xl font-semibold">Hello, {user?.name}</h2>
        <p className="text-sm text-gray-400">{user?.position}</p>
      </div>

      <ul className="space-y-4">
        {navItems.map((item) => (
          <li key={item.name}>
            <button
              onClick={() => router.push(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition cursor-pointer ${
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
            className="w-full text-left px-4 py-3 bg-red-600 hover:bg-red-700 transition rounded-lg mt-6 cursor-pointer"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
}
