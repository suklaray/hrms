import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { User, FileText, MapPin, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

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
  const [extracting, setExtracting] = useState({ aadhar: false, pan: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && id) {
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
        axios.get(`/api/employee/get-employee/${id}`)
          .then((res) => {
            setEmployee(res.data);
          })
          .catch((err) => console.error("Error fetching employee:", err));
      }
    }
  }, [mounted, id]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'contact_no':
        if (!/^\d{10}$/.test(value)) {
          newErrors[name] = 'Contact number must be 10 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'pincode':
        if (!/^\d{6}$/.test(value)) {
          newErrors[name] = 'Pincode must be 6 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'aadhar_number':
        if (!/^\d{12}$/.test(value)) {
          newErrors[name] = 'Aadhar number must be 12 digits';
        } else {
          delete newErrors[name];
        }
        break;
      case 'pan_number':
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          newErrors[name] = 'Invalid PAN format (e.g., ABCDE1234F)';
        } else {
          delete newErrors[name];
        }
        break;
      case 'ifsc_code':
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
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
        if (value.trim() === '') {
          newErrors[name] = 'This field is required';
        } else {
          delete newErrors[name];
        }
    }
    
    setErrors(newErrors);
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
      setFormData((prev) => ({
        ...prev,
        [name]: file,
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
      validateField(name, value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.keys(errors).length > 0) {
      alert("Please fix all validation errors before submitting.");
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    data.append("empid", id);
    data.append("name", employee.name);
    data.append("email", employee.email);

    try {
      const response = await axios.post("/api/employee/submit-documents", data);
      alert('Documents submitted successfully.');
      router.push(`/employee/view/${id}`);
    } catch (error) {
      console.error("Error submitting documents:", error);
      alert("Failed to submit documents");
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
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.contact_no ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.contact_no && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.contact_no}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pincode && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
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
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                  <input
                    type="file"
                    name="aadhar_card"
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="aadhar_number"
                      placeholder="Enter Aadhar Number"
                      value={formData.aadhar_number}
                      onChange={handleChange}
                      required
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
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.aadhar_number}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card *</label>
                  <input
                    type="file"
                    name="pan_card"
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="pan_number"
                      placeholder="Enter PAN Number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      required
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
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.account_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.account_number && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
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
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.ifsc_code ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.ifsc_code && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.ifsc_code}
                    </div>
                  )}
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
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg"
            >
              Submit Documents
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}