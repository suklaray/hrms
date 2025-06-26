// pages/signup.js
import { useState } from "react";
import { useRouter } from "next/router";
import { FaCheckCircle, FaRegCircle, FaTimesCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState("");
    const [strengthPercent, setStrengthPercent] = useState(0);
    const [strengthColor, setStrengthColor] = useState("bg-red-500");
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

    const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPasswordStrength("");
    setStrengthPercent(0);
    setStrengthColor("bg-red-500");
    setRules({ length: false, upper: false, lower: false, numberOrSymbol: false });
    setPasswordFocused(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
};

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

    const router = useRouter();

    const handleSignup = async (e) => {
        e.preventDefault();
        setStatusMessage({ text: "", type: "" });

        if (password !== confirmPassword) {
            setStatusMessage({ text: "Passwords do not match.", type: "error" });
            return;
        }

        if (passwordStrength !== "Strong") {
            setStatusMessage({ text: "Password is not strong enough.", type: "error" });
            return;
        }

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (res.ok) {
            setStatusMessage({ text: "Signup successful!", type: "success" });
            resetForm();
        } else {
            setStatusMessage({ text: data.message || "Signup failed.", type: "error" });
        }
    };

    const evaluatePasswordStrength = (password) => {
        let score = 0;
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumberOrSymbol = /\d/.test(password) || /\W/.test(password);

        if (hasLength) score += 1;
        if (hasUpper) score += 1;
        if (hasLower) score += 1;
        if (hasNumberOrSymbol) score += 1;

        setRules({ length: hasLength, upper: hasUpper, lower: hasLower, numberOrSymbol: hasNumberOrSymbol });
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
        confirmPassword === password;

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex flex-grow">
                <div className="w-full relative h-screen">
                    <Image src="/homePage.avif" alt="Homepage Background" fill className="z-0" />
                </div>
                <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
                        <h2 className="text-3xl font-semibold text-indigo-600 mb-4 pb-8">SIGN UP</h2>
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
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === " ") {
                                        e.preventDefault();
                                        }
                                    }}
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
                                <span onClick={togglePassword} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-700 cursor-pointer">
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>

                            {passwordFocused && password && (
                                <div className="w-full mt-2 space-y-1">
                                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${strengthColor}`}
                                            style={{ width: `${strengthPercent}%` }}
                                        ></div>
                                    </div>
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
                                            <li className={`flex items-center gap-2 ${rules.length ? "text-green-600" : "text-gray-500"}`}>{rules.length ? <FaCheckCircle /> : <FaRegCircle />} At least 8 characters</li>
                                            <li className={`flex items-center gap-2 ${rules.upper ? "text-green-600" : "text-gray-500"}`}>{rules.upper ? <FaCheckCircle /> : <FaRegCircle />} One uppercase letter</li>
                                            <li className={`flex items-center gap-2 ${rules.lower ? "text-green-600" : "text-gray-500"}`}>{rules.lower ? <FaCheckCircle /> : <FaRegCircle />} One lowercase letter</li>
                                            <li className={`flex items-center gap-2 ${rules.numberOrSymbol ? "text-green-600" : "text-gray-500"}`}>{rules.numberOrSymbol ? <FaCheckCircle /> : <FaRegCircle />} One number or special character</li>
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
                                <span onClick={toggleConfirmPassword} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-700 cursor-pointer">
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

                            <div className="pt-8 pb-3">
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`w-full py-2 rounded-lg font-semibold transition duration-200 ${
                                        isFormValid
                                            ? "bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:opacity-90"
                                            : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white cursor-not-allowed"
                                    }`}
                                >
                                    Signup
                                </button>
                            </div>

                            <div className="pt-3 w-full text-center">
                                <Link href="/login" className="text-gray-700 hover:text-indigo-600 transition-all duration-200">
                                    Already have an account? <span className="text-indigo-600">LogIn</span>
                                </Link>
                                <br />
                                <Link href="/employee/login" className="text-gray-700 hover:text-indigo-600 transition-all duration-200">
                                    Are You an Employee? <span className="text-indigo-600">Let&rsquo;s LogIn</span>
                                </Link>
                            </div>
                        </form>

                        {statusMessage.text && (
                            <p
                                className={`mt-4 text-center font-medium ${
                                    statusMessage.type === "success" ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {statusMessage.text}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
