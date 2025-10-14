import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import axios from "axios";

export default function CandidateForm() {
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(false); 
  const [candidate, setCandidate] = useState(null);
  const [formData, setFormData] = useState({
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    highest_qualification: "",
    aadhar_card: null,
    pan_card: null,
    aadhar_number: "",
    pan_number: "",
    education_certificates: null,
    resume: null,
    experience_certificate: null,
    profile_photo: null,
    account_holder_name: "",
    bank_name: "",
    branch_name: "",
    account_number: "",
    ifsc_code: "",
    bank_details: null,
    contact_no: "",
    dob: "",
    gender: "",
  });
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);

  useEffect(() => {
    if (id) {
      // Check form submission status first
      axios
        .get(`/api/recruitment/checkFormStatus?candidate_id=${id}`)
        .then((res) => {
          if (res.data.formSubmitted) {
            // Redirect to already submitted page
            router.push('/form-already-submitted');
            return;
          }
          
          // Check if this is a prefill request from employee view
          const urlParams = new URLSearchParams(window.location.search);
          const isPrefill = urlParams.get('prefill');
          const prefillName = urlParams.get('name');
          const prefillEmail = urlParams.get('email');
          
          if (isPrefill && prefillName && prefillEmail) {
            // Set candidate data from URL parameters
            setCandidate({
              candidate_id: id,
              name: decodeURIComponent(prefillName),
              email: decodeURIComponent(prefillEmail)
            });
          } else {
            // Fetch candidate data normally
            axios
              .get(`/api/recruitment/getCandidateById?id=${id}`,{
                 headers: { 'Cache-Control': 'no-cache' },
              })
              .then((res) => {
                setCandidate(res.data);
                setFormData((prev) => ({
                  ...prev,
                  contact_no: res.data.contact_number || "",
                }));
              })
              .catch((err) => console.error("Error fetching candidate:", err));
          }
        })
        .catch((err) => {
          console.error("Error checking form status:", err);
          // Continue with normal flow if status check fails
        });
    }
  }, [id, router]);

  // Check if form is valid
  useEffect(() => {
    const requiredTextFields = [
      'address_line_1', 'city', 'state', 'pincode', 'country',
      'contact_no', 'dob', 'gender', 'highest_qualification',
      'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    const requiredFileFields = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'experience_certificate', 'bank_details'
    ];

    // Check if all text fields are filled
    const missingTextFields = requiredTextFields.filter(field => {
      return !formData[field] || formData[field].toString().trim() === '';
    });
    const hasAllTextFields = missingTextFields.length === 0;
    
    console.log('Missing text fields:', missingTextFields);

    // Check if all required file fields are filled (excluding experience_certificate)
    const requiredFiles = requiredFileFields.filter(field => field !== 'experience_certificate');
    const missingFileFields = requiredFiles.filter(field => {
      return formData[field] === null || formData[field] === undefined;
    });
    const hasAllFileFields = missingFileFields.length === 0;
    
    console.log('Missing file fields:', missingFileFields);

    // Check if there are no validation errors
    const hasNoErrors = Object.keys(errors).length === 0;

    // Debug logging
    console.log('Form validation check:', {
      hasAllTextFields,
      hasAllFileFields,
      hasNoErrors,
      errors: errors,
      formData: Object.keys(formData).filter(key => formData[key])
    });

    setIsFormValid(hasAllTextFields && hasAllFileFields && hasNoErrors);
  }, [formData, errors]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    // Skip validation for empty values unless it's a required field check
    if (!value || value.trim() === '') {
      if (document.querySelector(`[name="${name}"]`)?.required) {
        newErrors[name] = 'This field is required';
      } else {
        delete newErrors[name];
      }
      setErrors(newErrors);
      return;
    }
    
    switch (name) {
      case 'contact_no':
        if (!/^\d+$/.test(value)) {
          newErrors[name] = '❌ Contact number must contain only digits';
        } else if (value.length !== 10) {
          newErrors[name] = `❌ Must be exactly 10 digits (current: ${value.length})`;
        } else {
          delete newErrors[name];
        }
        break;
      case 'pincode':
        if (!/^\d+$/.test(value)) {
          newErrors[name] = '❌ Pincode must contain only digits';
        } else if (value.length !== 6) {
          newErrors[name] = `❌ Must be exactly 6 digits (current: ${value.length})`;
        } else {
          delete newErrors[name];
        }
        break;
      case 'aadhar_number':
        const cleanAadhar = value.replace(/\s/g, '');
        if (!/^\d+$/.test(cleanAadhar)) {
          newErrors[name] = '❌ Aadhar number must contain only digits';
        } else if (cleanAadhar.length !== 12) {
          newErrors[name] = `❌ Must be exactly 12 digits (current: ${cleanAadhar.length})`;
        } else {
          delete newErrors[name];
        }
        break;
      case 'pan_number':
        const upperPan = value.toUpperCase();
        if (upperPan.length !== 10) {
          newErrors[name] = `❌ Must be exactly 10 characters (current: ${upperPan.length})`;
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upperPan)) {
          newErrors[name] = '❌ Invalid format. Expected: ABCDE1234F';
        } else {
          delete newErrors[name];
        }
        break;
      case 'ifsc_code':
        const upperIfsc = value.toUpperCase();
        if (upperIfsc.length !== 11) {
          newErrors[name] = `❌ Must be exactly 11 characters (current: ${upperIfsc.length})`;
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upperIfsc)) {
          newErrors[name] = '❌ Invalid format. Expected: ABCD0123456';
        } else {
          delete newErrors[name];
        }
        break;
      case 'account_number':
        if (!/^\d+$/.test(value)) {
          newErrors[name] = '❌ Account number must contain only digits. Example: 1234567890123';
        } else if (value.length < 9 || value.length > 18) {
          newErrors[name] = `❌ Must be 9-18 digits (current: ${value.length}). Example: 1234567890123`;
        } else {
          delete newErrors[name];
        }
        break;
      case 'account_holder_name':
        if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[name] = '❌ Name must contain only letters and spaces. Example: John Doe';
        } else if (value.length < 2) {
          newErrors[name] = '❌ Name must be at least 2 characters. Example: John Doe';
        } else {
          delete newErrors[name];
        }
        break;
      case 'bank_name':
        if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[name] = '❌ Bank name must contain only letters and spaces. Example: State Bank of India';
        } else if (value.length < 3) {
          newErrors[name] = '❌ Bank name must be at least 3 characters. Example: HDFC Bank';
        } else {
          delete newErrors[name];
        }
        break;
      case 'branch_name':
        if (!/^[a-zA-Z0-9\s,.-]+$/.test(value)) {
          newErrors[name] = '❌ Invalid branch name format. Example: Main Branch, Mumbai';
        } else if (value.length < 3) {
          newErrors[name] = '❌ Branch name must be at least 3 characters. Example: Main Branch';
        } else if (!/[a-zA-Z]/.test(value)) {
          newErrors[name] = '❌ Branch name must contain at least one letter. Example: Main Branch, Mumbai';
        } else {
          delete newErrors[name];
        }
        break;
      case 'dob':
        if (value) {
          const birthDate = new Date(value);
          const currentDate = new Date();
          const minDate = new Date(currentDate.getFullYear() - 18, currentDate.getMonth(), currentDate.getDate());
          const year = birthDate.getFullYear();
          const yearStr = year.toString();
          
          if (yearStr.length !== 4) {
            newErrors[name] = '❌ Year must be exactly 4 digits';
          } else if (year < 1900) {
            newErrors[name] = '❌ Please enter a valid birth year';
          } else if (birthDate > minDate) {
            newErrors[name] = '❌ Must be at least 18 years old';
          } else {
            delete newErrors[name];
          }
        } else {
          delete newErrors[name];
        }
        break;
      case 'city':
      case 'state':
      case 'country':
        if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[name] = '❌ Only letters and spaces allowed';
        } else if (value.length < 2) {
          newErrors[name] = '❌ Must be at least 2 characters';
        } else {
          delete newErrors[name];
        }
        break;
      case 'address_line_1':
        if (value.length < 3) {
          newErrors[name] = '❌ Address must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9\s,.-/#]+$/.test(value)) {
          newErrors[name] = '❌ Invalid address format';
        } else {
          delete newErrors[name];
        }
        break;
      default:
        delete newErrors[name];
    }
    
    setErrors(newErrors);
  };

  const handleCheckboxClick = () => {
    const requiredTextFields = [
      'address_line_1', 'city', 'state', 'pincode', 'country',
      'contact_no', 'dob', 'gender', 'highest_qualification',
      'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    const requiredFiles = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'bank_details'
    ];

    let newErrors = {};

    // Check required text fields
    requiredTextFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = '❌ This field is required';
      }
    });

    // Check required files
    requiredFiles.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = '❌ This field is required';
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    setShowAllErrors(true);
  };

  const handleBlur = (e) => {
    const { name, value, type } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    
    if (type === 'file') {
      // Skip required validation for optional experience_certificate
      if (name === 'experience_certificate') {
        return;
      }
      if (!formData[name]) {
        setErrors(prev => ({ ...prev, [name]: '❌ This field is required' }));
      } else {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
    } else {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, [name]: '❌ This field is required' }));
      } else {
        validateField(name, value);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === "file") {
      const file = files[0];
      if (file) {
        // Validate file size (5KB minimum, 10MB maximum)
        if (file.size <= 5 * 1024) {
          setErrors(prev => ({ ...prev, [name]: '❌ File size must be greater than 5KB' }));
          return;
        }
        if (file.size >= 10 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, [name]: '❌ File size must be less than 10MB' }));
          return;
        }
        // Validate file type
        let allowedTypes, errorMessage;
        if (name === 'profile_photo') {
          allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
          errorMessage = '❌ Only JPG, PNG, and JPEG files are allowed for profile photo';
        } else {
          allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
          errorMessage = '❌ Only JPG, PNG, and PDF files are allowed';
        }
        if (!allowedTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, [name]: errorMessage }));
          return;
        }
        setErrors(prev => ({ ...prev, [name]: undefined }));
      } else {
        // File was removed - only show error for required files
        if (name !== 'experience_certificate') {
          setErrors(prev => ({ ...prev, [name]: '❌ This file is required' }));
        }
      }
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    } else {
      // Update form data first
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      // Clear error if user starts typing
      if (value && touchedFields[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
      // Then validate immediately as user types
      setTimeout(() => validateField(name, value), 100);
    }
  };

const handleDocumentUpload = async (e, type) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file first
  if (file.size <= 5 * 1024) {
    setErrors(prev => ({ ...prev, [type]: '❌ File size must be greater than 5KB' }));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setErrors(prev => ({ ...prev, [type]: '❌ File size must be less than 10MB' }));
    return;
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    setErrors(prev => ({ ...prev, [type]: 'Only JPG, PNG, and PDF files are allowed' }));
    return;
  }

  // Set file immediately for form submission
  setFormData((prev) => ({
    ...prev,
    [type]: file,
  }));
  setErrors(prev => ({ ...prev, [type]: undefined }));

  // Try to extract text, but don't fail if it doesn't work
  const formDataUpload = new FormData();
  formDataUpload.append("document", file);
  formDataUpload.append("type", type);

  setIsLoading(true);

  try {
    const res = await fetch("/api/textract", {
      method: "POST",
      body: formDataUpload,
    });

    const data = await res.json();

    if (res.ok && data.extractedText) {
      let number = "";

      if (type === "aadhar_card") {
        const match = data.extractedText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
        if (match) number = match[0].replace(/\s/g, "");
      } else if (type === "pan_card") {
        const match = data.extractedText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
        if (match) number = match[0];
      }

      if (number) {
        setFormData((prev) => ({
          ...prev,
          [type === "aadhar_card" ? "aadhar_number" : "pan_number"]: number,
        }));
        validateField(type === "aadhar_card" ? "aadhar_number" : "pan_number", number);
      } else {
        // Show user-friendly message when number extraction fails
        const fieldName = type === "aadhar_card" ? "aadhar_number" : "pan_number";
        const docType = type === "aadhar_card" ? "Aadhar" : "PAN";
        setErrors(prev => ({ 
          ...prev, 
          [fieldName]: `ⓘ Unable to extract ${docType} number automatically. Please enter it manually below.` 
        }));
      }
    } else {
      // Show user-friendly message when processing fails
      const fieldName = type === "aadhar_card" ? "aadhar_number" : "pan_number";
      const docType = type === "aadhar_card" ? "Aadhar" : "PAN";
      setErrors(prev => ({ 
        ...prev, 
        [fieldName]: `ⓘ Unable to extract ${docType} number automatically. Please enter it manually below.` 
      }));
    }
  } catch (err) {
    // Show user-friendly message when processing fails
    const fieldName = type === "aadhar_card" ? "aadhar_number" : "pan_number";
    const docType = type === "aadhar_card" ? "Aadhar" : "PAN";
    setErrors(prev => ({ 
      ...prev, 
      [fieldName]: `ⓘ Unable to extract ${docType} number automatically. Please enter it manually below.` 
    }));
  } finally {
    setIsLoading(false);
  }
};



  const validateForm = () => {
    let formErrors = {};
    
    // Required text fields
    const requiredFields = [
      'address_line_1', 'city', 'state', 'pincode', 'country',
      'contact_no', 'dob', 'gender', 'highest_qualification',
      'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    // Required files (excluding experience_certificate which is optional)
    const requiredFiles = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'bank_details'
    ];

    // Check required text fields
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        formErrors[field] = 'This field is required';
      }
    });

    // Check required files
    requiredFiles.forEach(field => {
      if (!formData[field]) {
        formErrors[field] = 'This file is required';
      }
    });

    // Specific field validations
    if (formData.contact_no && !/^\d{10}$/.test(formData.contact_no)) {
      formErrors.contact_no = 'Contact number must be exactly 10 digits';
    }
    
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      formErrors.pincode = 'Pincode must be exactly 6 digits';
    }
    
    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number.replace(/\s/g, ''))) {
      formErrors.aadhar_number = 'Aadhar number must be exactly 12 digits';
    }
    
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan_number.toUpperCase())) {
      formErrors.pan_number = 'PAN number format: ABCDE1234F';
    }
    
    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      formErrors.ifsc_code = 'Invalid IFSC code format';
    }
    
    if (formData.account_number && !/^\d{9,18}$/.test(formData.account_number)) {
      formErrors.account_number = 'Account number must be 9-18 digits';
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fix all validation errors before submitting.');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      "⚠️ FINAL SUBMISSION CONFIRMATION ⚠️\n\n" +
      "Are you absolutely sure you want to submit this application?\n\n" +
      "IMPORTANT NOTICE:\n" +
      "• Once submitted, NO changes can be made to any information\n" +
      "• All documents and details will be permanently locked\n" +
      "• This action cannot be undone\n" +
      "• Please verify all information is correct before proceeding\n\n" +
      "Click 'OK' only if you are certain all details are accurate and final."
    );
    
    if (!confirmed) {
      return; // User cancelled submission
    }

    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    data.append("candidate_id", id);
    data.append("name", candidate.name);
    data.append("email", candidate.email);
    data.append("is_employee_registration", "true");
    

    try {
      const response = await axios.post("/api/recruitment/submitForm", data);
      alert('Form submitted successfully.');
      router.push('/Recruitment/form/docs_submitted');
    } catch (error) {
      console.error("Error submitting form:", error);
      
      // Check if form was already submitted
      if (error.response?.data?.alreadySubmitted) {
        router.push(error.response.data.redirectTo || '/form-already-submitted');
        return;
      }
      
      alert(error.response?.data?.error || "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Document Submission Form - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white text-center">Document Submission Form</h1>
            <p className="text-blue-100 text-center mt-2">Please fill in all required information</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8" encType="multipart/form-data">
            {/* Personal Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={candidate?.name || "Loading..."}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={candidate?.email || "Loading..."}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number <span className="text-red-800">*</span>
                    {candidate?.contact_number && (
                      <span className="text-green-600 text-xs ml-2">(Pre-filled from candidate data)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="contact_no"
                    value={formData.contact_no}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    maxLength={10}
                    placeholder={candidate?.contact_number ? "" : "Enter 10-digit contact number"}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contact_no ? 'border-red-500' : candidate?.contact_number ? 'border-green-300 bg-green-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.contact_no && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.contact_no}
                    </div>
                  )}
                  {formData.contact_no && !errors.contact_no && formData.contact_no.length === 10 && (
                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                      ✅ Valid contact number
                    </div>
                  )}
                  {candidate?.contact_number && (
                    <p className="text-green-600 text-xs mt-1">✓ Contact number loaded from candidate profile. You can edit if needed.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dob ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dob && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.dob}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-800">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.gender}
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Address Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                Address Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="address_line_1"
                    value={formData.address_line_1}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.address_line_1 ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.address_line_1 && <p className="text-red-500 text-sm mt-1">{errors.address_line_1}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    name="address_line_2"
                    value={formData.address_line_2}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.city}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.state && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.state}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    maxLength={6}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.country ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.country && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.country}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-10 backdrop-brightness-75">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                Identity Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhar Card <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="aadhar_card"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleDocumentUpload(e, "aadhar_card")}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.aadhar_card ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.aadhar_card && <p className="text-red-500 text-sm mt-1">{errors.aadhar_card}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhar Number <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="aadhar_number"
                    placeholder="Enter 12-digit Aadhar Number"
                    value={formData.aadhar_number || ""}
                    onChange={handleChange}
                    required
                    maxLength={12}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.aadhar_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.aadhar_number && <p className="text-red-500 text-sm mt-1">{errors.aadhar_number}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="pan_card"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleDocumentUpload(e, "pan_card")}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pan_card ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pan_card && <p className="text-red-500 text-sm mt-1">{errors.pan_card}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="pan_number"
                    placeholder="ABCDE1234F"
                    value={formData.pan_number || ""}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pan_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pan_number && <p className="text-red-500 text-sm mt-1">{errors.pan_number}</p>}
                </div>
              </div>
            </div>

            {/* Professional Documents Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">4</span>
                Professional Documents
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highest Qualification <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="highest_qualification"
                    value={formData.highest_qualification}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.highest_qualification ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.highest_qualification && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.highest_qualification}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Educational Certificates <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="education_certificates"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.education_certificates ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.education_certificates && <p className="text-red-500 text-sm mt-1">{errors.education_certificates}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="resume"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.resume ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.resume && <p className="text-red-500 text-sm mt-1">{errors.resume}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="profile_photo"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.profile_photo ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.profile_photo && <p className="text-red-500 text-sm mt-1">{errors.profile_photo}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/JPEG only.</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Certificate (Optional)
                  </label>
                  <input
                    type="file"
                    name="experience_certificate"
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.experience_certificate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.experience_certificate && <p className="text-red-500 text-sm mt-1">{errors.experience_certificate}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only.</p>
                  <p className="text-blue-600 text-sm mt-1">ⓘ This field is optional. Upload only if you have work experience.</p>
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">5</span>
                Banking Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleChange}
                    onBlur={(e) => validateField('account_holder_name', e.target.value)}
                    required
                    placeholder="Enter full name as per bank records"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.account_holder_name ? 'border-red-500 bg-red-50' : 
                      formData.account_holder_name && !errors.account_holder_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    }`}
                  />
                  {errors.account_holder_name && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.account_holder_name}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    onBlur={(e) => validateField('bank_name', e.target.value)}
                    required
                    placeholder="Enter bank name (e.g., State Bank of India)"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.bank_name ? 'border-red-500 bg-red-50' : 
                      formData.bank_name && !errors.bank_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    }`}
                  />
                  {errors.bank_name && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.bank_name}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    onBlur={(e) => validateField('branch_name', e.target.value)}
                    required
                    placeholder="Enter branch name (e.g., Main Branch, Mumbai)"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.branch_name ? 'border-red-500 bg-red-50' : 
                      formData.branch_name && !errors.branch_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    }`}
                  />
                  {errors.branch_name && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.branch_name}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    onBlur={(e) => validateField('account_number', e.target.value)}
                    required
                    maxLength={20}
                    placeholder="Enter account number (9-18 digits)"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.account_number ? 'border-red-500 bg-red-50' : 
                      formData.account_number && !errors.account_number ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    }`}
                  />
                  {errors.account_number && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.account_number}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleChange}
                    onBlur={(e) => validateField('ifsc_code', e.target.value)}
                    required
                    maxLength={11}
                    placeholder="Enter IFSC code (e.g., SBIN0001234)"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.ifsc_code ? 'border-red-500 bg-red-50' : 
                      formData.ifsc_code && !errors.ifsc_code ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    }`}
                  />
                  {errors.ifsc_code && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.ifsc_code}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Details File <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="bank_details"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.bank_details ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.bank_details && <p className="text-red-500 text-sm mt-1">{errors.bank_details}</p>}
                  <p className="text-gray-500 text-xs mt-1">Min 5KB, Max 10MB, JPG/PNG/PDF only.</p>
                </div>
              </div>
            </div>
            
            {/* Confirmation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input 
                  type="checkbox" 
                  id="confirm" 
                  required 
                  className="w-5 h-5 text-blue-600 mt-1" 
                  onClick={handleCheckboxClick}
                />
                <label htmlFor="confirm" className="text-gray-700 text-sm leading-relaxed flex-1">
                  I have reviewed all the details provided above, and I confirm that they are accurate and final.
                </label>
                {showAllErrors && isFormValid && (
                  <div className="text-2xl">
                    ✅
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Application'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );}