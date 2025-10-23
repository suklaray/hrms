import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import axios from "axios";

export default function FormPreview() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/auth/me");
        const userData = response.data.user;
        
        // Only allow admin, hr, superadmin to view preview
        if (!["admin", "hr", "superadmin"].includes(userData.role)) {
          router.replace("/unauthorized-form-access");
          return;
        }
        
        setUser(userData);
      } catch (error) {
        router.replace("/unauthorized-form-access");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Form Preview - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
              <h1 className="text-3xl font-bold text-white text-center">
                Document Submission Form Preview
              </h1>
              <p className="text-blue-100 text-center mt-2">
                This is how the form appears to candidates
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">
                    1
                  </span>
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value="John Doe (Pre-filled)"
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value="john.doe@example.com (Pre-filled)"
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 10-digit contact number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-800">*</span>
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg" disabled>
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
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">
                    2
                  </span>
                  Address Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter address line 1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      placeholder="Enter address line 2 (optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter city"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter state"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit pincode"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter country"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">
                    3
                  </span>
                  Identity Documents
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Card <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Min 5KB, Max 10MB, JPG/PNG/PDF only
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Number <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 12-digit Aadhar Number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Card <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Professional Documents Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">
                    4
                  </span>
                  Professional Documents
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Highest Qualification <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Bachelor's Degree"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Educational Certificates <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resume <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Certificate (Optional)
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3">
                    5
                  </span>
                  Banking Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name as per bank records"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., State Bank of India"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch Name <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Main Branch, Mumbai"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter account number (9-18 digits)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IFSC Code <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., SBIN0001234"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Details File <span className="text-red-800">*</span>
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Preview Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-yellow-600 text-2xl">👁️</div>
                  <div>
                    <h3 className="font-semibold text-yellow-800">Form Preview Mode</h3>
                    <p className="text-yellow-700 text-sm">
                      This is a preview of the candidate onboarding form. All fields are disabled for demonstration purposes.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.back()}
                className="w-full py-4 px-6 rounded-lg font-semibold text-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                Back to Recruitment
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

FormPreview.getLayout = function getLayout(page) {
  return page;
};