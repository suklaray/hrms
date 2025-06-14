import { useState } from "react";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";

export default function RegisterEmployee() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [position, setPosition] = useState("");
    const [dateOfJoining, setDateOfJoining] = useState("");
    const [status, setStatus] = useState("");
    const [experience, setExperience] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email,
                position,
                date_of_joining: dateOfJoining,
                status,
                experience,
                password,
                role: "employee",
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            setMessage(data.error || "Failed to register employee.");
            return;
        }

        setMessage(data.message);
        // Clear form
        setName("");
        setEmail("");
        setPosition("");
        setDateOfJoining("");
        setStatus("");
        setExperience("");
        setPassword("");
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/login");
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar on the left */}
            <div >
                <SideBar
                    setShowForm={() => {}}
                    setShowEmployees={() => {}}
                    showEmployees={false}
                    handleLogout={handleLogout}
                />
            </div>

            {/* Register Form Section on the Right */}
            <div className="flex-1 bg-gray-50 flex justify-center items-center p-8">
                <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg border-2 border-indigo-300">
                    <h2 className="text-3xl font-extrabold text-indigo-700 text-center mb-6">Register New Employee</h2>
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Full Name" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Email Address" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="text" 
                                value={position} 
                                onChange={(e) => setPosition(e.target.value)} 
                                placeholder="Position" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="date" 
                                value={dateOfJoining} 
                                onChange={(e) => setDateOfJoining(e.target.value)} 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="text" 
                                value={status} 
                                onChange={(e) => setStatus(e.target.value)} 
                                placeholder="Status (e.g., Active, On Leave)" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="number" 
                                value={experience} 
                                onChange={(e) => setExperience(e.target.value)} 
                                placeholder="Experience (Years)" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Password" 
                                required 
                                className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            Register Employee
                        </button>
                    </form>

                    {message && (
                        <p className="mt-4 text-center text-sm text-red-500">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
