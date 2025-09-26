import { useState, useEffect } from "react";
import Head from 'next/head';
import { FiMail } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - HRMS</title>
      </Head>
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-col lg:flex-row flex-grow">
          <div className="w-full lg:w-1/2 flex items-center justify-center bg-amber-10 py-6 lg:py-0">
            <Image 
              src="/images/homepage.svg" 
              width={600}
              height={400}
              alt="image" 
              className="w-full h-auto max-w-xs sm:max-w-sm lg:max-w-none"
            />
          </div>

          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-4 sm:p-6 lg:p-10">
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-lg shadow-xl w-full max-w-md">
              {message && <p className="text-green-500 text-center mb-4">{message}</p>}
              {error && <p className="text-red-500 text-center mb-4">{error}</p>}

              <h1 className="pb-6 lg:pb-8 text-center text-indigo-600 text-2xl sm:text-3xl font-medium mb-4 lg:mb-6">
                Forgot Password?
              </h1>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                <div className="flex items-center border-b-2 border-indigo-500 py-2">
                  <FiMail className="text-gray-500 mr-3" />
                  <input
                    className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="pt-6 lg:pt-8">
                  <button
                    type="submit"
                    className={`w-full text-white py-3 sm:py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300 cursor-pointer ${loading ? 'opacity-50' : ''}`}
                  >
                    {mounted && loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>

                <div className="pt-3 w-full text-center">
                  <Link href="/login" className="text-sm text-blue-500 hover:underline">
                    Back to Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
