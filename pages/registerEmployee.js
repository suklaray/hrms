import { useState } from "react";
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
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [passwordCopied, setPasswordCopied] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email is invalid";
        }
        if (!formData.position.trim()) newErrors.position = "Position is required";
        if (!formData.dateOfJoining) newErrors.dateOfJoining = "Date of joining is required";
        if (!formData.experience) newErrors.experience = "Experience is required";
        if (!formData.employeeType) newErrors.employeeType = "Employee type is required";
        if (!formData.role) newErrors.role = "Role is required";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
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

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const InputField = ({ icon: Icon, label, type = "text", field, placeholder, error, ...props }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                {label}
            </label>
            <div className="relative">
                <input
                    type={type}
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    {...props}
                />
                {error && (
                    <div className="absolute right-3 top-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>
    );

    const SelectField = ({ icon: Icon, label, field, options, error, placeholder }) => (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                {label}
            </label>
            <div className="relative">
                <select
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                        error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <option value="">{placeholder}</option>
                    {options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                {error && (
                    <div className="absolute right-10 top-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
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
                            <span>{new Date().toLocaleDateString()}</span>
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

                            <form onSubmit={handleRegister} className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField
                                        icon={User}
                                        label="Full Name"
                                        field="name"
                                        placeholder="Enter employee's full name"
                                        error={errors.name}
                                    />

                                    <InputField
                                        icon={Mail}
                                        label="Email Address"
                                        type="email"
                                        field="email"
                                        placeholder="employee@company.com"
                                        error={errors.email}
                                    />

                                    <InputField
                                        icon={Briefcase}
                                        label="Position"
                                        field="position"
                                        placeholder="Job title or position"
                                        error={errors.position}
                                    />

                                    <InputField
                                        icon={Calendar}
                                        label="Date of Joining"
                                        type="date"
                                        field="dateOfJoining"
                                        error={errors.dateOfJoining}
                                    />

                                    <SelectField
                                        icon={IdCard}
                                        label="Status"
                                        field="status"
                                        placeholder="Select status"
                                        options={[
                                            { value: "Active", label: "Active" },
                                            { value: "On Leave", label: "On Leave" },
                                            { value: "Inactive", label: "Inactive" }
                                        ]}
                                        error={errors.status}
                                    />

                                    <InputField
                                        icon={Clock}
                                        label="Experience (Years)"
                                        type="number"
                                        field="experience"
                                        placeholder="Years of experience"
                                        min="0"
                                        step="0.5"
                                        error={errors.experience}
                                    />

                                    <SelectField
                                        icon={Briefcase}
                                        label="Employee Type"
                                        field="employeeType"
                                        placeholder="Select employee type"
                                        options={[
                                            { value: "Full_time", label: "Full-time" },
                                            { value: "Part_time", label: "Part-time" },
                                            { value: "Intern", label: "Intern" },
                                            { value: "Contractor", label: "Contractor" }
                                        ]}
                                        error={errors.employeeType}
                                    />

                                    <SelectField
                                        icon={Users}
                                        label="Role"
                                        field="role"
                                        placeholder="Select role"
                                        options={[
                                            { value: "employee", label: "Employee" },
                                            { value: "hr", label: "HR" },
                                            { value: "admin", label: "Admin" },
                                            { value: "ceo", label: "CEO" },
                                            { value: "superadmin", label: "Super Admin" }
                                        ]}
                                        error={errors.role}
                                    />
                                </div>

                                {/* Generated Password Display */}
                                {generatedPassword && (
                                    <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <h3 className="font-semibold text-green-800">Employee Registered Successfully!</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-green-700">Generated Password</label>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={generatedPassword}
                                                        readOnly
                                                        className="w-full px-4 py-3 bg-white border border-green-300 rounded-lg font-mono text-green-800 pr-20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-12 top-3 text-green-600 hover:text-green-800"
                                                    >
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={copyPassword}
                                                        className="absolute right-3 top-3 text-green-600 hover:text-green-800"
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {passwordCopied && (
                                                <p className="text-sm text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Password copied to clipboard!
                                                </p>
                                            )}
                                            <p className="text-sm text-green-700">
                                                Please share this password securely with the employee. They can change it after first login.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="mt-8 flex gap-4">
                                    <button
                                        type="submit"
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
                            </form>

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
