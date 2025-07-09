import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Image from "next/image";
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaRegCircle } from "react-icons/fa";
import Link from "next/link";
export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength indicators
  const [strengthColor, setStrengthColor] = useState("");
  const [strengthPercent, setStrengthPercent] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [rules, setRules] = useState({ length: false, upper: false, lower: false, numberOrSymbol: false });
  const [passwordFocused, setPasswordFocused] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const evaluatePasswordStrength = (val) => {
    const length = val.length >= 8;
    const upper = /[A-Z]/.test(val);
    const lower = /[a-z]/.test(val);
    const numberOrSymbol = /[0-9!@#$%^&*]/.test(val);

    const passed = [length, upper, lower, numberOrSymbol].filter(Boolean).length;
    setRules({ length, upper, lower, numberOrSymbol });

    if (passed <= 1) {
      setStrengthColor("bg-red-500");
      setStrengthPercent(25);
      setPasswordStrength("Weak");
    } else if (passed === 2 || passed === 3) {
      setStrengthColor("bg-yellow-400");
      setStrengthPercent(50);
      setPasswordStrength("Moderate");
    } else if (passed === 4) {
      setStrengthColor("bg-green-500");
      setStrengthPercent(100);
      setPasswordStrength("Strong");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await axios.post("/api/auth/reset-password", { token, password });
      setMessage(res.data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Error resetting password.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-grow">
        <div className="w-1/1 flex items-center justify-center bg-amber-10">
          <Image
            src="/images/homepage.svg"
            width={600}
            height={400}
            alt="image"
            style={{ width: "100%", height: "auto" }}
          />
        </div>

        <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
          <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
            <h1 className="pb-8 text-center text-indigo-600 text-3xl font-medium mb-6">
              Reset Password
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password */}
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    evaluatePasswordStrength(e.target.value);
                  }}
                  onKeyDown={(e) => {
                        if (e.key === " ") {
                        e.preventDefault();  // stop space from being entered
                        }
                    }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-3 py-2 border-b-2 rounded-lg border-indigo-800 focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <span onClick={togglePassword} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-700 cursor-pointer">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {/* Password strength + rules */}
              {passwordFocused && password && (
                <div className="w-full mt-2 space-y-1">
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-500 rounded-full ${strengthColor}`} style={{ width: `${strengthPercent}%` }}></div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      strengthColor === "bg-green-500"
                        ? "bg-green-100 text-green-700"
                        : strengthColor === "bg-yellow-400"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="mt-3 px-3 py-2 bg-blue-50 rounded-md shadow-sm">
                    <ul className="text-sm text-left space-y-2">
                      <li className={`flex items-center gap-2 ${rules.length ? "text-green-600" : "text-gray-500"}`}>
                        {rules.length ? <FaCheckCircle /> : <FaRegCircle />} At least 8 characters
                      </li>
                      <li className={`flex items-center gap-2 ${rules.upper ? "text-green-600" : "text-gray-500"}`}>
                        {rules.upper ? <FaCheckCircle /> : <FaRegCircle />} One uppercase letter
                      </li>
                      <li className={`flex items-center gap-2 ${rules.lower ? "text-green-600" : "text-gray-500"}`}>
                        {rules.lower ? <FaCheckCircle /> : <FaRegCircle />} One lowercase letter
                      </li>
                      <li className={`flex items-center gap-2 ${rules.numberOrSymbol ? "text-green-600" : "text-gray-500"}`}>
                        {rules.numberOrSymbol ? <FaCheckCircle /> : <FaRegCircle />} One number or special character
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Confirm password */}
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                        if (e.key === " ") {
                        e.preventDefault();  // stop space from being entered
                        }
                    }}
                  placeholder="Confirm new password"
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

              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full text-white py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition duration-300"
                >
                  Set New Password
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}              
            {message && (
            <div className="mt-3 text-sm text-green-600">
                <p>{message}</p>
                <p className="mt-2">
                <Link  
                    href="/login"
                    className="text-indigo-600 hover:underline"
                >
                    Go to Signin
                </Link>
                </p>
            </div>
            )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
