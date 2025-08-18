import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaUserTie, FaUserCircle } from "react-icons/fa";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import {
  HiOutlineHome,
  HiOutlineInformationCircle,
  HiOutlineMail,
  HiOutlineUserAdd,
} from "react-icons/hi";

const Header = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // state for mobile menu
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          setUser(null);
        } else if (res.ok) {
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
    router.push("/");
    router.reload();
  };

  return (
    <div className="bg-gradient-to-r from-indigo-700 to-purple-600 w-full shadow-lg z-50">
      <header className="px-6 py-4 text-white flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <FaUserTie size={32} />
            <span className="text-lg font-bold tracking-wider">HRMS</span>
          </Link>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex space-x-8 text-lg font-medium">
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
              <Link href={user.role === "employee" ? "/employee/dashboard" : "/dashboard"}>
                <span>{user.name}</span>
              </Link>
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
              <Link href="/login" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>ADMIN SIGN IN</span>
              </Link>
              <Link href="/employee/login" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>EMPLOYEE SIGN IN</span>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
            {menuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-indigo-800 text-white px-6 py-4 space-y-4 text-lg font-medium">
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
            <div className="flex flex-col space-y-2 text-yellow-200 font-semibold">
              <div className="flex items-center space-x-2">
                <FaUserCircle size={24} />
                <Link href={user.role === "employee" ? "/employee/dashboard" : "/dashboard"}>
                  <span>{user.name}</span>
                </Link>
              </div>
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
              <Link href="/login" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>ADMIN SIGN IN</span>
              </Link>
              <Link href="/employee/login" className="flex items-center space-x-2 hover:text-yellow-300">
                <HiOutlineUserAdd />
                <span>EMPLOYEE SIGN IN</span>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Header;
