import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Head from 'next/head';
import SideBar from "@/Components/SideBar";
import Image from "next/image";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadStatus, setUploadStatus] = useState({ loading: false, error: null, success: false });
  const [passwordValidation, setPasswordValidation] = useState({ error: null, loading: false });
  const [showPassword, setShowPassword] = useState({ new: false, confirm: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get("/api/auth/settings/user-profile").then((res) => setUser(res.data));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset status
    setUploadStatus({ loading: false, error: null, success: false });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({ loading: false, error: 'Please select a valid image file (JPEG, PNG, or GIF)', success: false });
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadStatus({ loading: false, error: 'File size must be less than 5MB', success: false });
      return;
    }

    const previewURL = URL.createObjectURL(file);
    setPreview(previewURL);
    setUploadStatus({ loading: true, error: null, success: false });

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axios.post("/api/auth/settings/upload-profile-pic", formData);
      if (res.status === 200) {
        setUploadStatus({ loading: false, error: null, success: true });
        alert('Profile picture uploaded successfully!');
        setTimeout(() => {
          window.location.reload(); // reload to get latest DB image
        }, 1000);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus({ 
        loading: false, 
        error: error.response?.data?.error || 'Failed to upload image. Please try again.', 
        success: false 
      });
      setPreview(null);
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
      const res = await axios.post("/api/auth/change-password", { newPassword });
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
const loaderProp =({ src }) => {
    return src;
}
  return (
    <>
      <Head>
        <title>Profile Settings - HRMS</title>
      </Head>
      <div className="flex min-h-screen">
      <SideBar />
      <div className="flex-1 bg-gradient-to-b from-white to-gray-100 p-10">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-8 relative">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">Profile Settings</h2>

          {user ? (
            <>
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                {preview || user.profilePic ? (
                  <Image
                    src={preview || user.profilePic}
                    alt="Profile"
                    width={120}
                    height={120}
                    className="w-[120px] h-[120px] rounded-full object-cover border-4 border-indigo-500"
                    loader={loaderProp}
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-sm border-2 border-dashed border-indigo-400">
                    + ADD
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadStatus.loading}
                  className={`mt-3 text-sm font-medium ${
                    uploadStatus.loading 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-indigo-600 hover:underline cursor-pointer'
                  }`}
                >
                  {uploadStatus.loading ? 'Uploading...' : 'Change Profile Picture'}
                </button>
                
                {/* Upload Status Messages */}
                {uploadStatus.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-xs text-center">{uploadStatus.error}</p>
                  </div>
                )}
                
                {uploadStatus.success && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 text-xs text-center">Profile picture updated successfully!</p>
                  </div>
                )}
                
                {uploadStatus.loading && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <p className="text-blue-600 text-xs">Uploading image...</p>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Supported formats: JPEG, PNG, GIF (Max 5MB)
                </p>
              </div>

              {/* Details */}
              <div className="space-y-4 text-sm text-gray-800 mt-4">
                <p><span className="font-semibold">Name:</span> {user.name}</p>
                <p><span className="font-semibold">Email:</span> {user.email}</p>
                <p>
                  <span className="font-semibold">Password:</span> *****{" "}
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-indigo-600 hover:underline font-medium ml-2"
                  >
                    Change Password
                  </button>
                </p>
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
        
        {/* Change Password Container */}
        {showPasswordModal && (
          <div className="max-w-xl mx-auto mt-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <p className="text-indigo-100 text-sm">Update your account password</p>
            </div>
            
            <div className="p-6">
              {/* New Password */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.new ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {newPassword && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-2">Password Requirements:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries({
                        'At least 8 characters': validatePassword(newPassword).minLength,
                        'Uppercase letter': validatePassword(newPassword).hasUpper,
                        'Lowercase letter': validatePassword(newPassword).hasLower,
                        'Number': validatePassword(newPassword).hasNumber,
                        'Special character': validatePassword(newPassword).hasSpecial
                      }).map(([req, met]) => (
                        <div key={req} className={`flex items-center ${met ? 'text-green-600' : 'text-red-500'}`}>
                          <span className="mr-1">{met ? '✓' : '✗'}</span>
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12 ${
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
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.confirm ? '👁️' : '👁️‍🗨️'}
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
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">{passwordValidation.error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordValidation({ error: null, loading: false });
                  }}
                  disabled={passwordValidation.loading}
                  className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordUpdate}
                  disabled={passwordValidation.loading || !validatePassword(newPassword).isValid || newPassword !== confirmPassword}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {passwordValidation.loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {passwordValidation.loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
