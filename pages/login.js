import { useState } from "react";
import { useRouter } from "next/router";
import { FiMail, FiLock } from "react-icons/fi";
import Image from 'next/image';
import jwt from "jsonwebtoken";

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

                        <h1 className="text-center text-indigo-600 text-3xl font-medium mb-6">
                            ADMIN LOGIN
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

                            <button
                                type="submit"
                                className="w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600"
                            >
                                Login
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
