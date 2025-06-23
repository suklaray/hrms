
import { useState } from "react";
import { useRouter } from "next/router";
import { FaCheckCircle, FaRegCircle, FaTimesCircle } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import Image from "next/image";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(""); 
    const [message, setMessage] = useState("");
    const router = useRouter();

    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState("");
    const [strengthPercent, setStrengthPercent] = useState(0);
    const [strengthColor, setStrengthColor] = useState("bg-red-500");
    const [passwordFocused, setPasswordFocused] = useState(false);

    const [rules, setRules] = useState({
    length: false,
    upper: false,
    lower: false,
    numberOrSymbol: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const togglePassword = () => setShowPassword((prev) => !prev);
    const toggleConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

    const handleSignup = async (e) => {

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        if (passwordStrength !== "Strong") {
            setMessage("Password is not strong enough.");
            return;
        }

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

    const evaluatePasswordStrength = (password) => {
    let score = 0;

    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumberOrSymbol = /\d/.test(password) || /\W/.test(password);

    // Count score
    if (hasLength) score += 1;
    if (hasUpper) score += 1;
    if (hasLower) score += 1;
    if (hasNumberOrSymbol) score += 1;

    setRules({
        length: hasLength,
        upper: hasUpper,
        lower: hasLower,
        numberOrSymbol: hasNumberOrSymbol,
    });

    setStrengthPercent((score / 4) * 100);

    if (score === 4) {
        setStrengthColor("bg-green-500");
        setPasswordStrength("Strong");
    } else if (score === 3) {
        setStrengthColor("bg-yellow-400");
        setPasswordStrength("Medium");
    } else {
        setStrengthColor("bg-red-500");
        setPasswordStrength("Weak");
    }
    };

    const isFormValid =
        name.trim() !== "" &&
        email.trim() !== "" &&
        passwordStrength === "Strong" &&
        confirmPassword === password &&
        role !== "";


    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex flex-grow">
                <div className="w-1/2 flex items-center justify-center bg-gray-50">
                    <Image 
                        src="/img3.jpg" 
                        width={600}
                        height={400}
                        alt="image" 
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>

                <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                        <h2 className="text-3xl font-semibold text-indigo-600 mb-4">SIGN UP</h2>
                        <form onSubmit={handleSignup} className="space-y-3">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                required
                                className="w-full px-3 py-2 border-b-2 border-indigo-800 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full px-3 py-2 border-b-2 rounded-lg border-indigo-800 focus:ring-2 focus:ring-blue-500"
                            />
                            
                            <div className="relative w-full">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                    setPassword(e.target.value);
                                    evaluatePasswordStrength(e.target.value);
                                    }}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    placeholder="Password"
                                    required
                                    className="w-full px-3 py-2 border-b-2 rounded-lg border-indigo-800 focus:ring-2 focus:ring-blue-500 pr-10"
                                />
                                <span
                                    onClick={togglePassword}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-700 cursor-pointer"
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                                </div>

                            {passwordFocused && password && (
                            <div className="w-full mt-2 space-y-1">
                                {/* Strength Bar */}
                                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-500 rounded-full ${strengthColor}`}
                                    style={{
                                    width: `${strengthPercent}%`,
                                    backgroundImage:
                                        strengthColor === "bg-green-500"
                                        ? "linear-gradient(to right, #38b2ac, #48bb78)"
                                        : strengthColor === "bg-yellow-400"
                                        ? "linear-gradient(to right, #f6ad55, #ecc94b)"
                                        : "linear-gradient(to right, #f56565, #e53e3e)",
                                    }}
                                ></div>
                                </div>

                                {/* Strength Label */}
                                <div className="text-right">
                                <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    strengthColor === "bg-green-500"
                                        ? "bg-green-100 text-green-700"
                                        : strengthColor === "bg-yellow-400"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {passwordStrength}
                                </span>
                                </div>

                               <div className="mt-3 px-3 py-2 bg-blue-50 rounded-md shadow-sm">
                                        <ul className="text-sm text-left space-y-2">
                                            <li className={`flex items-center gap-2 ${rules.length ? "text-green-600" : "text-gray-500"}`}>
                                            {rules.length ? <FaCheckCircle className="text-base" /> : <FaRegCircle className="text-base" />}
                                            At least 8 characters
                                            </li>
                                            <li className={`flex items-center gap-2 ${rules.upper ? "text-green-600" : "text-gray-500"}`}>
                                            {rules.upper ? <FaCheckCircle className="text-base" /> : <FaRegCircle className="text-base" />}
                                            One uppercase letter
                                            </li>
                                            <li className={`flex items-center gap-2 ${rules.lower ? "text-green-600" : "text-gray-500"}`}>
                                            {rules.lower ? <FaCheckCircle className="text-base" /> : <FaRegCircle className="text-base" />}
                                            One lowercase letter
                                            </li>
                                            <li className={`flex items-center gap-2 ${rules.numberOrSymbol ? "text-green-600" : "text-gray-500"}`}>
                                            {rules.numberOrSymbol ? <FaCheckCircle className="text-base" /> : <FaRegCircle className="text-base" />}
                                            One number or special character
                                            </li>
                                        </ul>
                                        </div>
                                

                            </div>
                            )}

                            <div className="relative w-full mt-3">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    required
                                    className="w-full px-3 py-2 border-b-2 rounded-lg border-indigo-800 focus:ring-2 focus:ring-blue-500 pr-10"
                                />
                                <span
                                    onClick={toggleConfirmPassword}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-700 cursor-pointer"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                                </div>


                            {confirmPassword && (
                                <div className="flex items-center space-x-2 pl-2">
                                    {password === confirmPassword ? (
                                    <>
                                        <FaCheckCircle className="text-green-600 text-base" />
                                        <span className="text-green-600 text-sm">Password matched.</span>
                                    </>
                                    ) : (
                                    <>
                                        <FaTimesCircle className="text-red-600 text-xl" />
                                        <span className="text-red-600 text-sm">Passwords do not match.</span>
                                    </>
                                    )}
                                </div>
                                )}


                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 border-b-2 rounded-lg border-indigo-800 focus:ring-2 focus:ring-blue-500"
                                >
                                <option value="" disabled>
                                    Select Role
                                </option>
                                <option value="admin">Admin</option>
                                <option value="hr">HR</option>
                                <option value="employee">Employee</option>
                                </select>


                            <div className="h1"></div>

                            <button
                                type="submit"
                                disabled={!isFormValid}
                                className={`w-full py-2 rounded-lg font-semibold transition duration-200 ${
                                    isFormValid
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:opacity-90"
                                    : "bg-gradient-to-r from-purple-300 to-indigo-200 cursor-not-allowed"
                                }`}
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
