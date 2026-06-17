import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import SideBar from "@/Components/SideBar";
import axios from "axios";
import {
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  FileText,
  Mail,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
import { swalConfirm } from '@/utils/confirmDialog';

//import toast from "react-hot-toast";
export default function ViewEmployee() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [position, setPosition] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);
  const [positions, setPositions] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resubmitStates, setResubmitStates] = useState({});
  const [resubmitReason, setResubmitReason] = useState({});
  useEffect(() => {
    const fetchEverything = async () => {
      try {
        //  Fetch currently logged-in user
        const roleRes = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", //  required for cookie-based JWT
        });

        if (roleRes.ok) {
          const userData = await roleRes.json();

          // Handle both possible response structures
          const user = userData?.user || userData;
          setRole(user.role); // <-- this is what you're using
        } else {
          console.error("User not authenticated");
        }

        //  Fetch employee details only if ID is present
        // Fetch positions (only for admin/hr/superadmin)
        try {
          const posRes = await axios.get('/api/settings/positions');
          setPositions(posRes.data);
        } catch (posError) {
          console.log('Could not fetch positions:', posError.message);
          setPositions([]);
        }

        if (id) {
          const empRes = await axios.get(`/api/auth/employee/view/${id}`);
          setData(empRes.data);
          setPosition(empRes.data?.user?.position || "");
          setPhoneNumber(empRes.data?.user?.contact_number || "");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEverything();
  }, [id]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Employee Details - HRMS</title>
        </Head>
        <div className="flex min-h-screen bg-gray-50">
          <SideBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 mx-auto"></div>
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <p className="text-gray-600 mt-4 font-medium text-lg">
                Loading employee details...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Head>
          <title>Employee Details - HRMS</title>
        </Head>
        <div className="flex min-h-screen bg-gray-50">
          <SideBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 text-lg font-medium mb-4">
                Employee not found
              </p>
              <button
                onClick={() => router.push("/employeeList")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Back to Employee List
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { user, employee: employees, addresses, bankDetails } = data || {};
  const { name, email, empid, password, employee_type } = user || {};

  const handleRoleChange = async (newRole) => {
    try {
      const res = await axios.patch(
        `/api/auth/employee/update-role/${empid}`,
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
        toast.success("Employee role updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };
  const handleEmployeeTypeChange = async (newType) => {
    try {
      const res = await axios.patch(
        `/api/auth/employee/update-type/${empid}`,
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
        toast.success("Employment type updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update employee type:", err);
    }
  };

  const handlePositionUpdate = async () => {
    if (!position.trim()) {
      toast.error("Please enter a valid position");
      return;
    }

    try {
      const res = await axios.patch(
        `/api/auth/employee/update-position/${empid}`,
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
        toast.success("Position updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update position:", err);
      toast.error("Failed to update position. Please try again.");
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.id) return;

    setIsResetting(true);
    try {
      const res = await axios.post("/api/auth/reset-employee-password", {
        userId: user.id,
      });

      if (res.status === 200) {
        setNewPassword(res.data.newPassword);
        setShowPassword(false);
        toast.success("Password reset successfully!");
      }
    } catch (err) {
      console.error("Failed to reset password:", err);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!newPassword || !empid) {
      toast.error(
        "No password available to send. Please reset password first."
      );
      return;
    }

    setIsSending(true);
    try {
      const res = await axios.post("/api/employee/sendCredentials", {
        empid: empid,
        password: newPassword,
        role: user?.role
      });

      if (res.status === 200) {
        toast.success("Credentials sent successfully to employee email!");
      }
    } catch (err) {
      console.error("Failed to send credentials:", err);
      toast.error("Failed to send credentials. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestResubmission = async (documentType, reason) => {
    const confirmed = await swalConfirm(
      `Are you sure you want to request resubmission of ${getDocumentDisplayName(documentType)}?\n\nThis will notify the employee to upload a new document.`
    );
    
    if (!confirmed) {
      return;
    }

    setResubmitStates(prev => ({ ...prev, [documentType]: true }));

    try {
      const response = await fetch('/api/employee/request-resubmission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empid: empid,
          documentType: documentType,
          reason,
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Resubmission request sent to ${result.employeeName}`);
        
        // Keep the button in "Request Sent" state
        setTimeout(() => {
          setResubmitStates(prev => ({ ...prev, [documentType]: 'sent' }));
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send resubmission request');
        setResubmitStates(prev => ({ ...prev, [documentType]: false }));
      }
    } catch (error) {
      console.error('Error requesting resubmission:', error);
      toast.error('Failed to send resubmission request');
      setResubmitStates(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const getDocumentDisplayName = (documentType) => {
    const names = {
      'aadhar_card': 'Aadhar Card',
      'pan_card': 'PAN Card',
      'resume': 'Resume',
      'experience_certificate': 'Experience Certificate',
      'education_certificates': 'Education Certificates',
      'profile_photo': 'Profile Photo',
      'checkbook_document': 'Checkbook Document'
    };
    
    return names[documentType] || documentType;
  };

  const handleResubmitDocument = async (documentType, file) => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setResubmitStates(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('empid', empid);
      formData.append('documentType', documentType);

      const response = await fetch('/api/employee/upload-document', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Document resubmitted successfully!');
        
        // Update the local data to reflect the new document
        setData(prev => {
          const newData = { ...prev };
          if (documentType === 'checkbook_document') {
            if (newData.bankDetails && newData.bankDetails[0]) {
              newData.bankDetails[0][documentType] = result.filePath;
            }
          } else {
            if (newData.employee) {
              newData.employee[documentType] = result.filePath;
            }
          }
          return newData;
        });
        
        // Reset file input
        const fileInput = document.getElementById(`file-${documentType}`);
        if (fileInput) fileInput.value = '';
        
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resubmit document');
      }
    } catch (error) {
      console.error('Error resubmitting document:', error);
      toast.error('Failed to resubmit document');
    } finally {
      setResubmitStates(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleVerifyEmployee = async () => {
    if (!empid) return;

    setIsVerifying(true);
    try {
      const isCurrentlyVerified = user?.verified === 'verified';
      const updatedVerificationStatus = !isCurrentlyVerified;

      const res = await axios.put("/api/auth/employee/updateVerification", {
        empid: empid,
        verificationStatus: updatedVerificationStatus,
      });
      
      if (res.status === 200) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            verified: updatedVerificationStatus ? 'verified' : 'not_verified',
          },
        }));
        toast.success(`Employee ${updatedVerificationStatus ? 'verified' : 'unverified'} successfully!`);
      }
    } catch (err) {
      console.error("Failed to update verification:", err);
      toast.error("Failed to update verification. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Head>
        <title>Employee Details - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto">
          {/* Breadcrumb Navigation */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => router.push("/employeeList")}
                className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                Employee List
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Employee Details</span>
              {name && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-900 font-medium">{name}</span>
                </>
              )}
            </nav>
          </div>

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Employee Details
                </h1>
                <p className="text-gray-600">
                  View and manage employee information
                </p>
              </div>
              <button
                onClick={() => router.push("/employeeList")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                ← Back to List
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Profile Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    {employees?.profile_photo ? (
                      <Image
                        src={`/api/hr/view-document/${empid}?type=profile_photo`}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="rounded-full object-cover border-4 border-blue-200"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display =
                            "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-gray-200"
                      style={{
                        display: employees?.profile_photo ? "none" : "flex",
                      }}
                    >
                      <User className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                        <p className="text-gray-600">{email}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ID: {empid}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                            {user?.role || "N/A"}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user?.verified === 'verified' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {user?.verified === 'verified' ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                      </div>
                      
                      {["admin", "hr", "superadmin"].includes(role) && (
                        <button
                          onClick={handleVerifyEmployee}
                          disabled={isVerifying}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            user?.verified === 'verified'
                              ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white'
                              : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                          }`}
                        >
                          <CheckCircle size={16} className={isVerifying ? "animate-spin" : ""} />
                          {isVerifying 
                            ? (user?.verified === 'verified' ? "Unverifying..." : "Verifying...") 
                            : (user?.verified === 'verified' ? "Unverify" : "Verify")
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Registration Form Link */}
              {(!employees ||
                !employees.contact_no ||
                !addresses?.length ||
                !bankDetails?.length) && (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900">
                          Complete Your Registration
                        </h3>
                        <p className="text-orange-700 text-sm">
                          Some details are missing. Please complete your profile
                          by filling the registration form.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const formUrl = `/employee/upload-documents/${empid}?name=${encodeURIComponent(
                          name
                        )}&email=${encodeURIComponent(email)}`;
                        window.open(formUrl, "_blank");
                      }}
                      className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Complete Form
                    </button>
                  </div>
                </div>
              )}

              {/* Personal Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    Employee personal information
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Detail label="Employee ID" value={empid} />
                    <Detail label="Name" value={name} />
                    <Detail label="Email" value={email} />
                    <Detail
                      label="Contact No"
                      value={employees?.contact_no || phoneNumber || "N/A"}
                    />
                    <Detail
                      label="DOB"
                      value={
                        employees?.dob
                          ? new Date(employees.dob).toLocaleDateString()
                          : "N/A"
                      }
                    />
                    <Detail label="Gender" value={employees?.gender || "N/A"} />

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Position
                      </p>
                      <p className="text-gray-900 font-medium">
                        {user?.position || "N/A"}
                      </p>
                      {["admin", "hr", "superadmin"].includes(role) && (
                        <div className="mt-2 flex gap-2">
                          <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Select Position</option>
                            {positions.map((pos) => (
                              <option key={pos.id} value={pos.position_name}>
                                {pos.position_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handlePositionUpdate}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Employment Type
                      </p>
                      <p className="text-gray-900 font-medium capitalize">
                        {user?.employee_type || "N/A"}
                      </p>
                      {["admin", "hr", "superadmin"].includes(role) && (
                        <select
                          value={user?.employee_type || ""}
                          onChange={(e) =>
                            handleEmployeeTypeChange(e.target.value)
                          }
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="" disabled>
                            Change Employment Type
                          </option>
                          <option value="Intern">Intern</option>
                          <option value="Full_time">Full-time</option>
                          <option value="Contractor">Contractor</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        User Role
                      </p>
                      <p className="text-gray-900 font-medium capitalize">
                        {user?.role || "N/A"}
                      </p>
                      {["admin", "hr", "superadmin"].includes(role) && (
                        <select
                          value={user?.role || ""}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="" disabled>
                            Change User Role
                          </option>
                          {role === "superadmin" && (
                            <>
                              <option value="employee">Employee</option>
                              <option value="hr">HR</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Superadmin</option>
                            </>
                          )}
                          {role === "admin" && (
                            <>
                              <option value="employee">Employee</option>
                              <option value="hr">HR</option>
                            </>
                          )}
                          {role === "hr" && (
                            <option value="employee">Employee</option>
                          )}
                        </select>

                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Accordion Header */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full flex items-center justify-between p-6 border-b border-gray-100 focus:outline-none"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Address Information
                    </h3>
                    <p className="text-sm text-gray-600">
                      Employee residential address
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="p-6">
                    {addresses?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Detail
                          label="Address Line 1"
                          value={addresses[0]?.address_line1 || "N/A"}
                        />
                        <Detail
                          label="Address Line 2"
                          value={addresses[0]?.address_line2 || "N/A"}
                        />
                        <Detail
                          label="City"
                          value={addresses[0]?.city || "N/A"}
                        />
                        <Detail
                          label="State"
                          value={addresses[0]?.state || "N/A"}
                        />
                        <Detail
                          label="Pincode"
                          value={addresses[0]?.pincode || "N/A"}
                        />
                        <Detail
                          label="Country"
                          value={addresses[0]?.country || "N/A"}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No address information available
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Accordion Header */}
                <button
                  onClick={() => setIsOpen1(!isOpen1)}
                  className="w-full flex items-center justify-between p-6 border-b border-gray-100 focus:outline-none"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Documents
                    </h3>
                    <p className="text-sm text-gray-600">
                      Employee identification and certificates
                    </p>
                  </div>
                  {isOpen1 ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {isOpen1 && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FileDetail
                        label="Aadhar Card"
                        file={employees?.aadhar_card}
                        documentType="aadhar_card"
                        empid={empid}
                        onResubmit={handleResubmitDocument}
                        onRequestResubmission={handleRequestResubmission}
                        isResubmitting={resubmitStates.aadhar_card}
                        userRole={role}
                        resubmitStates={resubmitStates}
                        resubmitReason={resubmitReason}
                        setResubmitReason={setResubmitReason}
                      />
                      <Detail
                        label="Aadhar Number"
                        value={employees?.aadhar_number || "N/A"}
                      />
                      <FileDetail 
                        label="PAN Card" 
                        file={employees?.pan_card}
                        documentType="pan_card"
                        empid={empid}
                        onResubmit={handleResubmitDocument}
                        onRequestResubmission={handleRequestResubmission}
                        isResubmitting={resubmitStates.pan_card}
                        userRole={role}
                        resubmitStates={resubmitStates}
                        resubmitReason={resubmitReason}
                        setResubmitReason={setResubmitReason}
                      />
                      <Detail
                        label="PAN Number"
                        value={employees?.pan_number || "N/A"}
                      />
                      <FileDetail 
                        label="Resume" 
                        file={employees?.resume}
                        documentType="resume"
                        empid={empid}
                        onResubmit={handleResubmitDocument}
                        onRequestResubmission={handleRequestResubmission}
                        isResubmitting={resubmitStates.resume}
                        userRole={role}
                        resubmitStates={resubmitStates}
                        resubmitReason={resubmitReason}
                        setResubmitReason={setResubmitReason}
                      />
                      <FileDetail
                        label="Experience Certificate"
                        file={employees?.experience_certificate}
                        documentType="experience_certificate"
                        empid={empid}
                        onResubmit={handleResubmitDocument}
                        onRequestResubmission={handleRequestResubmission}
                        isResubmitting={resubmitStates.experience_certificate}
                        userRole={role}
                        resubmitStates={resubmitStates}
                        resubmitReason={resubmitReason}
                        setResubmitReason={setResubmitReason}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Qualification */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Accordion Header */}
                <button
                  onClick={() => setIsOpen2(!isOpen2)}
                  className="w-full flex items-center justify-between p-6 border-b border-gray-100 focus:outline-none"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Education & Qualification
                    </h3>
                    <p className="text-sm text-gray-600">
                      Employee educational background
                    </p>
                  </div>
                  {isOpen2 ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {isOpen2 && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Detail
                        label="Highest Qualification"
                        value={employees?.highest_qualification || "N/A"}
                      />
                      <FileDetail
                        label="Education Certificates"
                        file={employees?.education_certificates}
                        documentType="education_certificates"
                        empid={empid}
                        onResubmit={handleResubmitDocument}
                        onRequestResubmission={handleRequestResubmission}
                        isResubmitting={resubmitStates.education_certificates}
                        userRole={role}
                        resubmitStates={resubmitStates}
                        resubmitReason={resubmitReason}
                        setResubmitReason={setResubmitReason}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Accordion Header */}
                <button
                  onClick={() => setIsOpen3(!isOpen3)}
                  className="w-full flex items-center justify-between p-6 border-b border-gray-100 focus:outline-none"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Bank Details
                    </h3>
                    <p className="text-sm text-gray-600">
                      Employee banking information
                    </p>
                  </div>
                  {isOpen2 ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                {isOpen3 && (
                  <div className="p-6">
                    {bankDetails?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Detail
                          label="Account Holder"
                          value={bankDetails[0]?.account_holder_name || "N/A"}
                        />
                        <Detail
                          label="Bank Name"
                          value={bankDetails[0]?.bank_name || "N/A"}
                        />
                        <Detail
                          label="Branch Name"
                          value={bankDetails[0]?.branch_name || "N/A"}
                        />
                        <Detail
                          label="Account Number"
                          value={bankDetails[0]?.account_number || "N/A"}
                        />
                        <Detail
                          label="IFSC Code"
                          value={bankDetails[0]?.ifsc_code || "N/A"}
                        />
                        <FileDetail
                          label="Checkbook Document"
                          file={bankDetails[0]?.checkbook_document}
                          documentType="checkbook_document"
                          empid={empid}
                          onResubmit={handleResubmitDocument}
                          onRequestResubmission={handleRequestResubmission}
                          isResubmitting={resubmitStates.checkbook_document}
                          userRole={role}
                          resubmitStates={resubmitStates}
                          resubmitReason={resubmitReason}
                          setResubmitReason={setResubmitReason}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No bank details available
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* System Credentials */}
              {["admin", "hr", "superadmin"].includes(role) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      System Credentials
                    </h3>
                    <p className="text-sm text-gray-600">
                      Employee login credentials and access management
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Detail label="Employee ID" value={empid} />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Password Management
                        </p>
                        <div className="space-y-3">
                          {newPassword && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-green-800">
                                    New Password:
                                  </span>
                                  <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                    {showPassword ? newPassword : "••••••••"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setShowPassword(!showPassword)
                                    }
                                    className="text-green-600 hover:text-green-800 p-1"
                                  >
                                    {showPassword ? (
                                      <EyeOff size={16} />
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                  </button>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(newPassword);
                                    toast.success(
                                      "Password copied to clipboard!"
                                    );
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium"
                                >
                                  <Copy size={14} />
                                  Copy
                                </button>
                                <button
                                  onClick={handleSendCredentials}
                                  disabled={isSending}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded text-sm font-medium transition-colors"
                                >
                                  <Mail size={14} />
                                  {isSending
                                    ? "Sending..."
                                    : "Send Credentials"}
                                </button>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={handlePasswordReset}
                            disabled={isResetting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <RefreshCw
                              size={16}
                              className={isResetting ? "animate-spin" : ""}
                            />
                            {isResetting ? "Resetting..." : "Reset Password"}
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
    </>
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

function FileDetail({ label, file, documentType, empid, onResubmit, onRequestResubmission, isResubmitting, userRole, resubmitStates, resubmitReason, setResubmitReason }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showResubmit, setShowResubmit] = useState(false);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleResubmitClick = () => {
    if (selectedFile) {
      onResubmit(documentType, selectedFile);
      setSelectedFile(null);
      setShowResubmit(false);
    }
  };

  const handleRequestResubmission = () => {
    const reason = resubmitReason?.[documentType] || "";

    if (!reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }

    onRequestResubmission(documentType, reason);

    setResubmitReason((prev) => ({
      ...prev,
      [documentType]: "",
    }));
  };

  const isEmployee = userRole === 'employee';
  const isAdminHR = ['admin', 'hr', 'superadmin'].includes(userRole);
  const canInteract = empid && documentType && onResubmit;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <div className="space-y-2">
        {file ? (
          <a
            href={file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1" />
            View Document
          </a>
        ) : (
          <p className="text-gray-900 font-medium">N/A</p>
        )}
        
        {canInteract && isEmployee && (
          <div className="mt-2">
            {!showResubmit ? (
              <button
                onClick={() => setShowResubmit(true)}
                className="inline-flex items-center px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors"
              >
                <Upload className="w-3 h-3 mr-1" />
                Resubmit
              </button>
            ) : (
              <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                <input
                  id={`file-${documentType}`}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleResubmitClick}
                    disabled={!selectedFile || isResubmitting}
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {isResubmitting ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResubmit(false);
                      setSelectedFile(null);
                    }}
                    className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {canInteract && isAdminHR && (
          <div className="mt-2 space-y-2">
            <textarea
              value={resubmitReason?.[documentType] || ""}
              onChange={(e) =>
                setResubmitReason((prev) => ({
                  ...prev,
                  [documentType]: e.target.value,
                }))
              }
              placeholder="Enter reason for resubmission"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />

            <button
              onClick={handleRequestResubmission}
              disabled={
                isResubmitting ||
                resubmitStates?.[documentType] === 'sent'
              }
              className={`inline-flex items-center px-3 py-1 text-sm rounded-md transition-colors ${resubmitStates?.[documentType] === 'sent'
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : isResubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
            >
              <Upload className="w-3 h-3 mr-1" />
              {resubmitStates?.[documentType] === 'sent'
                ? 'Request Sent'
                : isResubmitting
                  ? 'Sending...'
                  : 'Request Resubmission'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
