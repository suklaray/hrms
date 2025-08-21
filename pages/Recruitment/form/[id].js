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
              contact_no: res.data.contact_no || "",
            }));
          })
          .catch((err) => console.error("Error fetching candidate:", err));
      }
    }
  }, [id]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'contact_no':
        if (!/^\d{10}$/.test(value)) {
          newErrors[name] = 'Contact number must be exactly 10 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'pincode':
        if (!/^\d{6}$/.test(value)) {
          newErrors[name] = 'Pincode must be exactly 6 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'aadhar_number':
        if (!/^\d{12}$/.test(value.replace(/\s/g, ''))) {
          newErrors[name] = 'Aadhar number must be exactly 12 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'pan_number':
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase())) {
          newErrors[name] = 'PAN number format: ABCDE1234F';
        } else {
          delete newErrors[name];
        }
        break;
      case 'ifsc_code':
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
          newErrors[name] = 'Invalid IFSC code format';
        } else {
          delete newErrors[name];
        }
        break;
      case 'account_number':
        if (!/^\d{9,18}$/.test(value)) {
          newErrors[name] = 'Account number must be 9-18 digits';
        } else {
          delete newErrors[name];
        }
        break;
      default:
        if (value.trim() === '' && document.querySelector(`[name="${name}"]`)?.required) {
          newErrors[name] = 'This field is required';
        } else {
          delete newErrors[name];
        }
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
          setErrors(prev => ({ ...prev, [name]: 'File size must be less than 5MB' }));
          return;
        }
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, [name]: 'Only JPG, PNG, and PDF files are allowed' }));
          return;
        }
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    } else {
      validateField(name, value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
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

  const formDataUpload = new FormData();
  formDataUpload.append("document", file);
  formDataUpload.append("type", type);

  setIsLoading(true);
  setErrors(prev => ({ ...prev, [type]: undefined }));

  try {
    const res = await fetch("/api/textract", {
      method: "POST",
      body: formDataUpload,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to process document');
    }

    let number = "";

    if (data.extractedText) {
      if (type === "aadhar_card") {
        const match = data.extractedText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
        if (match) number = match[0].replace(/\s/g, "");
      } else if (type === "pan_card") {
        const match = data.extractedText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
        if (match) number = match[0];
      }
    }

    setFormData((prev) => ({
      ...prev,
      [type === "aadhar_card" ? "aadhar_number" : "pan_number"]: number,
      [type]: file,
    }));
    
    if (number) {
      validateField(type === "aadhar_card" ? "aadhar_number" : "pan_number", number);
    }
  } catch (err) {
    console.error("Textract error:", err);
    setErrors(prev => ({ ...prev, [type]: err.message || 'Failed to process document' }));
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
    
    // Required files
    const requiredFiles = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'experience_certificate', 'bank_details'
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                  <input
                    type="text"
                    name="contact_no"
                    value={formData.contact_no}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contact_no ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.contact_no && <p className="text-red-500 text-sm mt-1">{errors.contact_no}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card *</label>
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
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Highest Qualification *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Educational Certificates *</label>
                  <input
                    type="file"
                    name="education_certificates"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume *</label>
                  <input
                    type="file"
                    name="resume"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo *</label>
                  <input
                    type="file"
                    name="profile_photo"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Certificate *</label>
                  <input
                    type="file"
                    name="experience_certificate"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={formData.account_holder_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    required
                    maxLength={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Details File *</label>
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
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );}