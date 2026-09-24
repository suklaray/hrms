"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "@/lib/compatRouter";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import {
  Search,
  Check,
  ChevronDown,
  RotateCcw,
  Send,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  Mail,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

function RegisterEmployee() {
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
    duration_months: "",
    role: "employee",
    rbacRoleId: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [usernameCopied, setUsernameCopied] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailTimeout, setEmailTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ name: string; email: string; role: string } | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [rbacRoles, setRbacRoles] = useState<any[]>([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [isResettingForm, setIsResettingForm] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    // Fetch positions
    axios
      .get("/api/settings/positions")
      .then((res) => {
        setPositions(res.data);
      })
      .catch((err) => {
        console.error("Error fetching positions:", err);
        toast.error("Failed to fetch positions");
      });

    // Fetch RBAC roles (employee types) for assignment
    axios
      .get("/api/settings/employee-types")
      .then((res) => {
        const available = res.data.assignableRoles || res.data.roles || [];
        setRbacRoles(available.filter((r: any) => r.status === "active"));
      })
      .catch(() => {});

    // Fetch current user's role
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUserRole(data.user.role);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  // Function to get available role options based on current user's role
  const getRoleOptions = () => {
    switch (userRole) {
      case "hr":
        return [{ value: "employee", label: "Employee" }];
      case "admin":
        return [
          { value: "hr", label: "HR" },
          { value: "employee", label: "Employee" },
        ];
      case "superadmin":
        return [
          { value: "employee", label: "Employee" },
          { value: "hr", label: "HR" },
          { value: "admin", label: "Admin" },
          { value: "superadmin", label: "Superadmin" },
        ];
      default:
        return [{ value: "employee", label: "Employee" }];
    }
  };

  // Check if form is valid
  useEffect(() => {
    let requiredFields = [
      "name",
      "email",
      "contact_number",
      "position",
      "dateOfJoining",
      "experience",
      "employeeType",
    ];

    if (formData.employeeType === "Intern" || formData.employeeType === "Contractor") {
      requiredFields.push("duration_months");
    }

    const hasAllFields = requiredFields.every((field) => {
      return (formData as any)[field] && (formData as any)[field].toString().trim() !== "";
    });

    const hasNoErrors = Object.keys(errors).length === 0;
    setIsFormValid(hasAllFields && hasNoErrors && !emailChecking);
  }, [formData, errors, emailChecking]);

  if (!mounted) {
    return null;
  }

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    switch (name) {
      case "name":
        if (!value.trim()) {
          newErrors[name] = "Name is required";
        } else if (value.trim().length < 2) {
          newErrors[name] = "Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[name] = "Name can only contain letters and spaces";
        } else {
          delete newErrors[name];
        }
        break;
      case "email":
        if (!value.trim()) {
          newErrors[name] = "Email is required";
          if (emailTimeout) {
            clearTimeout(emailTimeout);
            setEmailTimeout(null);
          }
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          newErrors[name] = "Please enter a valid email address";
        } else if (value.length > 254) {
          newErrors[name] = "Email address is too long";
        } else {
          delete newErrors[name];
          if (value.trim() !== "") {
            if (emailTimeout) clearTimeout(emailTimeout);
            const timeout = setTimeout(() => checkEmailAvailability(value), 800);
            setEmailTimeout(timeout);
          }
        }
        break;
      case "contact_number":
        if (!value.trim()) {
          newErrors[name] = "Contact number is required";
        } else if (!/^\d{10}$/.test(value)) {
          newErrors[name] = "Contact number must be exactly 10 digits";
        } else {
          delete newErrors[name];
        }
        break;
      case "position":
        if (!value.trim()) {
          newErrors[name] = "Position is required";
        } else if (value.trim().length < 2) {
          newErrors[name] = "Position must be at least 2 characters";
        } else {
          delete newErrors[name];
        }
        break;
      case "dateOfJoining":
        if (!value) {
          newErrors[name] = "Date of joining is required";
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          const twoYearsAgo = new Date();
          const twoYearsFromNow = new Date();

          twoYearsAgo.setFullYear(today.getFullYear() - 2);
          twoYearsFromNow.setFullYear(today.getFullYear() + 2);

          if (isNaN(selectedDate.getTime())) {
            newErrors[name] = "Please enter a valid date";
          } else if (selectedDate < twoYearsAgo) {
            newErrors[name] = "Date cannot be more than 2 years ago";
          } else if (selectedDate > twoYearsFromNow) {
            newErrors[name] = "Date cannot be more than 2 years in the future";
          } else {
            delete newErrors[name];
          }
        }
        break;
      case "experience":
        if (!value) {
          newErrors[name] = "Experience is required";
        } else if (isNaN(Number(value)) || Number(value) < 0) {
          newErrors[name] = "Experience must be a positive number";
        } else if (Number(value) > 50) {
          newErrors[name] = "Experience cannot exceed 50 years";
        } else {
          delete newErrors[name];
        }
        break;
      case "employeeType":
        if (!value) {
          newErrors[name] = "Employee type is required";
        } else {
          delete newErrors[name];
        }
        break;
      case "duration_months":
        if (!value && (formData.employeeType === "Intern" || formData.employeeType === "Contractor")) {
          newErrors[name] = "Duration is required for interns and contractors";
        } else if (value && (isNaN(Number(value)) || Number(value) < 1 || Number(value) > 12)) {
          newErrors[name] = "Duration must be between 1 and 12 months";
        } else {
          delete newErrors[name];
        }
        break;
      default:
        if (!value && ["status", "role"].includes(name)) {
          newErrors[name] = `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
        } else {
          delete newErrors[name];
        }
    }

    setErrors(newErrors);
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return;
    if (isResettingForm || isLoading) return;

    setEmailChecking(true);
    try {
      const res = await fetch("/api/recruitment/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          email: "Error checking email availability",
        }));
      } else if (data.exists) {
        setErrors((prev) => ({
          ...prev,
          email: data.message || "Email already exists in the system",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Email check failed:", error);
      setErrors((prev) => ({
        ...prev,
        email: "Unable to verify email availability",
      }));
    } finally {
      setEmailChecking(false);
    }
  };

  const validateForm = () => {
    let requiredFields = [
      "name",
      "email",
      "contact_number",
      "position",
      "dateOfJoining",
      "experience",
      "employeeType",
    ];

    if (formData.employeeType === "Intern" || formData.employeeType === "Contractor") {
      requiredFields.push("duration_months");
    }

    let isValid = true;

    requiredFields.forEach((field) => {
      if (!(formData as any)[field] || (typeof (formData as any)[field] === "string" && !(formData as any)[field].trim())) {
        isValid = false;
      }
    });

    return isValid && Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    if (isResettingForm) return;

    if (field === "email") {
      value = value.toLowerCase().trim();
    }

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "email" && value === "") {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
      return;
    }

    validateField(field, value);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      toast.error("Please fix all validation errors before submitting.");
      return;
    }

    if (emailTimeout) {
      clearTimeout(emailTimeout);
      setEmailTimeout(null);
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
          duration_months: formData.duration_months,
          role: formData.role,
          rbacRoleId: formData.rbacRoleId ? parseInt(formData.rbacRoleId) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to register employee.");
        toast.error(data.message || "Failed to register employee.");
        return;
      }

      setGeneratedPassword(data.password);
      setGeneratedUsername(data.empid || data.username || formData.email);
      setMessage(data.message);
      toast.success(data.message || "Employee registered successfully!");

      setEmployeeData({
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });

      setTimeout(() => {
        setMessage("");
      }, 1500);

      setIsResettingForm(true);

      if (emailTimeout) {
        clearTimeout(emailTimeout);
        setEmailTimeout(null);
      }

      setFormData({
        name: "",
        email: "",
        contact_number: "",
        position: "",
        dateOfJoining: "",
        status: "Active",
        experience: "",
        employeeType: "",
        duration_months: "",
        role: "employee",
        rbacRoleId: "",
      });
      setIsRoleDropdownOpen(false);
      setRoleSearchTerm("");
      setErrors({});
      setIsFormValid(false);
      setEmailChecking(false);

      setTimeout(() => setIsResettingForm(false), 100);
    } catch (error) {
      setMessage("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsResettingForm(true);
    if (emailTimeout) {
      clearTimeout(emailTimeout);
      setEmailTimeout(null);
    }
    setFormData({
      name: "",
      email: "",
      contact_number: "",
      position: "",
      dateOfJoining: "",
      status: "Active",
      experience: "",
      employeeType: "",
      duration_months: "",
      role: "employee",
      rbacRoleId: "",
    });
    setIsRoleDropdownOpen(false);
    setRoleSearchTerm("");
    setErrors({});
    setIsFormValid(false);
    setEmailChecking(false);
    setTimeout(() => setIsResettingForm(false), 100);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(generatedUsername);
      setUsernameCopied(true);
      toast.success("Username copied to clipboard!");
      setTimeout(() => setUsernameCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy username:", err);
    }
  };

  const handleSendCredentials = async () => {
    try {
      const res = await fetch("/api/auth/sendCredentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: employeeData?.email,
          username: generatedUsername,
          password: generatedPassword,
          name: employeeData?.name,
          role: employeeData?.role,
        }),
      });

      if (res.ok) {
        toast.success("Credentials sent successfully to employee email!");
      } else {
        toast.error("Failed to send credentials. Please try again.");
      }
    } catch (error) {
      console.error("Error sending credentials:", error);
      toast.error("Failed to send credentials. Please try again.");
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

  return (
    <>
      <Head>
        <title>Register Employee - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar handleLogout={handleLogout} />

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <Pageheader
            title="Employee Registration"
            description="Fill in all required information to register a new employee"
            href="/employeeList"
          />

          {/* Form Card Container */}
          <div className="bg-white border border-[#d4d8dd] shadow-sm mb-6">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#d4d8dd]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#2f3a45]">
                    Register New Employee
                  </h2>
                  <p className="text-[11px] text-[#6b7280] mt-1">
                    Fill in personal, contact, and employment information for the employee.
                  </p>
                </div>

                <div className="text-[10px] text-[#7a838d]">
                  Fields marked with
                  <span className="text-red-500 font-semibold ml-1">*</span>
                  are required
                </div>
              </div>
            </div>

            {/* Global Error Banner */}
            {message && !message.includes("successfully") && (
              <div className="m-5 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[12px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
              {/* ===================================================== */}
              {/* 1. BASIC PERSONAL INFORMATION */}
              {/* ===================================================== */}
              <div className="border border-[#d9dde2] m-5 mb-5">
                <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full mr-3" />
                  <div>
                    <h3 className="text-[12px] font-semibold text-[#374151]">
                      Basic Personal & Contact Information
                    </h3>
                    <p className="text-[10px] text-[#7b8490]">
                      Full name, contact details and email address
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Full Name
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Enter employee full name"
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                        />
                      </div>
                      {errors.name && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Email Address
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="employee@company.com"
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 pr-8 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                        />
                        {emailChecking && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin rounded-full h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent"></div>
                        )}
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>
                      )}
                    </div>

                    {/* Contact Number */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Contact Number
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.contact_number}
                          onChange={(e) => handleInputChange("contact_number", e.target.value)}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                        />
                      </div>
                      {errors.contact_number && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.contact_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================== */}
              {/* 2. EMPLOYMENT & ROLE DETAILS */}
              {/* ===================================================== */}
              <div className="border border-[#d9dde2] m-5 mb-5">
                <div className="h-10 px-4 flex items-center bg-gray-50 border-b border-[#d9dde2]">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full mr-3" />
                  <div>
                    <h3 className="text-[12px] font-semibold text-[#374151]">
                      Employment & Organization Details
                    </h3>
                    <p className="text-[10px] text-[#7b8490]">
                      Designation, employment type, joining date and system access
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Position */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Position / Designation
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.position}
                          onChange={(e) => handleInputChange("position", e.target.value)}
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition cursor-pointer"
                        >
                          <option value="">— Select Position —</option>
                          {positions.map((pos) => (
                            <option key={pos.id} value={pos.position_name}>
                              {pos.position_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.position && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.position}</p>
                      )}
                    </div>

                    {/* Date of Joining */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Date of Joining
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.dateOfJoining}
                          onChange={(e) => handleInputChange("dateOfJoining", e.target.value)}
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                        />
                      </div>
                      {errors.dateOfJoining && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.dateOfJoining}</p>
                      )}
                    </div>

                    {/* Experience (Years) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Experience (Years)
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.experience}
                          onChange={(e) => handleInputChange("experience", e.target.value)}
                          placeholder="e.g. 2"
                          min="0"
                          max="50"
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                        />
                      </div>
                      {errors.experience && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.experience}</p>
                      )}
                    </div>

                    {/* Employee Type */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        Employment Type
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.employeeType}
                          onChange={(e) => handleInputChange("employeeType", e.target.value)}
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition cursor-pointer"
                        >
                          <option value="">— Select Employment Type —</option>
                          <option value="Full_time">Full-time</option>
                          <option value="Intern">Intern</option>
                          <option value="Contractor">Contractor</option>
                        </select>
                      </div>
                      {errors.employeeType && (
                        <p className="text-red-500 text-[11px] mt-1">{errors.employeeType}</p>
                      )}
                    </div>

                    {/* Duration (Months) - Conditional */}
                    {(formData.employeeType === "Intern" || formData.employeeType === "Contractor") && (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                          Duration (Months)
                          <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.duration_months}
                            onChange={(e) => handleInputChange("duration_months", e.target.value)}
                            placeholder="Enter 1 to 12 months"
                            min="1"
                            max="12"
                            className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 transition"
                          />
                        </div>
                        {errors.duration_months && (
                          <p className="text-red-500 text-[11px] mt-1">{errors.duration_months}</p>
                        )}
                      </div>
                    )}

                    {/* Searchable Role Selection */}
                    <div className="relative">
                      <label className="block text-[11px] font-semibold text-[#4b5563] mb-1.5">
                        User Role / RBAC Role
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                          className="w-full h-[38px] border border-[#cfd5db] rounded-md px-3 bg-white text-left text-[12px] text-[#374151] hover:border-[#aeb7c1] focus:outline-none focus:ring-2 focus:ring-indigo-400/10 focus:border-indigo-400 flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="truncate">
                            {(() => {
                              const found = rbacRoles.find((r) => String(r.id) === String(formData.rbacRoleId));
                              return found ? found.name : "None (Default Employee)";
                            })()}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#8b949e] transition-transform ${
                              isRoleDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isRoleDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-[#d5dbe1] rounded-md shadow-lg overflow-hidden">
                            <div className="p-2 border-b border-[#e8ebee] bg-[#f8f9fa]">
                              <div className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#d9dde2] rounded-sm">
                                <Search className="w-3.5 h-3.5 text-[#8b949e]" />
                                <input
                                  type="text"
                                  placeholder="Search role..."
                                  value={roleSearchTerm}
                                  onChange={(e) => setRoleSearchTerm(e.target.value)}
                                  className="w-full text-[11px] text-[#374151] bg-transparent focus:outline-none"
                                  autoFocus
                                />
                              </div>
                            </div>

                            <div className="overflow-y-auto max-h-56">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    rbacRoleId: "",
                                    role: "employee",
                                  }));
                                  setIsRoleDropdownOpen(false);
                                  setRoleSearchTerm("");
                                }}
                                className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f3f4f6] flex items-center justify-between transition cursor-pointer ${
                                  !formData.rbacRoleId
                                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                                    : "text-[#374151]"
                                }`}
                              >
                                <span>None (Default Employee)</span>
                                {!formData.rbacRoleId && (
                                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                                )}
                              </button>

                              {rbacRoles
                                .filter(
                                  (r) =>
                                    r.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
                                    (r.description &&
                                      r.description.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                                )
                                .map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        rbacRoleId: r.id,
                                      }));
                                      setIsRoleDropdownOpen(false);
                                      setRoleSearchTerm("");
                                    }}
                                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f3f4f6] flex items-center justify-between transition cursor-pointer ${
                                      String(formData.rbacRoleId) === String(r.id)
                                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                                        : "text-[#374151]"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-medium">{r.name}</div>
                                      {r.description && (
                                        <div className="text-[10px] text-[#7a838d] truncate max-w-xs">
                                          {r.description}
                                        </div>
                                      )}
                                    </div>
                                    {String(formData.rbacRoleId) === String(r.id) && (
                                      <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================== */}
              {/* 3. GENERATED CREDENTIALS NOTIFICATION */}
              {/* ===================================================== */}
              {generatedPassword && (
                <div className="m-5 p-4 bg-emerald-50 border border-emerald-300 rounded-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-[13px] font-semibold text-emerald-900">
                        Employee Registered Successfully!
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCredentials}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Credentials</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Username / Emp ID
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={generatedUsername}
                          readOnly
                          className="flex-1 h-[34px] px-3 bg-white border border-emerald-300 rounded font-mono text-[12px] text-emerald-900"
                        />
                        <button
                          type="button"
                          onClick={copyUsername}
                          className="h-[34px] px-2.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      {usernameCopied && (
                        <p className="text-[11px] text-emerald-700 mt-1">Username copied!</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Temporary Password
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={generatedPassword}
                          readOnly
                          className="flex-1 h-[34px] px-3 bg-white border border-emerald-300 rounded font-mono text-[12px] text-emerald-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-[34px] px-2.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={copyPassword}
                          className="h-[34px] px-2.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      {passwordCopied && (
                        <p className="text-[11px] text-emerald-700 mt-1">Password copied!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================== */}
              {/* 4. FOOTER ACTION BUTTONS */}
              {/* ===================================================== */}
              <div className="px-5 py-4 border-t border-[#d4d8dd] bg-[#f8f9fa] flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 h-[38px] px-5 border border-[#cbd1d7] bg-white text-[#4b5563] hover:bg-[#f1f3f5] hover:border-[#b8c0c8] rounded-md text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#6b7280]" />
                  Reset Form
                </button>

                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`inline-flex items-center justify-center gap-2 h-[38px] px-6 text-white rounded-md text-[12px] font-semibold transition-colors shadow-sm ${
                    isFormValid && !isLoading
                      ? "bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                    </div>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Register Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ClientPageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <RegisterEmployee {...props} />
    </Suspense>
  );
}
