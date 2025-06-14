import React from "react";
import Link from "next/link";
import { FaUserTie } from "react-icons/fa";
import {
  HiOutlineHome,
  HiOutlineInformationCircle,
  HiOutlineMail,
  HiOutlineUserAdd,
} from "react-icons/hi";

const Header = () => {
  return (
    <div className="bg-gradient-to-r from-indigo-700 to-purple-600 w-full min-w-full shadow-lg z-50">
      <header className="px-10 py-5 text-white flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <FaUserTie size={40} />
          <h1 className="text-2xl font-bold tracking-wider">HRMS PORTAL</h1>
        </div>

        <nav className="flex space-x-8 mt-4 md:mt-0 text-lg font-medium">
          <Link href="/" className="flex items-center space-x-2 hover:text-yellow-300 transition-all duration-200">
            <HiOutlineHome />
            <span>Home</span>
          </Link>
          <Link href="/AboutUs" className="flex items-center space-x-2 hover:text-yellow-300 transition-all duration-200">
            <HiOutlineInformationCircle />
            <span>About Us</span>
          </Link>
          <Link href="/contact" className="flex items-center space-x-2 hover:text-yellow-300 transition-all duration-200">
            <HiOutlineMail />
            <span>Contact</span>
          </Link>
          <Link href="/signup" className="flex items-center space-x-2 hover:text-yellow-300 transition-all duration-200">
            <HiOutlineUserAdd />
            <span>Signup</span>
          </Link>
        </nav>
      </header>
    </div>
  );
};

export default Header;
