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
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

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
        if (id) {
          const empRes = await axios.get(`/api/auth/employee/view/${id}`);
          setData(empRes.data);
          setPosition(empRes.data?.user?.position || "");
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
                    <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                    <p className="text-gray-600">{email}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ID: {empid}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                        {user?.role || "N/A"}
                      </span>
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
                      value={employees?.contact_no || "N/A"}
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
                      {["admin", "superadmin"].includes(role) && (
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
                      {["admin", "superadmin"].includes(role) && (
                        <select
                          value={user?.role || ""}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="" disabled>
                            Change User Role
                          </option>
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
                      />
                      <Detail
                        label="Aadhar Number"
                        value={employees?.aadhar_number || "N/A"}
                      />
                      <FileDetail label="PAN Card" file={employees?.pan_card} />
                      <Detail
                        label="PAN Number"
                        value={employees?.pan_number || "N/A"}
                      />
                      <FileDetail label="Resume" file={employees?.resume} />
                      <FileDetail
                        label="Experience Certificate"
                        file={employees?.experience_certificate}
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
              {["admin", "superadmin"].includes(role) && (
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

function FileDetail({ label, file }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
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
    </div>
  );
}
