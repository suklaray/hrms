import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import { 
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaFileUpload,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp
} from "react-icons/fa";
import { toast } from "react-toastify";
export default function AddCandidate() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_number: "",
    interviewDate: "",
    interviewTimeFrom: "",
    interviewTimeTo: "",
    cv: null,
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [openTimeFrom, setOpenTimeFrom] = useState(false);
  const [openTimeTo, setOpenTimeTo] = useState(false);

  // Generate time options
  const times = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    const hour24Str = hour24.toString().padStart(2, '0');
    return [
      { value: `${hour24Str}:00`, display: `${hour12}:00 ${ampm}` },
      { value: `${hour24Str}:30`, display: `${hour12}:30 ${ampm}` }
    ];
  }).flat();

  
    const getFilteredFromTimes = () => {
      if (!formData.interviewDate) return times;

      const selectedDate = new Date(formData.interviewDate);
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();

      return times.filter((t) => {
        if (!isToday) return true; // All times for future dates
        const [hours, minutes] = t.value.split(":").map(Number);
        const timeObj = new Date();
        timeObj.setHours(hours, minutes, 0, 0);
        return timeObj > today; // only future times for today
      });
    };

    const getFilteredToTimes = () => {
      if (!formData.interviewDate) return times;

      const selectedDate = new Date(formData.interviewDate);
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();

      return times.filter((t) => {
        const [hours, minutes] = t.value.split(":").map(Number);
        const timeObj = new Date();
        timeObj.setHours(hours, minutes, 0, 0);

        // Must be after From
        const [fromHours, fromMinutes] = formData.interviewTimeFrom
          ? formData.interviewTimeFrom.split(":").map(Number)
          : [0, 0];
        const fromTimeObj = new Date();
        fromTimeObj.setHours(fromHours, fromMinutes, 0, 0);

        if (timeObj <= fromTimeObj) return false;
        if (isToday && timeObj <= today) return false;

        return true;
      });
    };


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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          newErrors[name] = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors[name] = 'Please enter a valid email address';
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'contact_number':
        if (!value) {
          newErrors[name] = 'Contact number is required';
        } else if (!/^\d{10}$/.test(value)) {
          newErrors[name] = 'Contact number must be exactly 10 digits';
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'interviewDate':
        if (!value) {
          newErrors[name] = 'Interview date is required';
        } else {
          const selectedDate = new Date(value);
          if (isNaN(selectedDate.getTime())) {
            newErrors[name] = 'Invalid date';
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const year = selectedDate.getFullYear();

            if (selectedDate < today) {
              newErrors[name] = 'Interview date cannot be in the past';
            } else if (year < 1900 || year > 9999) {
              newErrors[name] = 'Year must be a valid 4-digit number';
            } else {
              delete newErrors[name]; // Valid date
            }
          }
        }
        break;
case "interviewTimeFrom":
  if (!value) {
    newErrors[name] = "Interview start time is required";
  } else {
    // Check past time only if date is today
    if (formData.interviewDate) {
      const selectedDate = new Date(formData.interviewDate);
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();

      if (isToday) {
        const [hours, minutes] = value.split(":");
        const selectedTime = new Date();
        selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const currentTime = new Date();
        currentTime.setMinutes(currentTime.getMinutes() + 1);

        if (selectedTime < currentTime) {
          newErrors[name] = "Interview time cannot be in the past";
        } else {
          delete newErrors[name];
        }
      } else {
        delete newErrors[name];
      }
    } else {
      delete newErrors[name];
    }
  }
  break;

case "interviewTimeTo":
  if (!value) {
    newErrors[name] = "Interview end time is required";
  } else {
    const timeToMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const fromTimeMinutes = formData.interviewTimeFrom 
      ? timeToMinutes(formData.interviewTimeFrom) 
      : 0;

    const toTimeMinutes = timeToMinutes(value);

    // End must be after start
    if (formData.interviewTimeFrom && toTimeMinutes <= fromTimeMinutes) {
      newErrors[name] = "End time must be after start time";
    } else {
      // Check past time only for today
      if (formData.interviewDate) {
        const selectedDate = new Date(formData.interviewDate);
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();

        if (isToday) {
          const [hours, minutes] = value.split(":");
          const selectedTime = new Date();
          selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          const currentTime = new Date();
          currentTime.setMinutes(currentTime.getMinutes() + 1);

          if (selectedTime < currentTime) {
            newErrors[name] = "Interview time cannot be in the past";
          } else {
            delete newErrors[name];  // <-- FIXED
          }
        } else {
          delete newErrors[name];    // <-- FIXED
        }
      } else {
        delete newErrors[name];      // <-- FIXED
      }
    }
  }
  break;



      case 'cv':
        if (!value) {
          newErrors[name] = 'CV file is required';
        } else {
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(value.type)) {
            newErrors[name] = 'Only PDF, DOC, and DOCX files are allowed';
          } else if (value.size > 5 * 1024 * 1024) {
            newErrors[name] = 'File size must be less than 5MB';
          } else {
            delete newErrors[name];
          }
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const checkEmailExists = async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    
    setEmailChecking(true);
    try {
      const response = await axios.post('/api/recruitment/check-email', { email });
      if (response.data.exists) {
        setErrors(prev => ({ ...prev, email: 'Email already exists in the system' }));
      }
    } catch (error) {
      console.error('Email check failed:', error);
    } finally {
      setEmailChecking(false);
    }
  };

  const handleChange = (e) => {
  const { name, value, files } = e.target;
  let newValue = value;
  
  if (name === "cv") {
    newValue = files[0];
    setFormData({ ...formData, cv: newValue });
    validateField(name, newValue);
  } else {
    let updatedFormData = { ...formData, [name]: newValue };
    
    // Clear "To" time when "From" time changes
    if (name === 'interviewTimeFrom') {
      updatedFormData.interviewTimeTo = "";
      const newErrors = { ...errors };
      delete newErrors.interviewTimeTo;
      setErrors(newErrors);
    }
    
    setFormData(updatedFormData);
    validateField(name, newValue);
    
    // Re-validate time fields when date changes using updated form data
    if (name === 'interviewDate') {
      setTimeout(() => {
        if (updatedFormData.interviewTimeFrom) {
          validateTimeField('interviewTimeFrom', updatedFormData.interviewTimeFrom, updatedFormData);
        }
        if (updatedFormData.interviewTimeTo) {
          validateTimeField('interviewTimeTo', updatedFormData.interviewTimeTo, updatedFormData);
        }
      }, 0);
    }
    
    // Check email exists after validation passes
    if (name === 'email' && newValue && !errors.email) {
      setTimeout(() => checkEmailExists(newValue), 500);
    }
  }
};

const validateTimeField = (fieldName, value, currentFormData) => {
  setErrors(prevErrors => {
    const newErrors = { ...prevErrors };
    
    if (fieldName === 'interviewTimeFrom') {
      if (!value) {
        newErrors[fieldName] = "Interview start time is required";
      } else {
        // Check past time only if date is today
        if (currentFormData.interviewDate) {
          const selectedDate = new Date(currentFormData.interviewDate);
          const today = new Date();
          const isToday = selectedDate.toDateString() === today.toDateString();

          if (isToday) {
            const [hours, minutes] = value.split(":");
            const selectedTime = new Date();
            selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            const currentTime = new Date();
            // Add 1 minute buffer to avoid edge cases
            currentTime.setMinutes(currentTime.getMinutes() + 1);

            if (selectedTime < currentTime) {
              newErrors[fieldName] = "Interview time cannot be in the past";
            } else {
              delete newErrors[fieldName];
            }
          } else {
            delete newErrors[fieldName];
          }
        } else {
          delete newErrors[fieldName];
        }
      }
    }
    
    if (fieldName === 'interviewTimeTo') {
      if (!value) {
        newErrors[fieldName] = "Interview end time is required";
      } else {
        // Convert times to minutes for proper comparison
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const fromTimeMinutes = currentFormData.interviewTimeFrom ? timeToMinutes(currentFormData.interviewTimeFrom) : 0;
        const toTimeMinutes = timeToMinutes(value);
        
        if (currentFormData.interviewTimeFrom && toTimeMinutes <= fromTimeMinutes) {
          newErrors[fieldName] = "End time must be after start time";
        } else {
          // Check past time only if date is today
          if (currentFormData.interviewDate) {
            const selectedDate = new Date(currentFormData.interviewDate);
            const today = new Date();
            const isToday = selectedDate.toDateString() === today.toDateString();

            if (isToday) {
              const [hours, minutes] = value.split(":");
              const selectedTime = new Date();
              selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              const currentTime = new Date();
              // Add 1 minute buffer
              currentTime.setMinutes(currentTime.getMinutes() + 1);

              if (selectedTime < currentTime) {
                newErrors[fieldName] = "Interview time cannot be in the past";
              } else {
                delete newErrors[fieldName];
              }
            } else {
              delete newErrors[fieldName];
            }
          } else {
            delete newErrors[fieldName];
          }
        }
      }
    }
    
    return newErrors;
  });
};


  // Check if form is valid
  useEffect(() => {
    const requiredFields = ['name', 'email', 'contact_number', 'interviewDate', 'interviewTimeFrom', 'interviewTimeTo', 'cv'];
    const hasAllFields = requiredFields.every(field => {
      if (field === 'cv') return formData[field] !== null;
      return formData[field].trim() !== '';
    });
    
    const hasNoErrors = Object.keys(errors).length === 0;
    setIsFormValid(hasAllFields && hasNoErrors && !emailChecking);
  }, [formData, errors, emailChecking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("contact_number", formData.contact_number);
    data.append("interviewDate", formData.interviewDate);
    data.append("interviewTimeFrom", formData.interviewTimeFrom);
    data.append("interviewTimeTo", formData.interviewTimeTo);
    data.append("cv", formData.cv);

    try {
      await axios.post("/api/recruitment/addCandidate", data);

      setFormData({
        name: "",
        email: "",
        contact_number: "",
        interviewDate: "",
        interviewTimeFrom: "",
        interviewTimeTo: "",
        cv: null,
      });
      setErrors({});
      setErrorMessage("");

      toast.success("Candidate added successfully!");
      router.push("/Recruitment/recruitment");
    } catch (error) {
      if (error.response && error.response.data.error === "Email already exists") {
        setErrorMessage("The email address is already registered. Please use a different one.");
      } else if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage("Failed to add candidate. Please try again.");
      }
      if (!(error.response && error.response.status === 400)) {
        console.error("Error submitting form:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldIcon = (fieldName, hasError, isValid) => {
    if (hasError) return <FaTimesCircle className="text-red-500" />;
    if (isValid) return <FaCheckCircle className="text-green-500" />;
    return <FaExclamationTriangle className="text-gray-400" />;
  };

  return (
    <>
      <Head>
        <title>Add Candidate - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <SideBar />
        <div className="flex-1 p-6 lg:p-10">
          <div className="mb-6">
            <button
              onClick={() => router.push("/Recruitment/recruitment")}
              className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              ← Back to Recruitment
            </button>
          </div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Add New Candidate
            </h1>
            <p className="text-gray-600">
              Fill in all required information to add a candidate
            </p>
          </div>

          {/* Main Form Card */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                <h2 className="text-2xl font-bold text-white">
                  Candidate Information
                </h2>
                <p className="text-indigo-100 mt-1">All fields are required</p>
              </div>

              {/* Form */}
              <div className="p-8">
                {/* Global Error Message */}
                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-xl">
                    <div className="flex items-center">
                      <FaTimesCircle className="text-red-400 mr-2" />
                      <p className="text-red-700 font-medium">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  encType="multipart/form-data"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaUser className="mr-2 text-indigo-500" />
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                          errors.name
                            ? "border-red-500 focus:border-red-500"
                            : formData.name && !errors.name
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon(
                          "name",
                          errors.name,
                          formData.name && !errors.name
                        )}
                      </div>
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.name}
                      </p>
                    )}
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
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                          errors.email
                            ? "border-red-500 focus:border-red-500"
                            : formData.email && !errors.email
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {emailChecking ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                        ) : (
                          getFieldIcon(
                            "email",
                            errors.email,
                            formData.email && !errors.email
                          )
                        )}
                      </div>
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaPhone className="mr-2 text-indigo-500" />
                      Contact Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        className={`w-full border-2 p-3 pr-10 rounded-xl focus:outline-none transition-colors ${
                          errors.contact_number
                            ? "border-red-500 focus:border-red-500"
                            : formData.contact_number && !errors.contact_number
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldIcon(
                          "contact_number",
                          errors.contact_number,
                          formData.contact_number && !errors.contact_number
                        )}
                      </div>
                    </div>
                    {errors.contact_number && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.contact_number}
                      </p>
                    )}
                  </div>

                  {/* Interview Date */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaCalendarAlt className="mr-2 text-indigo-500" />
                      Interview Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="interviewDate"
                        value={formData.interviewDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split("T")[0]}
                        className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors ${
                          errors.interviewDate
                            ? "border-red-500 focus:border-red-500"
                            : formData.interviewDate && !errors.interviewDate
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div className="flex items-center mt-1">
                      {formData.interviewDate && !errors.interviewDate && (
                        <div className="flex items-center text-green-600 text-sm">
                          <FaCheckCircle className="mr-1" />
                          Valid date selected
                        </div>
                      )}
                    </div>
                    {errors.interviewDate && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.interviewDate}
                      </p>
                    )}
                  </div>

                  {/* Interview Time From */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaCalendarAlt className="mr-2 text-indigo-500" />
                      Interview Start Time *
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenTimeFrom(!openTimeFrom)}
                        className={`w-full border-2 p-3 pr-12 rounded-xl text-left focus:outline-none transition-colors relative ${
                          errors.interviewTimeFrom
                            ? "border-red-500 focus:border-red-500"
                            : formData.interviewTimeFrom &&
                              !errors.interviewTimeFrom
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      >
                        <span
                          className={
                            formData.interviewTimeFrom
                              ? "text-gray-900"
                              : "text-gray-500"
                          }
                        >
                          {formData.interviewTimeFrom
                            ? times.find(
                                (t) => t.value === formData.interviewTimeFrom
                              )?.display
                            : "Select start time"}
                        </span>

                        {/* Dropdown Icon (always at right end) */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          {openTimeFrom ? (
                            <FaChevronUp className="text-gray-400 w-4 h-4" />
                          ) : (
                            <FaChevronDown className="text-gray-400 w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {openTimeFrom && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {getFilteredFromTimes().map((time, i) => (
                              <li
                                key={i}
                                onClick={() => {
  const updatedFormData = {
    ...formData,
    interviewTimeFrom: time.value,
    interviewTimeTo: "" // Clear To time
  };
  setFormData(updatedFormData);
  setOpenTimeFrom(false);
  
  // This should use validateTimeField, not validateField
  validateTimeField("interviewTimeFrom", time.value, updatedFormData);
  
  // Clear To time error
  setErrors(prevErrors => {
    const newErrors = { ...prevErrors };
    delete newErrors.interviewTimeTo;
    return newErrors;
  });
}}


                                className="px-4 py-2 hover:bg-indigo-100 cursor-pointer text-sm"
                              >
                                {time.display}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>

                    {errors.interviewTimeFrom && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.interviewTimeFrom}
                      </p>
                    )}
                  </div>

                  {/* Interview Time To */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaCalendarAlt className="mr-2 text-indigo-500" />
                      Interview End Time *
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenTimeTo(!openTimeTo)}
                        className={`w-full border-2 p-3 pr-12 rounded-xl text-left focus:outline-none transition-colors relative ${
                          errors.interviewTimeTo
                            ? "border-red-500 focus:border-red-500"
                            : formData.interviewTimeTo &&
                              !errors.interviewTimeTo
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      >
                        <span
                          className={
                            formData.interviewTimeTo
                              ? "text-gray-900"
                              : "text-gray-500"
                          }
                        >
                          {formData.interviewTimeTo
                            ? times.find(
                                (t) => t.value === formData.interviewTimeTo
                              )?.display
                            : "Select end time"}
                        </span>

                        {/* Dropdown Icon Always at Right */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          {openTimeTo ? (
                            <FaChevronUp className="text-gray-400 w-4 h-4" />
                          ) : (
                            <FaChevronDown className="text-gray-400 w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {openTimeTo && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {getFilteredToTimes().map((time, i) => (
                            <li
                              key={i}
                              onClick={() => {
  const updatedFormData = {
    ...formData,
    interviewTimeTo: time.value,
  };
  setFormData(updatedFormData);
  setOpenTimeTo(false);
  
  // Use validateTimeField for proper validation
  validateTimeField("interviewTimeTo", time.value, updatedFormData);
}}

                              className="px-4 py-2 hover:bg-indigo-100 cursor-pointer text-sm"
                            >
                              {time.display}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {errors.interviewTimeTo && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.interviewTimeTo}
                      </p>
                    )}
                  </div>
                  {/* CV Upload */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <FaFileUpload className="mr-2 text-indigo-500" />
                      Upload CV *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        name="cv"
                        accept=".pdf,.doc,.docx"
                        onChange={handleChange}
                        className={`w-full border-2 p-3 rounded-xl focus:outline-none transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 ${
                          errors.cv
                            ? "border-red-500 focus:border-red-500"
                            : formData.cv && !errors.cv
                            ? "border-green-500 focus:border-green-500"
                            : "border-gray-200 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    {errors.cv && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <FaTimesCircle className="mr-1" />
                        {errors.cv}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Accepted formats: PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="md:col-span-2 mt-8">
                    <button
                      type="submit"
                      disabled={!isFormValid || loading}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg  ${
                        isFormValid && !loading
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] cursor-pointer"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2 "></div>
                          Submitting...
                        </div>
                      ) : (
                        "Add Candidate"
                      )}
                    </button>
                    {!isFormValid && (
                      <p className="text-gray-500 text-sm mt-2 text-center">
                        Please fill all fields correctly to enable submission
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}