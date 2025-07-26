import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { withRoleProtection } from "@/lib/withRoleProtection";

export const getServerSideProps = withRoleProtection(["superadmin", "admin", "hr"]);

export default function Dashboard({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Pass user to Sidebar here */}
      <SideBar handleLogout={handleLogout} user={user} />
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-3xl font-semibold text-indigo-700 mb-2">
            Welcome, {user.name}
          </h2>
          <p className="text-lg text-gray-600 mb-1">
            <span className="font-medium">Role:</span> {user.role}
          </p>
          <p className="text-lg text-gray-600">
            <span className="font-medium">Employee ID:</span> {user.empid}
          </p>
        </div>
      </div>
    </div>
  );
}
