import { useState } from "react";

export default function RegistrationForm({ onEmployeeAdded }) {
    const [empid, setEmpid] = useState("");
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
            body: JSON.stringify({ empid, name, email, position, date_of_joining: dateOfJoining, status, experience, password, role: "employee" })
        });

        const data = await res.json();
        if (!res.ok) {
            setMessage(data.error || "Failed to register employee.");
            return;
        }

        setMessage("Employee registered successfully!");
        onEmployeeAdded();  // Notify parent component to refresh the list

        // Clear form
        setEmpid(""); setName(""); setEmail(""); setPosition(""); setDateOfJoining("");
        setStatus(""); setExperience(""); setPassword("");
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                <button className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl" 
                    onClick={() => onEmployeeAdded()}>
                    &times;
                </button>
                <h3 className="text-xl text-center mb-4 font-medium text-purple-700">Register New Employee</h3>
                <form onSubmit={handleRegister} className="space-y-3">
                    <input type="text" value={empid} onChange={(e) => setEmpid(e.target.value)} placeholder="Employee ID" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Position" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="text" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience (years)" required className="border w-full px-3 py-2 rounded-lg" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="border w-full px-3 py-2 rounded-lg" />
                    <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition">
                        Register Employee
                    </button>
                </form>
                <p className="text-center text-red-500 mt-3">{message}</p>
            </div>
        </div>
    );
}
