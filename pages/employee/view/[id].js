
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import axios from "axios";
import { Copy, RefreshCw, Eye, EyeOff, User, FileText } from "lucide-react";

export default function ViewEmployee() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [position, setPosition] = useState("");

useEffect(() => {
  const fetchEverything = async () => {
    try {
      // ✅ Fetch currently logged-in user
      const roleRes = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ required for cookie-based JWT
      });

      if (roleRes.ok) {
        const userData = await roleRes.json();

        // ✅ Handle both possible response structures
        const user = userData?.user || userData;
        setRole(user.role); // <-- this is what you're using
      } else {
        console.error("User not authenticated");
      }

      // ✅ Fetch employee details only if ID is present
      if (id) {
        const empRes = await axios.get(`/api/auth/employee/view/${id}`);
        setData(empRes.data);
        setPosition(empRes.data?.user?.position || "");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false); // ✅ Always stop loading
    }
  };

  fetchEverything();
}, [id]);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium">Loading employee details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-lg font-medium">Employee not found</p>
      </div>
    );
  }

  const { user, employee: employees, addresses, bankDetails } = data || {};
  const { name, email, empid, password, employee_type } = user || {};

  const handleRoleChange = async (newRole) => {
    try {
      const res = await axios.patch(`/api/auth/employee/update-role/${user.id}`,
        { role: newRole },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res.status === 200) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            role: newRole,
          },
        }));
              alert("Employee role updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };
  const handleEmployeeTypeChange = async (newType) => {
    try {
      const res = await axios.patch(`/api/auth/employee/update-type/${user.id}`,
      { employee_type: newType },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );

    if (res.status === 200) {
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          employee_type: newType,
        },
      }));
      alert("Employment type updated successfully.");
    }
  } catch (err) {
    console.error("Failed to update employee type:", err);
  }
};

  const handlePositionUpdate = async () => {
    if (!position.trim()) {
      alert("Please enter a valid position");
      return;
    }

    try {
      const res = await axios.patch(`/api/auth/employee/update-position/${empid}`,
        { position },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (res.status === 200) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            position: position,
          },
        }));
        alert("Position updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update position:", err);
      alert("Failed to update position. Please try again.");
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.id) return;
    
    setIsResetting(true);
    try {
      const res = await axios.post('/api/auth/reset-employee-password', {
        userId: user.id
      });
      
      if (res.status === 200) {
        setNewPassword(res.data.newPassword);
        setShowPassword(false);
        alert('Password reset successfully!');
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert('Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
              <p className="text-gray-600">View and manage employee information</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  {employees?.profile_photo ? (
                    <img
                      src={employees.profile_photo}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-gray-200">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                  <p className="text-gray-600">{email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ID: {empid}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {user?.role || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                <p className="text-sm text-gray-600">Employee personal information</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Detail label="Employee ID" value={empid} />
                  <Detail label="Name" value={name} />
                  <Detail label="Email" value={email} />
                  <Detail label="Contact No" value={employees?.contact_no || "N/A"} />
                  <Detail label="DOB" value={employees?.dob ? new Date(employees.dob).toLocaleDateString() : "N/A"} />
                  <Detail label="Gender" value={employees?.gender || "N/A"} />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Position</p>
                    <p className="text-gray-900 font-medium">{user?.position || "N/A"}</p>
                    {["admin", "superadmin"].includes(role) && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          placeholder="Enter new position"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={handlePositionUpdate}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Update
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Employment Type</p>
                    <p className="text-gray-900 font-medium capitalize">{user?.employee_type || "N/A"}</p>
                    {["admin", "superadmin"].includes(role) && (
                      <select
                        value={user?.employee_type || ""}
                        onChange={(e) => handleEmployeeTypeChange(e.target.value)}
                        className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="" disabled>Change Employment Type</option>
                        <option value="Intern">Intern</option>
                        <option value="Full_time">Full-time</option>
                        <option value="Contractor">Contractor</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">User Role</p>
                    <p className="text-gray-900 font-medium capitalize">{user?.role || "N/A"}</p>
                    {["admin", "superadmin"].includes(role) && (
                      <select
                        value={user?.role || ""}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="" disabled>Change User Role</option>
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                <p className="text-sm text-gray-600">Employee residential address</p>
              </div>
              <div className="p-6">
                {addresses?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Detail label="Address Line 1" value={addresses[0]?.address_line1 || "N/A"} />
                    <Detail label="Address Line 2" value={addresses[0]?.address_line2 || "N/A"} />
                    <Detail label="City" value={addresses[0]?.city || "N/A"} />
                    <Detail label="State" value={addresses[0]?.state || "N/A"} />
                    <Detail label="Pincode" value={addresses[0]?.pincode || "N/A"} />
                    <Detail label="Country" value={addresses[0]?.country || "N/A"} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No address information available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                <p className="text-sm text-gray-600">Employee identification and certificates</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FileDetail label="Aadhar Card" file={employees?.aadhar_card} />
                  <Detail label="Aadhar Number" value={employees?.aadhar_number || "N/A"} />
                  <FileDetail label="PAN Card" file={employees?.pan_card} />
                  <Detail label="PAN Number" value={employees?.pan_number || "N/A"} />
                  <FileDetail label="Resume" file={employees?.resume} />
                  <FileDetail label="Experience Certificate" file={employees?.experience_certificate} />
                </div>
              </div>
            </div>

            {/* Qualification */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Education & Qualification</h3>
                <p className="text-sm text-gray-600">Employee educational background</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Detail label="Highest Qualification" value={employees?.highest_qualification || "N/A"} />
                  <FileDetail label="Education Certificates" file={employees?.education_certificates} />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
                <p className="text-sm text-gray-600">Employee banking information</p>
              </div>
              <div className="p-6">
                {bankDetails?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Detail label="Account Holder" value={bankDetails[0]?.account_holder_name || "N/A"} />
                    <Detail label="Bank Name" value={bankDetails[0]?.bank_name || "N/A"} />
                    <Detail label="Branch Name" value={bankDetails[0]?.branch_name || "N/A"} />
                    <Detail label="Account Number" value={bankDetails[0]?.account_number || "N/A"} />
                    <Detail label="IFSC Code" value={bankDetails[0]?.ifsc_code || "N/A"} />
                    <FileDetail label="Checkbook Document" file={bankDetails[0]?.checkbook_document} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bank details available</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Credentials */}
            {["admin", "superadmin"].includes(role) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">System Credentials</h3>
                  <p className="text-sm text-gray-600">Employee login credentials and access management</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Detail label="Employee ID" value={empid} />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Password Management</p>
                      <div className="space-y-3">
                        {newPassword && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-800">New Password:</span>
                                <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                  {showPassword ? newPassword : '••••••••'}
                                </span>
                                <button
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="text-green-600 hover:text-green-800 p-1"
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(newPassword);
                                  alert('Password copied to clipboard!');
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium"
                              >
                                <Copy size={14} />
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handlePasswordReset}
                          disabled={isResetting}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <RefreshCw size={16} className={isResetting ? 'animate-spin' : ''} />
                          {isResetting ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}

function FileDetail({ label, file }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      {file ? (
        <a 
          href={file} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          <FileText className="w-4 h-4 mr-1" />
          View Document
        </a>
      ) : (
        <p className="text-gray-900 font-medium">N/A</p>
      )}
    </div>
  );
}
