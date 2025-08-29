import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if (id) {
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
          .get(`/api/recruitment/getCandidateById?id=${id}`)
          .then((res) => {
            setCandidate(res.data);
            setFormData((prev) => ({
              ...prev,
              contact_no: res.data.contact_number || "",
            }));
          })
          .catch((err) => console.error("Error fetching candidate:", err));
      }
    }
  }, [id]);

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
    const hasAllTextFields = requiredTextFields.every(field => {
      return formData[field] && formData[field].toString().trim() !== '';
    });

    // Check if all required file fields are filled (excluding experience_certificate)
    const requiredFiles = requiredFileFields.filter(field => field !== 'experience_certificate');
    const hasAllFileFields = requiredFiles.every(field => {
      return formData[field] !== null;
    });

    // Check if there are no validation errors
    const hasNoErrors = Object.keys(errors).length === 0;

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
      default:
        delete newErrors[name];
    }
    
    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === "file") {
      const file = files[0];
      if (file) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, [name]: '❌ File size must be less than 5MB' }));
          return;
        }
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, [name]: '❌ Only JPG, PNG, and PDF files are allowed' }));
          return;
        }
        setErrors(prev => ({ ...prev, [name]: undefined }));
      } else {
        // File was removed
        setErrors(prev => ({ ...prev, [name]: '❌ This file is required' }));
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
      // Then validate immediately as user types
      setTimeout(() => validateField(name, value), 100);
    }
  };

const handleDocumentUpload = async (e, type) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file first
  if (file.size > 5 * 1024 * 1024) {
    setErrors(prev => ({ ...prev, [type]: 'File size must be less than 5MB' }));
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
      }
    } else {
      // Textract failed, but file is still uploaded - user can enter number manually
      console.warn("Document processing failed, user can enter number manually:", data.error);
    }
  } catch (err) {
    // Textract failed, but file is still uploaded - user can enter number manually
    console.warn("Document processing failed, user can enter number manually:", err.message);
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
      alert(error.response?.data?.error || "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-800">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.aadhar_card ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.aadhar_card && <p className="text-red-500 text-sm mt-1">{errors.aadhar_card}</p>}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.</p>
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Educational Certificates <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="education_certificates"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="resume"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo <span className="text-red-800">*</span>
                  </label>
                  <input
                    type="file"
                    name="profile_photo"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Certificate (Optional)
                  </label>
                  <input
                    type="file"
                    name="experience_certificate"
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-blue-600 text-sm mt-1">💡 This field is optional. Upload only if you have work experience.</p>
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Confirmation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input type="checkbox" id="confirm" required className="w-5 h-5 text-blue-600 mt-1" />
                <label htmlFor="confirm" className="text-gray-700 text-sm leading-relaxed">
                  I have reviewed all the details provided above, and I confirm that they are accurate and final.
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
  );}