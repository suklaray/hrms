import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import {
  AiOutlineUser,
  AiOutlineMail,
  AiOutlineLock,
  AiOutlineCalendar,
  AiOutlineIdcard,
  AiOutlineAim,
  AiOutlineFieldTime,
} from "react-icons/ai";
import { MdOutlineWork, MdGroup } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";

export default function RegisterEmployee() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [position, setPosition] = useState("");
    const [dateOfJoining, setDateOfJoining] = useState("");
    const [status, setStatus] = useState("");
    const [experience, setExperience] = useState("");
    const [employeeType, setEmployeeType] = useState("");
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [message, setMessage] = useState("");
    const [role, setRole] = useState("employee");

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage("");

    

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
        employee_type: employeeType,
        role
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || "Failed to register employee.");
      return;
    }

    setGeneratedPassword(data.password);
    setMessage(`${data.message}`);
    setName("");
    setEmail("");
    setPosition("");
    setDateOfJoining("");
    setStatus("");
    setExperience("");
    setEmployeeType("");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Sidebar */}
      <div>
        <SideBar
          setShowForm={() => {}}
          setShowEmployees={() => {}}
          showEmployees={false}
          handleLogout={handleLogout}
        />
      </div>

      {/* Form Area */}
      <div className="flex-1 flex justify-center items-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-2 border-indigo-200">
          <h2 className="text-4xl font-extrabold text-center text-indigo-700 mb-8">
            REGISTER NEW EMPLOYEE
          </h2>
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full Name */}
            <div className="relative">
              <AiOutlineUser className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <AiOutlineMail className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Position */}
            <div className="relative">
              <MdOutlineWork className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Position"
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Date of Joining */}
            <div className="relative">
              <AiOutlineCalendar className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Status */}
            <div className="relative">
              <AiOutlineIdcard className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Status (e.g. Active, On Leave)"
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Experience */}
            <div className="relative">
              <AiOutlineFieldTime className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <input
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Experience (Years)"
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Employee Type */}
            <div className="relative">
              <AiOutlineAim className="absolute left-3 top-3 text-indigo-600 text-xl" />
              <select
                value={employeeType}
                onChange={(e) => setEmployeeType(e.target.value)}
                required
                className="pl-10 w-full py-3 border-2 rounded-lg border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-700"
              >
                <option value="">Select Employee Type</option>
                <option value="Full_time">Full-time</option>
                <option value="Intern">Intern</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>

            {/* Role Selector */}
            <div className="flex items-center border-2 border-indigo-300 rounded-lg overflow-hidden">
            <MdGroup className="text-indigo-500 mx-3" />
            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full py-2 px-2 outline-none bg-white">
                <option value="">Select Role</option>
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
                <option value="ceo">CEO</option>
                <option value="superadmin">Super Admin</option>
            </select>
            </div>


            {generatedPassword && (
            <div className="relative">
                <AiOutlineLock className="absolute left-3 top-3 text-green-600 text-xl" />
                <input
                type="text"
                value={generatedPassword}
                readOnly
                className="pl-10 w-full py-3 bg-gray-100 border-2 rounded-lg border-green-400 text-green-800 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                Auto-generated password for login. Please copy & share securely.
                </p>
            </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-all"
            >
              Register Employee
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-center font-medium ${message.startsWith("..") ? "text-red-600" : "text-green-500"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
