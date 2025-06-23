// pages/dashboard.js
import jwt from "jsonwebtoken";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";
import { useEffect } from "react";

export async function getServerSideProps({ req }) {
  const token = req.cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      props: {
        user: decoded,
      },
    };
  } catch (err) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
}

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
      <SideBar handleLogout={handleLogout} />
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
