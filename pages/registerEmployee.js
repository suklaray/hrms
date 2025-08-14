import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import SideBar from "@/Components/SideBar";
import {
  User,
  Mail,
  Lock,
  Calendar,
  IdCard,
  Briefcase,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";

export default function RegisterEmployee() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        position: "",
        dateOfJoining: "",
        status: "Active",
        experience: "",
        employeeType: "",
        role: "employee"
    });
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [generatedUsername, setGeneratedUsername] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [passwordCopied, setPasswordCopied] = useState(false);
    const [usernameCopied, setUsernameCopied] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setCurrentDate(new Date().toLocaleDateString());
    }, []);

    if (!mounted) {
        return null;
    }

    const validateForm = () => {
        if (!formData.name.trim()) {
            alert("Name is required");
            return false;
        }
        if (!formData.email.trim()) {
            alert("Email is required");
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            alert("Email is invalid");
            return false;
        }
        if (!formData.position.trim()) {
            alert("Position is required");
            return false;
        }
        if (!formData.dateOfJoining) {
            alert("Date of joining is required");
            return false;
        }
        if (!formData.experience) {
            alert("Experience is required");
            return false;
        }
        if (!formData.employeeType) {
            alert("Employee type is required");
            return false;
        }
        return true;
    };

    const handleInputChange = (field, value) => {
        console.log('Input change:', field, value); // Debug log
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        
        setIsLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    position: formData.position,
                    date_of_joining: formData.dateOfJoining,
                    status: formData.status,
                    experience: formData.experience,
                    employee_type: formData.employeeType,
                    role: formData.role
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.message || "Failed to register employee.");
                return;
            }

            setGeneratedPassword(data.password);
            setGeneratedUsername(data.empid || data.username || formData.email);
            setMessage(data.message);
            setFormData({
                name: "",
                email: "",
                position: "",
                dateOfJoining: "",
                status: "Active",
                experience: "",
                employeeType: "",
                role: "employee"
            });
        } catch (error) {
            setMessage("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setPasswordCopied(true);
            setTimeout(() => setPasswordCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy password:', err);
        }
    };

    const copyUsername = async () => {
        try {
            await navigator.clipboard.writeText(generatedUsername);
            setUsernameCopied(true);
            setTimeout(() => setUsernameCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy username:', err);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const InputField = ({ icon: Icon, label, type = "text", field, placeholder, error }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                {label}
            </label>
            <input
                type={type}
                value={formData[field]}
                onChange={(e) => setFormData(prev => ({...prev, [field]: e.target.value}))}
                placeholder={placeholder}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );

    const SelectField = ({ icon: Icon, label, field, options, error, placeholder }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                {label}
            </label>
            <select
                value={formData[field]}
                onChange={(e) => setFormData(prev => ({...prev, [field]: e.target.value}))}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
            >
                <option value="">{placeholder}</option>
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50">
            <SideBar handleLogout={handleLogout} />
            
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Employee Registration</h1>
                            <p className="text-gray-600">Add a new employee to the system</p>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{currentDate || new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Form Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">New Employee Details</h2>
                                        <p className="text-blue-100">Fill in the information below to register a new employee</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label>Full Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                                            placeholder="Enter employee's full name"
                                            className="w-full px-4 py-3 border rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label>Email Address</label>
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                                            placeholder="employee@company.com"
                                            className="w-full px-4 py-3 border rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label>Position</label>
                                        <input 
                                            type="text" 
                                            value={formData.position} 
                                            onChange={(e) => setFormData(prev => ({...prev, position: e.target.value}))}
                                            placeholder="Job title or position"
                                            className="w-full px-4 py-3 border rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label>Date of Joining</label>
                                        <input 
                                            type="date" 
                                            value={formData.dateOfJoining} 
                                            onChange={(e) => setFormData(prev => ({...prev, dateOfJoining: e.target.value}))}
                                            className="w-full px-4 py-3 border rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label>Status</label>
                                        <select 
                                            value={formData.status} 
                                            onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                                            className="w-full px-4 py-3 border rounded-xl"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label>Experience (Years)</label>
                                        <input 
                                            type="number" 
                                            value={formData.experience} 
                                            onChange={(e) => setFormData(prev => ({...prev, experience: e.target.value}))}
                                            placeholder="Years of experience"
                                            className="w-full px-4 py-3 border rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label>Employee Type</label>
                                        <select 
                                            value={formData.employeeType} 
                                            onChange={(e) => setFormData(prev => ({...prev, employeeType: e.target.value}))}
                                            className="w-full px-4 py-3 border rounded-xl"
                                        >
                                            <option value="">Select employee type</option>
                                            <option value="Full_time">Full-time</option>
                                            <option value="Part_time">Part-time</option>
                                            <option value="Intern">Intern</option>
                                            <option value="Contractor">Contractor</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label>Role</label>
                                        <select 
                                            value={formData.role} 
                                            onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
                                            className="w-full px-4 py-3 border rounded-xl"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="hr">HR</option>
                                            <option value="admin">Admin</option>
                                            <option value="ceo">CEO</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Login Credentials Display */}
                                {generatedPassword && (
                                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <h3 className="font-semibold text-green-800">Employee Registered Successfully!</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-green-700">Username</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="text"
                                                        value={generatedUsername}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-green-800"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={copyUsername}
                                                        className="p-2 text-green-600 hover:text-green-800 border border-green-300 rounded"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {usernameCopied && <p className="text-xs text-green-600 mt-1">Username copied!</p>}
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-green-700">Password</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={generatedPassword}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-green-800"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="p-2 text-green-600 hover:text-green-800 border border-green-300 rounded"
                                                    >
                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={copyPassword}
                                                        className="p-2 text-green-600 hover:text-green-800 border border-green-300 rounded"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {passwordCopied && <p className="text-xs text-green-600 mt-1">Password copied!</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="mt-8 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={handleRegister}
                                        disabled={isLoading}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Registering...
                                            </>
                                        ) : (
                                            <>
                                                <User className="w-5 h-5" />
                                                Register Employee
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/dashboard')}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            {/* Message Display */}
                            {message && (
                                <div className={`mx-8 mb-8 p-4 rounded-xl flex items-center gap-2 ${
                                    message.includes('successfully') || message.includes('Success') 
                                        ? 'bg-green-50 border border-green-200 text-green-800' 
                                        : 'bg-red-50 border border-red-200 text-red-800'
                                }`}>
                                    {message.includes('successfully') || message.includes('Success') ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5" />
                                    )}
                                    <span className="font-medium">{message}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
