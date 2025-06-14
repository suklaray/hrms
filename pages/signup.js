
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("HR"); 
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleSignup = async (e) => {
        e.preventDefault();
        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json();
        setMessage(data.message);
        if (res.ok) {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex flex-grow">
                <div className="w-1/2 flex items-center justify-center bg-gray-50">
                    <Image src="/img3.jpg" alt="HRMS Banner" className="max-w-full max-h-full" />
                </div>

                <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Signup</h2>
                        <form onSubmit={handleSignup} className="space-y-3">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                required
                                className="w-full px-3 py-2 border-b-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full px-3 py-2 border-b-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="w-full px-3 py-2 border-b-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 border-b-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Admin">Admin</option>
                                <option value="HR">HR</option>
                                <option value="Employee">Employee</option>
                            </select>
                            <button
                                type="submit"
                                className="w-full bg-indigo-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
                            >
                                Signup
                            </button>
                        </form>
                        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
