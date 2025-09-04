import { useState } from "react";
import { useRouter } from "next/router";
import { FiMail, FiLock } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const res = await fetch("/api/auth/employee/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    router.push("/employee/dashboard");
  } catch (err) {
    setError("An error occurred. Please try again.");
  }
};


  return (
    <>
      <style jsx>{`
        input[type="password"]::-ms-reveal {
          display: none;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
      `}</style>
      <div className="min-h-screen flex flex-col">
      <div className="flex flex-grow">
        {/* Left side image */}
        <div className="w-1/1 flex items-center justify-center bg-amber-10">
          <Image 
            src="/images/homepage.svg" 
            width={600}
            height={400}
            alt="image" 
            style={{ width: '100%', height: 'auto' }}
            />
        </div>

        {/* Right side form */}
        <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
          <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            <h1 className="pb-8 text-center text-indigo-600 text-3xl font-medium mb-6">
              EMPLOYEE SIGN IN
            </h1>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email/Username input */}
              <div className="flex items-center border-b-2 border-indigo-500 py-2">
                <FiMail className="text-gray-500 mr-3" />
                <input
                  className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                />
              </div>

              {/* Password input */}
              <div className="flex items-center border-b-2 border-indigo-500 py-2 relative">
                <FiLock className="text-gray-500 mr-3" />
                <input
                  className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    WebkitTextSecurity: 'none',
                    MsRevealButton: 'none'
                  }}
                />
                <span
                  className="absolute right-0 cursor-pointer pr-2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="w-full text-right mt-0">
                <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit button */}
              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full text-white py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300"
                >
                  Sign In
                </button>
              </div>

              {/* Optional links */}
              {/* <div className="pt-3 w-full text-center">
                <Link href="/login" className="inline-flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-all duration-200">
                  <span>Admin? <span className="text-indigo-600">Login here</span></span>
                </Link>
              </div> */}
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
