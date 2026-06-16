import { useState, useEffect, useCallback } from "react";
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
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [specificDocument, setSpecificDocument] = useState(null);
  const [pendingResubmissions, setPendingResubmissions] = useState([]);

  const getDocumentDisplayName = (docType) => {
    const names = {
      'aadhar_card': 'Aadhar Card',
      'pan_card': 'PAN Card',
      'resume': 'Resume',
      'experience_certificate': 'Experience Certificate',
      'education_certificates': 'Education Certificates',
      'profile_photo': 'Profile Photo',
      'checkbook_document': 'Bank Details Document'
    };
    return names[docType] || docType;
  };

  const isDocumentPendingResubmission = (documentType) => {
    return Array.isArray(pendingResubmissions) && pendingResubmissions.some(req => req.document_type === documentType);
  };

  const getPendingResubmissionInfo = (documentType) => {
    return Array.isArray(pendingResubmissions) ? pendingResubmissions.find(req => req.document_type === documentType) : null;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchExistingData = useCallback(async () => {
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
  }, [id]);

  const fetchPendingResubmissions = useCallback(async () => {
    try {
      const response = await axios.get(`/api/employee/request-resubmission?empid=${id}`);
      if (response.data.success) {
        setPendingResubmissions(response.data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching pending resubmissions:", error);
    }
  }, [id]);



  useEffect(() => {
    if (mounted && id) {
      fetchExistingData();
      fetchPendingResubmissions();
      
      const urlParams = new URLSearchParams(window.location.search);
      const prefillName = urlParams.get('name');
      const prefillEmail = urlParams.get('email');
      const documentType = urlParams.get('document');
      
      // Store document type for specific document upload
      if (documentType) {
        setSpecificDocument(documentType);
      }
      
      if (prefillName && prefillEmail) {
        setEmployee({
          empid: id,
          name: decodeURIComponent(prefillName),
          email: decodeURIComponent(prefillEmail)
        });
        axios.get(`/api/employee/get-employee/${id}`)
          .then((res) => {
            if (res.data.form_submitted) {
              setIsFormSubmitted(true);
            }
          })
          .catch((err) => console.error("Error fetching employee:", err));
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
            if (res.data.form_submitted) {
              setIsFormSubmitted(true);
            }
          })
          .catch((err) => console.error("Error fetching employee:", err));
      }
    }
  }, [mounted, id, fetchExistingData, fetchPendingResubmissions]);

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
    
    // Handle specific document upload
    if (specificDocument) {
      return handleSpecificDocumentUpload();
    }
    
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
    data.append("isResubmission", isEditing ? "true" : "false");

    try {
      const response = await axios.post("/api/employee/submit-documents", data);
      toast.success(isEditing ? 'Documents updated successfully!' : 'Documents submitted successfully!');
      
      // Refresh pending resubmissions to remove completed ones
      await fetchPendingResubmissions();
      
      // Don't close window, allow user to continue editing
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error submitting documents:", error);
      toast.error(error.response?.data?.error || "Failed to submit documents");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecificDocumentUpload = async () => {
    const fileField = specificDocument === 'checkbook_document' ? 'bank_details' : specificDocument;
    const file = formData[fileField];
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    data.append('document', file);
    data.append('documentType', specificDocument);

    try {
      const response = await axios.post('/api/employee/upload-document', data);
      toast.success('Document uploaded successfully!');
      
      // Refresh pending resubmissions to remove completed ones
      await fetchPendingResubmissions();
      
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.error || 'Failed to upload document');
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

  // Render specific document upload form
  if (specificDocument) {
    return (
      <>
        <Head>
          <title>Upload Document - HRMS</title>
        </Head>
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-blue-600 text-white p-6">
                <h1 className="text-2xl font-bold">Upload {getDocumentDisplayName(specificDocument)}</h1>
                <p className="text-blue-100 mt-2">Employee: {employee.name} ({employee.empid})</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getDocumentDisplayName(specificDocument)} *
                  </label>
                  <input
                    type="file"
                    name={specificDocument === 'checkbook_document' ? 'bank_details' : specificDocument}
                    accept={specificDocument === 'profile_photo' ? 'image/jpeg,image/png,image/jpg' : 'image/*,application/pdf'}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Max 15MB, {specificDocument === 'profile_photo' ? 'JPG/PNG/JPEG only' : 'JPG/PNG/PDF only'}
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Uploading...
                    </div>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{specificDocument ? 'Upload Document' : 'Employee Document Form'} - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {isFormSubmitted && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={20} color="#0ea5e9" />
            <span style={{ color: '#0ea5e9', fontWeight: '500' }}>
              Documents already submitted - View only
            </span>
          </div>
        )}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contact_no ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.dob ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.gender ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.address_line_1 ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.country ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhar Card *
                    {isDocumentPendingResubmission('aadhar_card') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('aadhar_card') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('aadhar_card')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('aadhar_card')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="aadhar_card"
                      accept="image/*,application/pdf"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.aadhar_card || isDocumentPendingResubmission('aadhar_card')}
                      disabled={!isDocumentPendingResubmission('aadhar_card') && existingData?.aadhar_card}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.aadhar_card ? 'border-red-500' : 
                        isDocumentPendingResubmission('aadhar_card') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.aadhar_card ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('aadhar_card') && existingData?.aadhar_card ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    {existingData?.aadhar_card && (
                      <a
                        href={existingData.aadhar_card}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                        title="View current document"
                        style={{ pointerEvents: 'auto' }}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.
                    {!isDocumentPendingResubmission('aadhar_card') && existingData?.aadhar_card && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
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
                      disabled={isFormSubmitted}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.aadhar_number ? 'border-red-500' : 'border-gray-300'
                      } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card *
                    {isDocumentPendingResubmission('pan_card') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('pan_card') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('pan_card')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('pan_card')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="pan_card"
                      accept="image/*,application/pdf"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.pan_card || isDocumentPendingResubmission('pan_card')}
                      disabled={!isDocumentPendingResubmission('pan_card') && existingData?.pan_card}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.pan_card ? 'border-red-500' : 
                        isDocumentPendingResubmission('pan_card') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.pan_card ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('pan_card') && existingData?.pan_card ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/PDF only. Number will be auto-extracted if possible.
                    {!isDocumentPendingResubmission('pan_card') && existingData?.pan_card && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
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
                      disabled={isFormSubmitted}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.pan_number ? 'border-red-500' : 'border-gray-300'
                      } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.highest_qualification ? 'border-red-500' : 'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.highest_qualification && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.highest_qualification}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Educational Certificates *
                    {isDocumentPendingResubmission('education_certificates') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('education_certificates') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('education_certificates')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('education_certificates')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="education_certificates"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.education_certificates || isDocumentPendingResubmission('education_certificates')}
                      disabled={!isDocumentPendingResubmission('education_certificates') && existingData?.education_certificates}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.education_certificates ? 'border-red-500' : 
                        isDocumentPendingResubmission('education_certificates') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.education_certificates ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('education_certificates') && existingData?.education_certificates ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/PDF only.
                    {!isDocumentPendingResubmission('education_certificates') && existingData?.education_certificates && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume *
                    {isDocumentPendingResubmission('resume') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('resume') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('resume')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('resume')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="resume"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.resume || isDocumentPendingResubmission('resume')}
                      disabled={!isDocumentPendingResubmission('resume') && existingData?.resume}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.resume ? 'border-red-500' : 
                        isDocumentPendingResubmission('resume') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.resume ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('resume') && existingData?.resume ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/PDF only.
                    {!isDocumentPendingResubmission('resume') && existingData?.resume && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo *
                    {isDocumentPendingResubmission('profile_photo') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('profile_photo') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('profile_photo')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('profile_photo')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="profile_photo"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.profile_photo || isDocumentPendingResubmission('profile_photo')}
                      disabled={!isDocumentPendingResubmission('profile_photo') && existingData?.profile_photo}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.profile_photo ? 'border-red-500' : 
                        isDocumentPendingResubmission('profile_photo') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.profile_photo ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('profile_photo') && existingData?.profile_photo ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/JPEG only.
                    {!isDocumentPendingResubmission('profile_photo') && existingData?.profile_photo && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
                </div>
                
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Certificate (Optional)
                      {isDocumentPendingResubmission('experience_certificate') && (
                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Resubmission Required
                        </span>
                      )}
                    </label>
                    {isDocumentPendingResubmission('experience_certificate') && (
                      <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-800 text-sm font-medium">
                          📄 Document Resubmission Required
                        </p>
                        <p className="text-orange-700 text-xs mt-1">
                          Reason: {getPendingResubmissionInfo('experience_certificate')?.reason || 'Document verification failed'}
                        </p>
                        <p className="text-orange-600 text-xs mt-1">
                          Requested by: {getPendingResubmissionInfo('experience_certificate')?.requestor?.name || 'HR/Admin'}
                        </p>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="file"
                        name="experience_certificate"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        // CRITICAL DIFFERENCE: It is only mandatory IF HR asked for a resubmission
                        required={isDocumentPendingResubmission('experience_certificate')}
                        // Locks the field if it exists, UNLESS HR asked for a new one
                        disabled={
                          !isDocumentPendingResubmission('experience_certificate') &&
                          existingData?.experience_certificate
                        }
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.experience_certificate
                            ? 'border-red-500'
                            : isDocumentPendingResubmission('experience_certificate')
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-300'
                          } ${existingData?.experience_certificate ? 'pr-12' : ''} ${!isDocumentPendingResubmission('experience_certificate') &&
                            existingData?.experience_certificate
                            ? 'bg-gray-100 cursor-not-allowed'
                            : ''
                          }`}
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
                    <p className="text-gray-500 text-xs mt-1">
                      Max 5MB, JPG/PNG/PDF only.
                      {!isDocumentPendingResubmission('experience_certificate') &&
                        existingData?.experience_certificate && (
                          <span className="text-blue-600 ml-1">
                            ✓ Already uploaded - disabled unless resubmission required
                          </span>
                        )}
                    </p>
                    <p className="text-blue-600 text-sm mt-1">
                      ⓘ This field is optional. Upload only if you have work experience.
                    </p>
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.account_holder_name ? 'border-red-500 bg-red-50' : 
                      formData.account_holder_name && !errors.account_holder_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.bank_name ? 'border-red-500 bg-red-50' : 
                      formData.bank_name && !errors.bank_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.branch_name ? 'border-red-500 bg-red-50' : 
                      formData.branch_name && !errors.branch_name ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.account_number ? 'border-red-500 bg-red-50' : 
                      formData.account_number && !errors.account_number ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    disabled={isFormSubmitted}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.ifsc_code ? 'border-red-500 bg-red-50' : 
                      formData.ifsc_code && !errors.ifsc_code ? 'border-green-500 bg-green-50' :
                      'border-gray-300'
                    } ${isFormSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {errors.ifsc_code && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {errors.ifsc_code}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Details File *
                    {isDocumentPendingResubmission('checkbook_document') && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Resubmission Required
                      </span>
                    )}
                  </label>
                  {isDocumentPendingResubmission('checkbook_document') && (
                    <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 text-sm font-medium">📄 Document Resubmission Required</p>
                      <p className="text-orange-700 text-xs mt-1">
                        Reason: {getPendingResubmissionInfo('checkbook_document')?.reason || 'Document verification failed'}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested by: {getPendingResubmissionInfo('checkbook_document')?.requestor?.name || 'HR/Admin'}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      name="bank_details"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required={!existingData?.bank_details || isDocumentPendingResubmission('checkbook_document')}
                      disabled={!isDocumentPendingResubmission('checkbook_document') && existingData?.bank_details}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.bank_details ? 'border-red-500' : 
                        isDocumentPendingResubmission('checkbook_document') ? 'border-orange-500 bg-orange-50' :
                        'border-gray-300'
                      } ${existingData?.bank_details ? 'pr-12' : ''} ${
                        !isDocumentPendingResubmission('checkbook_document') && existingData?.bank_details ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                  <p className="text-gray-500 text-xs mt-1">
                    Max 5MB, JPG/PNG/PDF only.
                    {!isDocumentPendingResubmission('checkbook_document') && existingData?.bank_details && (
                      <span className="text-blue-600 ml-1">✓ Already uploaded - disabled unless resubmission required</span>
                    )}
                  </p>
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
              disabled={isSubmitting || (specificDocument && !formData[specificDocument === 'checkbook_document' ? 'bank_details' : specificDocument])}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {specificDocument ? 'Uploading...' : (isEditing ? 'Updating...' : 'Submitting...')}
                </div>
              ) : (
                specificDocument ? 'Upload Document' : (isEditing ? 'Update Documents' : 'Submit Documents')
              )}
            </button>
            </form>
        </div>
      </div>
    </div>
    </>
  );
}