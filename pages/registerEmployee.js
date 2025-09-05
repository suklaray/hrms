import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
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
import { 
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaFileUpload,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaBriefcase
} from "react-icons/fa";

export default function RegisterEmployee() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        contact_number: "",
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
    const [emailChecking, setEmailChecking] = useState(false);
    const [emailTimeout, setEmailTimeout] = useState(null);
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        setMounted(true);
        setCurrentDate(new Date().toLocaleDateString());
    }, []);

    // Check if form is valid
    useEffect(() => {
        const requiredFields = ['name', 'email', 'contact_number', 'position', 'dateOfJoining', 'experience', 'employeeType'];
        const hasAllFields = requiredFields.every(field => {
            return formData[field] && formData[field].toString().trim() !== '';
        });
        
        const hasNoErrors = Object.keys(errors).length === 0;
        setIsFormValid(hasAllFields && hasNoErrors && !emailChecking);
    }, [formData, errors, emailChecking]);

    if (!mounted) {
        return null;
    }

    const validateField = (name, value) => {
        const newErrors = { ...errors };
        
        switch (name) {
            case 'name':
                if (!value.trim()) {
                    newErrors[name] = 'Name is required';
                } else if (value.trim().length < 2) {
                    newErrors[name] = 'Name must be at least 2 characters';
                } else if (!/^[a-zA-Z\s]+$/.test(value)) {
                    newErrors[name] = 'Name can only contain letters and spaces';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'email':
                if (!value.trim()) {
                    newErrors[name] = 'Email is required';
                } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                    newErrors[name] = 'Please enter a valid email address';
                } else if (value.length > 254) {
                    newErrors[name] = 'Email address is too long';
                } else {
                    delete newErrors[name];
                    // Debounced email check
                    if (emailTimeout) clearTimeout(emailTimeout);
                    const timeout = setTimeout(() => checkEmailAvailability(value), 800);
                    setEmailTimeout(timeout);
                }
                break;
            case 'contact_number':
                if (!value.trim()) {
                    newErrors[name] = 'Contact number is required';
                } else if (!/^\d{10}$/.test(value)) {
                    newErrors[name] = 'Contact number must be exactly 10 digits';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'position':
                if (!value.trim()) {
                    newErrors[name] = 'Position is required';
                } else if (value.trim().length < 2) {
                    newErrors[name] = 'Position must be at least 2 characters';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'dateOfJoining':
                if (!value) {
                    newErrors[name] = 'Date of joining is required';
                } else {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    const twoYearsAgo = new Date();
                    const twoYearsFromNow = new Date();
                    
                    twoYearsAgo.setFullYear(today.getFullYear() - 2);
                    twoYearsFromNow.setFullYear(today.getFullYear() + 2);
                    
                    if (isNaN(selectedDate.getTime())) {
                        newErrors[name] = 'Please enter a valid date';
                    } else if (selectedDate < twoYearsAgo) {
                        newErrors[name] = 'Date cannot be more than 2 years ago';
                    } else if (selectedDate > twoYearsFromNow) {
                        newErrors[name] = 'Date cannot be more than 2 years in the future';
                    } else {
                        delete newErrors[name];
                    }
                }
                break;
            case 'experience':
                if (!value) {
                    newErrors[name] = 'Experience is required';
                } else if (isNaN(value) || value < 0) {
                    newErrors[name] = 'Experience must be a positive number';
                } else if (value > 50) {
                    newErrors[name] = 'Experience cannot exceed 50 years';
                } else {
                    delete newErrors[name];
                }
                break;
            case 'employeeType':
                if (!value) {
                    newErrors[name] = 'Employee type is required';
                } else {
                    delete newErrors[name];
                }
                break;
            default:
                if (!value && ['status', 'role'].includes(name)) {
                    newErrors[name] = `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
                } else {
                    delete newErrors[name];
                }
        }
        
        setErrors(newErrors);
    };

    const checkEmailAvailability = async (email) => {
        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return;
        
        setEmailChecking(true);
        try {
            const res = await fetch('/api/recruitment/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                setErrors(prev => ({
                    ...prev,
                    email: 'Error checking email availability'
                }));
            } else if (data.exists) {
                setErrors(prev => ({
                    ...prev,
                    email: data.message || 'Email already exists in the system'
                }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                });
            }
        } catch (error) {
            console.error('Email check failed:', error);
            setErrors(prev => ({
                ...prev,
                email: 'Unable to verify email availability'
            }));
        } finally {
            setEmailChecking(false);
        }
    };

    const getFieldIcon = (fieldName, hasError, isValid) => {
        if (hasError) return <FaTimesCircle className="text-red-500" />;
        if (isValid) return <FaCheckCircle className="text-green-500" />;
        return <FaExclamationTriangle className="text-gray-400" />;
    };

    const validateForm = () => {
        const requiredFields = ['name', 'email', 'contact_number', 'position', 'dateOfJoining', 'experience', 'employeeType'];
        let isValid = true;
        
        requiredFields.forEach(field => {
            validateField(field, formData[field]);
            if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
                isValid = false;
            }
        });
        
        return isValid && Object.keys(errors).length === 0;
    };

    const handleInputChange = (field, value) => {
        // Normalize email input
        if (field === 'email') {
            value = value.toLowerCase().trim();
        }
        
        setFormData(prev => ({ ...prev, [field]: value }));
        validateField(field, value);
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            alert('Please fix all validation errors before submitting.');
            return;
        }
        
        setIsLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    contact_number: formData.contact_number,
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
                contact_number: "",
                position: "",
                dateOfJoining: "",
                status: "Active",
                experience: "",
                employeeType: "",
                role: "employee"
            });
            setErrors({});
            setIsFormValid(false);
            setEmailChecking(false);
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
        <>
            <Head>
                <title>Register Employee - HRMS</title>
            </Head>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <SideBar handleLogout={handleLogout} />
            
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                {/* Back Button */}
                <div className="mb-6">
                    <button 
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
                
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Employee Registration</h1>
                    <p className="text-gray-600">Fill in all required information to register a new employee</p>
                </div>

                {/* Main Form Card */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Form Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 lg:px-8 py-6">
                            <h2 className="text-xl lg:text-2xl font-bold text-white">Employee Information</h2>
                            <p className="text-indigo-100 mt-1">All fields marked with * are required</p>
                        </div>

                        {/* Global Error Message */}
                        {message && !message.includes('successfully') && (
                            <div className="mx-6 lg:mx-8 mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl">
                                <div className="flex items-center">
                                    <FaTimesCircle className="text-red-400 mr-2" />
                                    <p className="text-red-700 font-medium">{message}</p>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <div className="p-6 lg:p-8">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="md:col-span-2">
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <FaUser className="mr-2 text-indigo-500" />
                                        Full Name *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Enter employee's full name"
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                                                errors.name 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.name && !errors.name
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {getFieldIcon('name', errors.name, formData.name && !errors.name)}
                                        </div>
                                    </div>
                                    {errors.name && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.name}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <FaEnvelope className="mr-2 text-indigo-500" />
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="employee@company.com"
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                                                errors.email 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.email && !errors.email
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {emailChecking ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                                            ) : (
                                                getFieldIcon('email', errors.email, formData.email && !errors.email)
                                            )}
                                        </div>
                                    </div>
                                    {errors.email && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.email}</p>}
                                </div>

                                {/* Contact Number */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <FaPhone className="mr-2 text-indigo-500" />
                                        Contact Number *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={formData.contact_number} 
                                            onChange={(e) => handleInputChange('contact_number', e.target.value)}
                                            placeholder="Enter 10-digit contact number"
                                            maxLength={10}
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                                                errors.contact_number 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.contact_number && !errors.contact_number
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {getFieldIcon('contact_number', errors.contact_number, formData.contact_number && !errors.contact_number)}
                                        </div>
                                    </div>
                                    {errors.contact_number && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.contact_number}</p>}
                                </div>

                                {/* Position */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <FaBriefcase className="mr-2 text-indigo-500" />
                                        Position *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={formData.position} 
                                            onChange={(e) => handleInputChange('position', e.target.value)}
                                            placeholder="Job title or position"
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                                                errors.position 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.position && !errors.position
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {getFieldIcon('position', errors.position, formData.position && !errors.position)}
                                        </div>
                                    </div>
                                    {errors.position && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.position}</p>}
                                </div>

                                {/* Date of Joining */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <FaCalendarAlt className="mr-2 text-indigo-500" />
                                        Date of Joining *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={formData.dateOfJoining} 
                                            onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                                            className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                                                errors.dateOfJoining 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.dateOfJoining && !errors.dateOfJoining
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                    </div>
                                    <div className="flex items-center mt-1">
                                        {(formData.dateOfJoining && !errors.dateOfJoining) && (
                                            <div className="flex items-center text-green-600 text-sm">
                                                <FaCheckCircle className="mr-1" />
                                                Valid date selected
                                            </div>
                                        )}
                                    </div>
                                    {errors.dateOfJoining && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.dateOfJoining}</p>}
                                </div>



                                {/* Experience */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <Clock className="mr-2 text-indigo-500" />
                                        Experience (Years) *
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={formData.experience} 
                                            onChange={(e) => handleInputChange('experience', e.target.value)}
                                            placeholder="Years of experience"
                                            min="0"
                                            max="50"
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                                                errors.experience 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.experience && !errors.experience
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {getFieldIcon('experience', errors.experience, formData.experience && !errors.experience)}
                                        </div>
                                    </div>
                                    {errors.experience && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.experience}</p>}
                                </div>

                                {/* Employee Type */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <Users className="mr-2 text-indigo-500" />
                                        Employee Type *
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={formData.employeeType} 
                                            onChange={(e) => handleInputChange('employeeType', e.target.value)}
                                            className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors appearance-none bg-white ${
                                                errors.employeeType 
                                                    ? 'border-red-500 focus:border-red-500' 
                                                    : formData.employeeType && !errors.employeeType
                                                        ? 'border-green-500 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-indigo-500'
                                            }`}
                                        >
                                            <option value="">Select employee type</option>
                                            <option value="Full_time">Full-time</option>
                                            <option value="Part_time">Part-time</option>
                                            <option value="Intern">Intern</option>
                                            <option value="Contractor">Contractor</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {getFieldIcon('employeeType', errors.employeeType, formData.employeeType && !errors.employeeType)}
                                        </div>
                                    </div>
                                    {errors.employeeType && <p className="text-red-500 text-sm mt-1 flex items-center"><FaTimesCircle className="mr-1" />{errors.employeeType}</p>}
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <User className="mr-2 text-indigo-500" />
                                        Role
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={formData.role} 
                                            onChange={(e) => handleInputChange('role', e.target.value)}
                                            className="w-full border-2 p-3 pr-10 rounded-xl focus:outline-none focus:border-indigo-500 appearance-none bg-white border-gray-200"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="hr">HR</option>
                                            <option value="admin">Admin</option>
                                            <option value="ceo">CEO</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </form>

                                {/* Login Credentials Display */}
                                {generatedPassword && (
                                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle className="w-5 h-5 text-green-600 cursor-pointer" />
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
                                                        <Copy className="w-4 h-4 cursor-pointer" />
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
                                                        className="cursor-pointer p-2 text-green-600 hover:text-green-800 border border-green-300 rounded"
                                                    >
                                                        {showPassword ? <EyeOff className="w-4 h-4 cursor-pointer" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={copyPassword}
                                                        className="cursor-pointer p-2 text-green-600 hover:text-green-800 border border-green-300 rounded"
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
                            <div className="mt-8">
                                <button
                                    type="button"
                                    onClick={handleRegister}
                                    disabled={!isFormValid || isLoading}
                                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg ${
                                        isFormValid && !isLoading
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] cursor-pointer'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                                            Registering...
                                        </div>
                                    ) : (
                                        'Register Employee'
                                    )}
                                </button>
                                {!isFormValid && (
                                    <p className="text-gray-500 text-sm mt-2 text-center">
                                        Please fill all fields correctly to enable submission
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
