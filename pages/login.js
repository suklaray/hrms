import { useState } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import { FiMail, FiLock } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from 'next/image';
import jwt from "jsonwebtoken";
import Link from "next/link";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            const token = data.token;

            // Save token
            localStorage.setItem("token", token);

            // Decode token to get user info
            const decoded = jwt.decode(token);
            localStorage.setItem("user", JSON.stringify(decoded));

            router.push("/dashboard");
        } else {
            setError(data.message || "Login failed");
        }
    };

    return (
        <>
            <Head>
                <title>Login - HRMS</title>
            </Head>
            <style jsx>{`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear {
                  display: none;
                }
                input[type="password"]::-webkit-credentials-auto-fill-button,
                input[type="password"]::-webkit-strong-password-auto-fill-button {
                  display: none !important;
                }
            `}</style>
            <div className="min-h-screen flex flex-col">
            {/* Two Columns */}
            <div className="flex flex-col lg:flex-row flex-grow">
                {/* Left Side - Image */}
                <div className="w-full lg:w-1/2 flex items-center justify-center bg-amber-10 py-6 lg:py-0">
                    <Image 
                        src="/images/homepage.svg" 
                        width={600}
                        height={400}
                        alt="image" 
                        className="w-full h-auto max-w-xs sm:max-w-sm lg:max-w-none"
                    />
                </div>

                {/* Right Side - Login */}
                <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-4 sm:p-6 lg:p-10">
                    <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-lg shadow-xl w-full max-w-md">
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                        <h1 className="pb-6 lg:pb-8 text-center text-indigo-600 text-2xl sm:text-3xl font-medium mb-4 lg:mb-6">
                            SIGN IN
                        </h1>

                        <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
                            {/* Email */}
                            <div className="flex items-center border-b-2 border-indigo-500 py-2">
                                <FiMail className="text-gray-500 mr-3" />
                                <input
                                    className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    autoComplete="off"
                                    autoCorrect="off"
                                />
                            </div>

                            {/* Password */}
                            <div className="flex items-center border-b-2 border-indigo-500 py-2 relative">
                                <FiLock className="text-gray-500 mr-3" />
                                <input
                                    className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        WebkitTextSecurity: 'none',
                                        MsRevealButton: 'none'
                                    }}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="off"
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


                            <div className="pt-6 lg:pt-8">
                            <button
                                type="submit"
                                className="w-full text-white py-3 sm:py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300 cursor-pointer"
                                >
                                Sign In
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