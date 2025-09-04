import { useState } from "react";
import Head from 'next/head';
import { FiMail } from "react-icons/fi";
import Image from "next/image";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("This email is not registered. Please enter a valid registered email.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - HRMS</title>
      </Head>
      <div className="min-h-screen flex flex-col">
      <div className="flex flex-grow">
        {/* Left Side - Image */}
        <div className="w-1/1 flex items-center justify-center bg-amber-10">
          <Image
            src="/images/homepage.svg"
            width={600}
            height={400}
            alt="image"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>

        {/* Right Side - Forgot Password Form */}
        <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
          <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
            {message && <p className="text-green-600 text-center mb-4 text-lg">{message}</p>}
            {error && <p className="text-red-600 text-center mb-4 text-lg">{error}</p>}

            <h1 className="pb-8 text-center text-indigo-600 text-3xl font-medium mb-6">
              Forgot Password?
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="flex items-center border-b-2 border-indigo-500 py-2">
                <FiMail className="text-gray-500 mr-3" />
                <input
                  className="w-full bg-transparent text-purple-950 focus:outline-none text-center lowercase"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                   onKeyDown={(e) => {
                        if (e.key === " ") e.preventDefault(); // block space key
                      }}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full text-white py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}