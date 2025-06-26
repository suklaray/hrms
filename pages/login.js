import { useState } from "react";
import { useRouter } from "next/router";
import { FiMail, FiLock } from "react-icons/fi";
import Image from 'next/image';
import jwt from "jsonwebtoken";
import Link from "next/link";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
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
        <div className="min-h-screen flex flex-col">
            {/* Two Columns */}
            <div className="flex flex-grow">
                {/* Left Side - Image */}
                <div className="w-1/1 flex items-center justify-center bg-amber-10">
                    <Image 
                        src="/img3.jpg" 
                        width={600}
                        height={400}
                        alt="image" 
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>

                {/* Right Side - Login */}
                <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                    <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
                        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                        <h1 className="pb-8 text-center text-indigo-600 text-3xl font-medium mb-6">
                            SIGN IN
                        </h1>

                        <form onSubmit={handleLogin} className="space-y-6">
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
                                />
                            </div>

                            {/* Password */}
                            <div className="flex items-center border-b-2 border-indigo-500 py-2">
                                <FiLock className="text-gray-500 mr-3" />
                                <input
                                    className="w-full bg-transparent text-purple-950 focus:outline-none text-center"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <div className="pt-8">
                            <button
                                type="submit"
                                className="  w-full text-white py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300"
                                >
                                Sign In
                                </button>
                                </div>
                            <div className="pt-3 w-full text-center">
                                                <Link
                                                    href="/signup"
                                                    className="inline-flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-all duration-200">
                                                    <span>Don&rsquo;t have an account? <span className="text-indigo-600">SignUp</span></span>
                                                </Link>
                                                <Link
                                                    href="/employee/login"
                                                    className="inline-flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-all duration-200"
                                                >
                                                    <span>Are You an Employee?<span className="text-indigo-600">Let&rsquo;s LogIn</span></span>
                                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
