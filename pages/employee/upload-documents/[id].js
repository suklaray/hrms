import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from 'next/head';
import axios from "axios";
import { User, FileText, MapPin, CreditCard, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { swalConfirm} from '@/utils/confirmDialog';

export default function EmployeeDocumentForm() {
  const router = useRouter();
  const { id } = router.query;
  const [mounted, setMounted] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState({
    contact_no: "",
    dob: "",
    gender: "",
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
  });
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [extracting, setExtracting] = useState({ aadhar: false, pan: false });
  const [existingData, setExistingData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchExistingData = async () => {
    try {
      let response;
      try {
      
        // Fall back to employee endpoint
        response = await axios.get(`/api/employee/get-documents/${id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          params: {
            t: Date.now()
          }
        });
      } catch (hrError) {
        toast.error("Error fetching existing data from HR/Admin endpoint, trying Employee endpoint...");
        // Try HR/admin endpoint first, then fall back to employee endpoint
        // response = await axios.get('/api/employee/get-documents/hr-admin', {
        //   headers: {
        //     'Cache-Control': 'no-cache',
        //     'Pragma': 'no-cache'
        //   },
        //   params: {
        //     t: Date.now()
        //   }
        // });
      }
      console.log('API Response:', response.data);
      if (response.data.exists) {
        console.log('Existing data found:', response.data.data);
        setExistingData(response.data.data);
        setIsEditing(true);
        // Pre-fill form with existing data, keeping files as null
        const existingFormData = { ...response.data.data };
        // Format date properly for input field
        if (existingFormData.dob) {
          existingFormData.dob = new Date(existingFormData.dob).toISOString().split('T')[0];
        }
        console.log('Setting form data:', existingFormData);
        setFormData(prev => {
          const newFormData = {
            ...prev,
            ...existingFormData,
            aadhar_card: null,
            pan_card: null,
            education_certificates: null,
            resume: null,
            experience_certificate: null,
            profile_photo: null,
            bank_details: null,
          };
          console.log('Final form data being set:', newFormData);
          return newFormData;
        });
      } else {
        console.log('No existing data found');
      }
    } catch (error) {
      console.error("Error fetching existing data:", error);
    }
  };



  useEffect(() => {
    if (mounted && id) {
      fetchExistingData();
      
      const urlParams = new URLSearchParams(window.location.search);
      const prefillName = urlParams.get('name');
      const prefillEmail = urlParams.get('email');
      
      if (prefillName && prefillEmail) {
        setEmployee({
          empid: id,
          name: decodeURIComponent(prefillName),
          email: decodeURIComponent(prefillEmail)
        });
      } else {
        // Fetch employee data
        axios.get(`/api/employee/get-employee/${id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          params: {
            t: Date.now()
          }
        })
          .then((res) => {
            setEmployee(res.data);
          })
          .catch((err) => console.error("Error fetching employee:", err));
      }
    }
  }, [mounted, id]);

  // Debug formData changes
  useEffect(() => {
    console.log('Current formData:', formData);
  }, [formData]);

  // Check if form is valid
  useEffect(() => {
    const requiredTextFields = [
      'contact_no', 'dob', 'gender', 'address_line_1', 'city', 'state', 'pincode', 'country',
      'highest_qualification', 'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    const requiredFileFields = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'bank_details'
    ].filter(field => !existingData?.[field]);

    const missingTextFields = requiredTextFields.filter(field => {
      return !formData[field] || formData[field].toString().trim() === '';
    });
    const hasAllTextFields = missingTextFields.length === 0;
    
    const missingFileFields = requiredFileFields.filter(field => {
      return formData[field] === null || formData[field] === undefined;
    });
    const hasAllFileFields = missingFileFields.length === 0;
    
    const hasNoErrors = Object.keys(errors).length === 0;

    setIsFormValid(hasAllTextFields && hasAllFileFields && hasNoErrors);
  }, [formData, errors, existingData]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    if (!value || value.trim() === '') {
      if (document.querySelector(`[name="${name}"]`)?.required) {
        newErrors[name] = '❌ This field is required';
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
          const minDate = new Date(currentDate.getFullYear() - 10, currentDate.getMonth(), currentDate.getDate());
          const year = birthDate.getFullYear();
          const yearStr = year.toString();
          
          if (yearStr.length !== 4) {
            newErrors[name] = '❌ Year must be exactly 4 digits';
          } else if (year < 1900) {
            newErrors[name] = '❌ Please enter a valid birth year';
          } else if (birthDate > minDate) {
            newErrors[name] = '❌ Must be at least 10 years old';
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
        if (value.length <=3) {
          newErrors[name] = ' Address must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9\s,.-/#]+$/.test(value)) {
          newErrors[name] = ' Invalid address format';
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
      'contact_no', 'dob', 'gender', 'address_line_1', 'city', 'state', 'pincode', 'country',
      'highest_qualification', 'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    const requiredFiles = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'bank_details'
    ];

    let newErrors = {};

    requiredTextFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        newErrors[field] = '❌ This field is required';
      }
    });

    requiredFiles.forEach(field => {
      if (!formData[field] && !existingData?.[field]) {
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
      if (name === 'experience_certificate') {
        return;
      }
      if (!formData[name] && !existingData?.[name]) {
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

  const extractTextFromDocument = async (file, docType) => {
    setExtracting(prev => ({ ...prev, [docType]: true }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    
    try {
      const response = await axios.post('/api/textract/extract', formData);
      const extractedNumber = response.data.extractedNumber;
      
      if (extractedNumber) {
        setFormData(prev => ({
          ...prev,
          [`${docType}_number`]: extractedNumber
        }));
        validateField(`${docType}_number`, extractedNumber);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
    } finally {
      setExtracting(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === "file") {
      const file = files[0];
      if (file) {
        // Validate file size (maximum 5KB)
        // if (file.size > 5 * 1024) {
        //   setErrors(prev => ({ ...prev, [name]: '❌ File size must be less than 5KB' }));
        //   return;
        // }
        // Validate file size (5KB to 20MB)
        const maxSize = 5 * 1024 * 1024; // 20MB
        // if (file.size < minSize) {
        //   setErrors(prev => ({ ...prev, [name]: '❌ File size must be at least 5KB' }));
        //   return;
        // }
        if (file.size > maxSize) {
          setErrors(prev => ({ ...prev, [name]: '❌ File size must be less than 5MB' }));
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
        if (name !== 'experience_certificate') {
          setErrors(prev => ({ ...prev, [name]: '❌ This file is required' }));
        }
      }
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      
      // Auto-extract for Aadhar and PAN cards
      if (name === 'aadhar_card' && file) {
        extractTextFromDocument(file, 'aadhar');
      } else if (name === 'pan_card' && file) {
        extractTextFromDocument(file, 'pan');
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      if (value && touchedFields[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
      setTimeout(() => validateField(name, value), 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Debug: Log current errors
    console.log('Current errors:', errors);
    console.log('Form data:', formData);
    
    // Validate all required fields before submission
    const requiredTextFields = [
      'contact_no', 'dob', 'gender', 'address_line_1', 'city', 'state', 'pincode', 'country',
      'highest_qualification', 'aadhar_number', 'pan_number', 'account_holder_name',
      'bank_name', 'branch_name', 'account_number', 'ifsc_code'
    ];
    
    const requiredFiles = [
      'aadhar_card', 'pan_card', 'education_certificates',
      'resume', 'profile_photo', 'bank_details'
    ];

    let formErrors = {};

    // Check required text fields
    requiredTextFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        formErrors[field] = 'This field is required';
      }
    });

    // Check required files (only if no existing file exists)
    requiredFiles.forEach(field => {
      if (!formData[field] && !existingData?.[field]) {
        formErrors[field] = 'This file is required';
      }
    });

    // Filter out undefined errors
    const actualErrors = Object.fromEntries(
      Object.entries(errors).filter(([key, value]) => value !== undefined && value !== null && value !== '')
    );

    if (Object.keys(formErrors).length > 0 || Object.keys(actualErrors).length > 0) {
      console.log('Validation errors found:', { formErrors, actualErrors });
      toast.error('Please fix all validation errors before submitting.');
      setErrors(prev => ({ ...prev, ...formErrors }));
      return;
    }

    const confirmed = await swalConfirm(
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
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) {
        data.append(key, value);
      } else if (existingData?.[key] && ['aadhar_card', 'pan_card', 'education_certificates', 'resume', 'experience_certificate', 'profile_photo', 'bank_details'].includes(key)) {
        // Include existing file path for files that weren't re-uploaded
        data.append(`existing_${key}`, existingData[key]);
      }
    });
    data.append("empid", id);
    data.append("name", employee.name);
    data.append("email", employee.email);

    try {
      const response = await axios.post("/api/employee/submit-documents", data);
      toast.success('Documents submitted successfully! You can close this window.');
      window.close();
    } catch (error) {
      console.error("Error submitting documents:", error);
      toast.error(error.response?.data?.error || "Failed to submit documents");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700 text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Document Form - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
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
                    value={employee?.name || ""}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={employee?.email || ""}
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
                    onBlur={handleBlur}
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit contact number"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contact_no ? 'border-red-500' : 'border-gray-300'
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
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
                  {errors.address_line_1 && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.address_line_1}
                    </div>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
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
                  {errors.pincode && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.pincode}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
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

            {/* Documents Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                Identity Documents
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="aadhar_card"
                      accept="image/*,application/pdf"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.aadhar_card}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.aadhar_card ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.aadhar_card ? 'pr-12' : ''}`}
                    />
                    {existingData?.aadhar_card && (
                      <a
                        href={existingData.aadhar_card}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.aadhar_card && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.aadhar_card}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number *</label>
                  <div className="relative">
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
                    {extracting.aadhar && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.aadhar_number && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.aadhar_number}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="pan_card"
                      accept="image/*,application/pdf"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.pan_card}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.pan_card ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.pan_card ? 'pr-12' : ''}`}
                    />
                    {existingData?.pan_card && (
                      <a
                        href={existingData.pan_card}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.pan_card && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.pan_card}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number *</label>
                  <div className="relative">
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
                    {extracting.pan && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  {errors.pan_number && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.pan_number}
                    </div>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Educational Certificates *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="education_certificates"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.education_certificates}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.education_certificates ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.education_certificates ? 'pr-12' : ''}`}
                    />
                    {existingData?.education_certificates && (
                      <a
                        href={existingData.education_certificates}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.education_certificates && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.education_certificates}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resume *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="resume"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.resume}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.resume ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.resume ? 'pr-12' : ''}`}
                    />
                    {existingData?.resume && (
                      <a
                        href={existingData.resume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.resume && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.resume}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="profile_photo"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.profile_photo}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.profile_photo ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.profile_photo ? 'pr-12' : ''}`}
                    />
                    {existingData?.profile_photo && (
                      <a
                        href={existingData.profile_photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.profile_photo && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.profile_photo}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/JPEG only.</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Certificate (Optional)</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="experience_certificate"
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.experience_certificate ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.experience_certificate ? 'pr-12' : ''}`}
                    />
                    {existingData?.experience_certificate && (
                      <a
                        href={existingData.experience_certificate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.experience_certificate && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.experience_certificate}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only.</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Details File *</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="bank_details"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.bank_details}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.bank_details ? 'border-red-500' : 'border-gray-300'
                      } ${existingData?.bank_details ? 'pr-12' : ''}`}
                    />
                    {existingData?.bank_details && (
                      <a
                        href={existingData.bank_details}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                      >
                        <Eye size={20} />
                      </a>
                    )}
                  </div>
                  {errors.bank_details && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.bank_details}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">Max 5MB, JPG/PNG/PDF only.</p>
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
                'Submit Documents'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}