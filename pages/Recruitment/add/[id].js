import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import {
  FaUser,
  FaEnvelope,
  FaBriefcase,
  FaCalendarAlt,
  FaRegClock,
  FaImage,
  FaCopy,
  FaCheck,
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import Image from "next/image";
//import toast from "react-hot-toast";
import {toast} from 'react-toastify';

const AddEmployee = () => {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    date_of_joining: "",
    experience: "",
    profile_photo: "",
    role: "",
    employee_type: "",
    intern_duration: "",
  });

  const [message, setMessage] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [existingEmployee, setExistingEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      axios
        .get(`/api/candidate/${id}`)
        .then((res) => {
          const { name, email, profile_photo } = res.data;
          setForm((prev) => ({
            ...prev,
            name,
            email,
            profile_photo: profile_photo || "",
          }));
          setProfilePhotoUrl(profile_photo || "");

          // Check if employee already exists
          axios
            .get(`/api/recruitment/add-employee?email=${email}`)
            .then((empRes) => {
              if (empRes.data.exists) {
                const emp = empRes.data.employee;
                setExistingEmployee(emp);
                setForm((prev) => ({
                  ...prev,
                  position: emp.position || "",
                  date_of_joining: emp.date_of_joining
                    ? emp.date_of_joining.split("T")[0]
                    : "",
                  experience: emp.experience || "",
                  role: emp.role || "",
                  employee_type: emp.employee_type || "",
                }));
              }
              setLoading(false);
            })
            .catch((err) => {
              console.error("Error checking employee:", err);
              setLoading(false);
            });
        })
        .catch((err) => {
          console.error("Error fetching candidate:", err);
          setLoading(false);
        });
    }
  }, [id]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    // Required field validation for edit mode
    if (isEditing) {
      const requiredFields = [
        "position",
        "role",
        "employee_type",
        "date_of_joining",
      ];
      if (
        requiredFields.includes(name) &&
        (!value || value.toString().trim() === "")
      ) {
        newErrors[name] = "This field is required";
        setErrors(newErrors);
        return;
      }
    }

    switch (name) {
      case "date_of_joining":
        if (value) {
          const selectedDate = new Date(value);
          const today = new Date();
          const twoYearsAgo = new Date();
          const twoYearsFromNow = new Date();

          twoYearsAgo.setFullYear(today.getFullYear() - 2);
          twoYearsFromNow.setFullYear(today.getFullYear() + 2);

          const year = selectedDate.getFullYear();
          if (year.toString().length !== 4) {
            newErrors[name] = "Please enter a valid 4-digit year";
          } else if (selectedDate < twoYearsAgo) {
            newErrors[name] = "Date cannot be more than 2 years in the past";
          } else if (selectedDate > twoYearsFromNow) {
            newErrors[name] = "Date cannot be more than 2 years in the future";
          } else {
            delete newErrors[name];
          }
        } else if (isEditing) {
          newErrors[name] = "This field is required";
        } else {
          delete newErrors[name];
        }
        break;

      case "experience":
        if (value !== "" && (isNaN(value) || value < 0 || value > 90)) {
          newErrors[name] = "Experience must be between 0 and 90 years";
        } else {
          delete newErrors[name];
        }
        break;

      case "position":
      case "role":
      case "employee_type":
        if (isEditing && (!value || value.toString().trim() === "")) {
          newErrors[name] = "This field is required";
        } else {
          delete newErrors[name];
        }
        break;

      default:
        delete newErrors[name];
    }

    setErrors(newErrors);
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "email") {
      setForm((prev) => ({ ...prev, email: value }));

      if (value.includes("@")) {
        // Check if email already exists
        const res = await axios.post("/api/recruitment/check-email", {
          email: value,
        });
        setEmailExists(res.data.exists);
      }
    } else if (name === "experience") {
      const num = value === "" ? "" : parseInt(value, 10);
      setForm((prev) => ({ ...prev, [name]: num }));
      validateField(name, num);
    } else if (name === "date_of_joining") {
      setForm((prev) => ({ ...prev, [name]: value }));
      validateField(name, value);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (isEditing) {
        validateField(name, value);
      }
    }
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
 const handleSendCredentials = async () => {
        try {
            const res = await fetch('/api/auth/sendCredentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: originalFormData?.email || form.email,
                    username: employeeData?.empid,
                    password: employeeData?.password,
                    name: originalFormData?.name || form.name
                })
            });
            
            if (res.ok) {
                toast.success('Credentials sent successfully!');
            } else {
                toast.error('Failed to send credentials. Please try again.');
            }
        } catch (error) {
            console.error('Error sending credentials:', error);
            toast.error('Failed to send credentials. Please try again.');
        }
    };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      let res;
      if (isEditing && existingEmployee) {
        // Update existing employee
        res = await axios.put("/api/recruitment/add-employee", form);
      } else {
        // Add new employee
        res = await axios.post("/api/recruitment/add-employee", form);
      }

      const data = res.data;

      if (res.status === 200) {
        setErrors({});
        setEmailExists(false);
        if (isEditing) {
          setMessage("Employee updated successfully!");
          setIsEditing(false);
          const empRes = await axios.get(
            `/api/recruitment/add-employee?email=${form.email}`
          );
          if (empRes.data.exists) {
            setExistingEmployee(empRes.data.employee);
          }
        } else {
          setOriginalFormData({ name: form.name, email: form.email });
          setForm({
            name: "",
            email: "",
            position: "",
            date_of_joining: "",
            experience: "",
            profile_photo: "",
            role: "",
            employee_type: "",
            intern_duration: "",
          });
          setProfilePhotoUrl("");
          setEmployeeData({ empid: data.empid, password: data.password });
          setCopiedField("");
          setMessage(
            "Employee added successfully! Please copy the credentials below."
          );
        }
      } else {
        setMessage(
          isEditing ? "Failed to update employee." : "Failed to add employee."
        );
      }
    } catch (err) {
      console.error(err);
      setMessage(
        isEditing ? "Error updating employee." : "Error adding employee."
      );
      if (!isEditing) {
        setEmployeeData(null);
        setOriginalFormData(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <SideBar />
        <div className="flex-1 p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">
                Loading candidate information...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Add as Employee - HRMS</title>
      </Head>
      <div className="flex">
        <SideBar />

        <div className="flex-1 p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
          <button
            onClick={() => router.push("/Recruitment/recruitment")}
            className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            ← Back to Recruitment
          </button>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-2xl rounded-3xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <h1 className="text-3xl font-bold text-white">
                      {existingEmployee
                        ? "Employee Details"
                        : "Add New Employee"}
                    </h1>
                    <p className="text-indigo-100 mt-2">
                      {existingEmployee
                        ? `Employee ID: ${existingEmployee.empid} - Status: ${existingEmployee.status}`
                        : "Complete the employee registration process"}
                    </p>
                  </div>
                  {existingEmployee && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {isEditing ? <FaTimes /> : <FaEdit />}
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-8">
                {/* Profile Photo Section */}
                {profilePhotoUrl && (
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <Image
                        src={profilePhotoUrl}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                      />
                      <div
                        className={`absolute -bottom-2 -right-2 text-white rounded-full p-2 ${
                          existingEmployee ? "bg-blue-500" : "bg-green-500"
                        }`}
                      >
                        <FaUser className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {existingEmployee && !isEditing && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl mb-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-blue-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-blue-700 font-medium">
                          This candidate has already been added as an employee.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaUser className="mr-2 text-indigo-500" />
                      Full Name
                    </label>
                    <input
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      readOnly={!!id || (existingEmployee && !isEditing)}
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaEnvelope className="mr-2 text-indigo-500" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      readOnly={!!id || (existingEmployee && !isEditing)}
                    />
                    {emailExists && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Email already exists
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaBriefcase className="mr-2 text-indigo-500" />
                      Role
                    </label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      required
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        errors.role
                          ? "border-red-500 bg-red-50"
                          : existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      disabled={existingEmployee && !isEditing}
                    >
                      <option value="" disabled>
                        Select Role
                      </option>
                      <option value="hr">HR</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                    {errors.role && (
                      <p className="text-red-500 text-sm mt-1">{errors.role}</p>
                    )}
                  </div>

                  {/* Position */}
                  <div>
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaBriefcase className="mr-2 text-indigo-500" />
                      Position
                    </label>
                    <input
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        errors.position
                          ? "border-red-500 bg-red-50"
                          : existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      name="position"
                      placeholder="e.g. Software Engineer"
                      onChange={handleChange}
                      value={form.position}
                      required
                      disabled={existingEmployee && !isEditing}
                    />
                    {errors.position && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.position}
                      </p>
                    )}
                  </div>

                  {/* Employee Type */}
                  <div>
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaBriefcase className="mr-2 text-indigo-500" />
                      Employee Type
                    </label>
                    <select
                      name="employee_type"
                      value={form.employee_type}
                      onChange={handleChange}
                      required
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        errors.employee_type
                          ? "border-red-500 bg-red-50"
                          : existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      disabled={existingEmployee && !isEditing}
                    >
                      <option value="" disabled>
                        Select Type
                      </option>
                      <option value="Full_time">Full-time</option>
                      <option value="Intern">Intern</option>
                      <option value="Contractor">Contractor</option>
                    </select>
                    {errors.employee_type && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.employee_type}
                      </p>
                    )}
                  </div>

                  {/* Intern Duration - Show only if Intern is selected */}
                  {form.employee_type === "Intern" && (
                    <div>
                      <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                        <FaRegClock className="mr-2 text-indigo-500" />
                        Internship Duration (months)
                      </label>
                      <input
                        className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                          existingEmployee && !isEditing
                            ? "border-gray-200 bg-gray-50 text-gray-600"
                            : "border-gray-200 bg-white focus:border-indigo-500"
                        }`}
                        type="number"
                        name="intern_duration"
                        placeholder="e.g. 6"
                        onChange={handleChange}
                        value={form.intern_duration}
                        min="1"
                        max="24"
                        required
                        disabled={existingEmployee && !isEditing}
                      />
                    </div>
                  )}

                  {/* Date of Joining */}
                  <div>
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaCalendarAlt className="mr-2 text-indigo-500" />
                      Date of Joining
                    </label>
                    <input
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        errors.date_of_joining
                          ? "border-red-500 bg-red-50"
                          : existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      type="date"
                      name="date_of_joining"
                      onChange={handleChange}
                      value={form.date_of_joining}
                      required
                      disabled={existingEmployee && !isEditing}
                    />
                    {errors.date_of_joining && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.date_of_joining}
                      </p>
                    )}
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="flex items-center text-sm font-semibold mb-2 text-gray-700">
                      <FaRegClock className="mr-2 text-indigo-500" />
                      Experience (years)
                    </label>
                    <input
                      className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                        errors.experience
                          ? "border-red-500 bg-red-50"
                          : existingEmployee && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-600"
                          : "border-gray-200 bg-white focus:border-indigo-500"
                      }`}
                      type="number"
                      name="experience"
                      placeholder="e.g. 2"
                      onChange={handleChange}
                      value={form.experience}
                      min="0"
                      max="90"
                      disabled={existingEmployee && !isEditing}
                    />
                    {errors.experience && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.experience}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="md:col-span-2 mt-6">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        emailExists ||
                        (existingEmployee && !isEditing) ||
                        submitting ||
                        Object.keys(errors).length > 0
                      }
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                          {isEditing ? "Updating..." : "Adding Employee..."}
                        </div>
                      ) : existingEmployee && !isEditing ? (
                        "Employee Already Added"
                      ) : isEditing ? (
                        "Update Employee"
                      ) : emailExists ? (
                        "Email Already Exists"
                      ) : (
                        "Add Employee"
                      )}
                    </button>
                  </div>

                  {/* Success Message and Credentials Display */}
                  {message && (
                    <div className="md:col-span-2 mt-6">
                      <div
                        className={`p-6 rounded-r-xl border-l-4 ${
                          isEditing || message.includes("updated")
                            ? "bg-blue-50 border-blue-400"
                            : "bg-green-50 border-green-400"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg
                                className={`h-5 w-5 ${
                                  isEditing || message.includes("updated")
                                    ? "text-blue-400"
                                    : "text-green-400"
                                }`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p
                                className={`font-medium ${
                                  isEditing || message.includes("updated")
                                    ? "text-blue-700"
                                    : "text-green-700"
                                }`}
                              >
                                {message}
                              </p>
                            </div>
                          </div>
                          {employeeData && (
                            <button
                              onClick={handleSendCredentials}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                              Send Credentials
                            </button>
                          )}
                        </div>

                        {/* Employee Credentials */}
                        {employeeData && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {/* Employee ID */}
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employee ID
                              </label>
                              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <span className="font-mono text-lg font-semibold text-gray-800">
                                  {employeeData.empid}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(employeeData.empid, "empid")
                                  }
                                  className="ml-2 p-2 text-gray-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Copy Employee ID"
                                >
                                  {copiedField === "empid" ? (
                                    <FaCheck className="text-green-600" />
                                  ) : (
                                    <FaCopy />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Password */}
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                              </label>
                              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <span className="font-mono text-lg font-semibold text-gray-800">
                                  {employeeData.password}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(
                                      employeeData.password,
                                      "password"
                                    )
                                  }
                                  className="ml-2 p-2 text-gray-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Copy Password"
                                >
                                  {copiedField === "password" ? (
                                    <FaCheck className="text-green-600" />
                                  ) : (
                                    <FaCopy />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Important:</strong> Please save these
                            credentials securely. The password is auto-generated
                            and cannot be recovered.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddEmployee;
