import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { User, LogOut, Menu, X, Home, Info, Mail, UserPlus, Building2 } from "lucide-react";

const Header = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
    <header className="bg-gradient-to-r from-indigo-700 to-purple-600 sticky top-0 z-50 shadow-lg">
      <div className="px-12 lg:px-20">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              HRMS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link 
              href="/AboutUs" 
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
            <Link 
              href="/Contact" 
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors duration-200 font-medium"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </Link>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href={user.role === "employee" ? "/employee/dashboard" : "/dashboard"}
                  className="flex items-center space-x-2 px-3 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium hover:text-yellow-300 transition-colors">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-white hover:text-red-300 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/login" 
                  className="flex items-center space-x-2 px-4 py-2 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Admin Login</span>
                </Link>
                <Link 
                  href="/employee/login" 
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Employee Login</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-2">
            <Link 
              href="/" 
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link 
              href="/AboutUs" 
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Info className="w-5 h-5" />
              <span>About</span>
            </Link>
            <Link 
              href="/Contact" 
              className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              <Mail className="w-5 h-5" />
              <span>Contact</span>
            </Link>

            {user ? (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <Link 
                  href={user.role === "employee" ? "/employee/dashboard" : "/dashboard"}
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 text-white hover:text-red-300 hover:bg-white/10 rounded-lg transition-all duration-200 w-full cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-white/20">
                <Link 
                  href="/login" 
                  className="flex items-center space-x-3 px-4 py-3 text-white hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Admin Login</span>
                </Link>
                <Link 
                  href="/employee/login" 
                  className="flex items-center space-x-3 px-4 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Employee Login</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;