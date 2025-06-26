import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaUserTie, FaUserCircle } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import {
  HiOutlineHome,
  HiOutlineInformationCircle,
  HiOutlineMail,
  HiOutlineUserAdd,
} from "react-icons/hi";

const Header = () => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
        setUser(null);
      }
    };

    fetchUser();
  }, [router.pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout");
    document.cookie = "token=; Max-Age=0; path=/";
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="bg-gradient-to-r from-indigo-700 to-purple-600 w-full shadow-lg z-50">
      <header className="px-10 py-5 text-white flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <FaUserTie size={40} />
          <h1 className="text-2xl font-bold tracking-wider">HRMS PORTAL</h1>
        </div>

        <nav className="flex space-x-8 mt-4 md:mt-0 text-lg font-medium">
          <Link href="/" className="flex items-center space-x-2 hover:text-yellow-300">
            <HiOutlineHome />
            <span>HOME</span>
          </Link>
          <Link href="/AboutUs" className="flex items-center space-x-2 hover:text-yellow-300">
            <HiOutlineInformationCircle />
            <span>ABOUT US</span>
          </Link>
          <Link href="/Contact" className="flex items-center space-x-2 hover:text-yellow-300">
            <HiOutlineMail />
            <span>CONTACT</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-4 text-yellow-200 font-semibold">
              <FaUserCircle size={24} />
              <span>{user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-2 py-1 rounded hover:text-red-300 transition-all duration-200"
              >
                <FiLogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <Link href="/signup" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>SIGNUP</span>
              </Link>
              <Link href="/login" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>LOGIN</span>
              </Link>
            </>
          )}
        </nav>
      </header>
    </div>
  );
};

export default Header;
