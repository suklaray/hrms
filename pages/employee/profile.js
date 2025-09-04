import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "@/Components/empSidebar";
import { User, Mail, Camera, Lock, Save, X, Eye, EyeOff, FileText, CheckCircle } from "lucide-react";
import Image from "next/image";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({ error: null, loading: false });
  const [showPassword, setShowPassword] = useState({ new: false, confirm: false });
  const [documentsSubmitted, setDocumentsSubmitted] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '', show: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch employee's own profile data only - secure endpoint
    axios.get('/api/employee/my-profile', { withCredentials: true })
      .then((res) => {
        setUser(res.data);
        checkDocumentStatus(res.data.empid);
      })
      .catch((error) => {
        console.error('Failed to fetch employee profile:', error);
        // Redirect to login if unauthorized
        if (error.response?.status === 401 || error.response?.status === 403) {
          window.location.href = '/employee/login';
        }
      });
  }, []);

  const checkDocumentStatus = async (empid) => {
    try {
      setDocumentsLoading(true);
      const res = await axios.get(`/api/employee/documents/${empid}`, { withCredentials: true });
      setDocumentsSubmitted(res.data.submitted || false);
    } catch (error) {
      console.error("Failed to check document status:", error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentSubmission = () => {
    if (user) {
      const url = `/Recruitment/form/${user.empid}?prefill=true&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setUploadMessage({ 
        type: 'error', 
        text: 'Please select a valid image file (JPEG, PNG, or GIF)', 
        show: true 
      });
      setTimeout(() => setUploadMessage({ type: '', text: '', show: false }), 5000);
      return;
    }

    if (file.size > maxSize) {
      setUploadMessage({ 
        type: 'error', 
        text: 'File size must be less than 5MB', 
        show: true 
      });
      setTimeout(() => setUploadMessage({ type: '', text: '', show: false }), 5000);
      return;
    }

    const previewURL = URL.createObjectURL(file);
    setPreview(previewURL);

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axios.post("/api/auth/settings/upload-profile-pic", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200) {
        setUploadMessage({ 
          type: 'success', 
          text: 'Profile picture uploaded successfully!', 
          show: true 
        });
        setTimeout(() => {
          setUploadMessage({ type: '', text: '', show: false });
          window.location.reload();
        }, 5000);
      }
    } catch (error) {
      setUploadMessage({ 
        type: 'error', 
        text: 'Upload failed. Please try again.', 
        show: true 
      });
      setTimeout(() => setUploadMessage({ type: '', text: '', show: false }), 5000);
    }
  };



  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };

  const handlePasswordUpdate = async () => {
    setPasswordValidation({ error: null, loading: false });
    
    if (!newPassword || !confirmPassword) {
      setPasswordValidation({ error: 'Please fill in all fields', loading: false });
      return;
    }
    
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPasswordValidation({ error: 'Password does not meet requirements', loading: false });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordValidation({ error: 'Passwords do not match', loading: false });
      return;
    }

    setPasswordValidation({ error: null, loading: true });
    
    try {
      const res = await axios.post("/api/auth/change-password", { newPassword }, { withCredentials: true });
      alert(res.data.message);
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordValidation({ error: null, loading: false });
    } catch (err) {
      setPasswordValidation({ 
        error: err.response?.data?.error || "Failed to update password", 
        loading: false 
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600">Manage your personal information and preferences</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {user ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Picture Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center">
                      <Camera className="w-5 h-5 mr-2" />
                      Profile Picture
                    </h3>
                    
                    <div className="relative inline-block mb-4">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-200 overflow-hidden">
                        {preview || user?.profile_photo ? (
                          <Image
                            src={preview || user.profile_photo}
                            alt="Profile"
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                            priority
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${preview || user?.profile_photo ? 'hidden' : ''}`}>
                          <User className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <button
                        onClick={() => fileInputRef.current.click()}
                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Upload Guidelines */}
                    <div className="mb-3 text-xs text-gray-500 text-center">
                      <p>Accepted formats: JPEG, PNG, GIF</p>
                      <p>Maximum size: 5MB</p>
                    </div>

                    {/* Success/Error Message */}
                    {uploadMessage.show && (
                      <div className={`mb-3 p-2 rounded-lg text-xs text-center ${
                        uploadMessage.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {uploadMessage.text}
                      </div>
                    )}

                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium cursor-pointer"
                    >
                      Change Profile Picture
                    </button>
                  </div>
                </div>

                {/* Document Submission Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Document Submission
                    </h3>
                    
                    <div className="mb-4">
                      {documentsLoading ? (
                        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-blue-700 font-medium">Checking Document Status...</span>
                        </div>
                      ) : documentsSubmitted ? (
                        <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                          <span className="text-green-700 font-medium">Documents Submitted Successfully</span>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <FileText className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <span className="text-red-700 font-medium">Documents Not Submitted</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleDocumentSubmission}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
                        documentsSubmitted 
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' 
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {documentsSubmitted ? 'View/Update Documents' : 'Submit Documentation Form'}
                    </button>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Personal Information
                    </h3>
                    <p className="text-sm text-gray-600">Your account details</p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <div className="flex items-center p-3 bg-gray-50 border border-gray-300 rounded-lg">
                          <User className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">{user.name}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <div className="flex items-center p-3 bg-gray-50 border border-gray-300 rounded-lg">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                        <div className="flex items-center">
                          <Lock className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">••••••••</span>
                        </div>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center cursor-pointer"
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Change Section - Inline */}
                {showPasswordModal && (
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Lock className="w-5 h-5 mr-2" />
                            Change Password
                          </h3>
                          <p className="text-sm text-gray-600">Update your account password</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowPasswordModal(false);
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordValidation({ error: null, loading: false });
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showPassword.new ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {/* Password Requirements */}
                        {newPassword && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-2">Password Requirements:</p>
                            <div className="grid grid-cols-1 gap-1 text-xs">
                              {Object.entries({
                                'At least 8 characters': validatePassword(newPassword).minLength,
                                'Uppercase letter (A-Z)': validatePassword(newPassword).hasUpper,
                                'Lowercase letter (a-z)': validatePassword(newPassword).hasLower,
                                'Number (0-9)': validatePassword(newPassword).hasNumber,
                                'Special character (!@#$...)': validatePassword(newPassword).hasSpecial
                              }).map(([req, met]) => (
                                <div key={req} className={`flex items-center ${met ? 'text-green-600' : 'text-red-500'}`}>
                                  <span className="mr-2">{met ? '✓' : '✗'}</span>
                                  <span>{req}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showPassword.confirm ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all pr-12 ${
                              confirmPassword && newPassword !== confirmPassword 
                                ? 'border-red-300 bg-red-50' 
                                : confirmPassword && newPassword === confirmPassword 
                                  ? 'border-green-300 bg-green-50' 
                                  : 'border-gray-300'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {confirmPassword && (
                          <p className={`mt-1 text-xs ${
                            newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                          </p>
                        )}
                      </div>

                      {/* Error Message */}
                      {passwordValidation.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-600 text-sm font-medium">{passwordValidation.error}</p>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          onClick={() => {
                            setShowPasswordModal(false);
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordValidation({ error: null, loading: false });
                          }}
                          disabled={passwordValidation.loading}
                          className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors disabled:opacity-50 flex items-center cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={handlePasswordUpdate}
                          disabled={passwordValidation.loading || !validatePassword(newPassword).isValid || newPassword !== confirmPassword}
                          className="px-6 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                        >
                          {passwordValidation.loading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          )}
                          <Save className="w-4 h-4 mr-1" />
                          {passwordValidation.loading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}
