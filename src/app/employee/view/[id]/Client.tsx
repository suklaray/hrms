"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "@/lib/compatRouter";
import Head from "@/lib/compatHead";
import SideBar from "@/Components/SideBar";
import Pageheader from "@/Components/PageHeader";
import { PayrollDetailsSkeleton } from "@/Components/Skeletons";
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
  Search,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import { swalConfirm } from "@/utils/confirmDialog";

interface EmployeeRecord {
  aadhar_card?: string | null;
  pan_card?: string | null;
  resume?: string | null;
  experience_certificate?: string | null;
  tenth_certificate?: string | null;
  twelfth_certificate?: string | null;
  degree_certificate?: string | null;
  aadhar_number?: string | null;
  pan_number?: string | null;
  highest_qualification?: string | null;
  education_certificates?: string | null;
  dob?: string | null;
  gender?: string | null;
  contact_no?: string | null;
  [key: string]: unknown;
}

interface RbacRole {
  id?: number;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

interface EmployeeUser {
  id?: number;
  role?: string;
  roleId?: number;
  verified?: string;
  rbacRole?: RbacRole;
  position?: string | null;
  employee_type?: string | null;
  contact_number?: string | null;
  name?: string;
  email?: string;
  empid?: string;
  password?: string;
  [key: string]: unknown;
}

interface AddressRecord {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  [key: string]: unknown;
}

interface BankDetailRecord {
  account_holder_name?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  checkbook_document?: string | null;
  [key: string]: unknown;
}

interface EmployeeData {
  user?: EmployeeUser;
  employee?: EmployeeRecord;
  addresses?: AddressRecord[];
  bankDetails?: BankDetailRecord[];
  [key: string]: unknown;
}

function ViewEmployee() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [position, setPosition] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [isOpen1, setIsOpen1] = useState(true);
  const [isOpen2, setIsOpen2] = useState(true);
  const [isOpen3, setIsOpen3] = useState(true);
  const [positions, setPositions] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resubmitStates, setResubmitStates] = useState<Record<string, boolean | string>>({});
  const [resubmitReason, setResubmitReason] = useState<Record<string, string>>({});

  const hasPerm = (permissionKey: string) => isSuperAdminUser || userPermissions.includes(permissionKey);

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        // Fetch currently logged-in user
        const roleRes = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (roleRes.ok) {
          const authData = await roleRes.json();
          const userObj = authData?.user || authData;
          setRole(userObj.role);
          setUserPermissions(authData?.permissions || userObj.permissions || []);
          setIsSuperAdminUser(!!(authData?.isSuperAdmin || userObj.isSuperAdmin));
        } else {
          console.error("User not authenticated");
        }

        // Fetch roles from roles table
        try {
          const rolesRes = await axios.get("/api/settings/employee-types", { withCredentials: true });
          const available = rolesRes.data?.assignableRoles || rolesRes.data?.roles || [];
          setRolesList(available);
        } catch (rErr: any) {
          console.log("Could not fetch roles list:", rErr?.message);
          setRolesList([]);
        }

        // Fetch positions
        try {
          const posRes = await axios.get("/api/settings/positions");
          setPositions(posRes.data);
        } catch (posError: any) {
          console.log("Could not fetch positions:", posError?.message);
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

  const { user, employee: employees, addresses, bankDetails } = data || {};
  const name = user?.name as string | undefined;
  const email = user?.email as string | undefined;
  const empid = user?.empid as string | undefined;

  const handleSelectRole = async (selectedRole: any) => {
    setIsUpdatingRole(true);
    try {
      const res = await axios.put(
        `/api/auth/employee/update-role/${empid}`,
        { roleId: selectedRole.id },
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
            ...prev?.user,
            roleId: selectedRole.id,
            role: res.data?.updatedUser?.role || selectedRole.name,
            rbacRole: selectedRole,
          },
        }));
        setIsRoleDropdownOpen(false);
        setRoleSearchTerm("");
        toast.success(`User role updated to ${selectedRole.name}`);
      }
    } catch (err: any) {
      console.error("Failed to update role:", err);
      toast.error(err.response?.data?.message || "Failed to update role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
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
            ...prev?.user,
            role: newRole,
          },
        }));
        toast.success("Employee role updated successfully.");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleEmployeeTypeChange = async (newType: string) => {
    try {
      const res = await axios.put(
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
            ...prev?.user,
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
      const res = await axios.put(
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
            ...prev?.user,
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
      toast.error("No password available to send. Please reset password first.");
      return;
    }

    setIsSending(true);
    try {
      const res = await axios.post("/api/employee/sendCredentials", {
        empid: empid,
        password: newPassword,
        role: user?.role,
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

  const handleRequestResubmission = async (documentType: string, reason: string) => {
    const confirmed = await swalConfirm(
      `Are you sure you want to request resubmission of ${getDocumentDisplayName(documentType)}?\n\nThis will notify the employee to upload a new document.`
    );

    if (!confirmed) {
      return;
    }

    setResubmitStates((prev) => ({ ...prev, [documentType]: true }));

    try {
      const response = await fetch("/api/employee/request-resubmission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empid: empid,
          documentType: documentType,
          reason,
        }),
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Resubmission request sent to ${result.employeeName}`);

        setTimeout(() => {
          setResubmitStates((prev) => ({ ...prev, [documentType]: "sent" }));
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send resubmission request");
        setResubmitStates((prev) => ({ ...prev, [documentType]: false }));
      }
    } catch (error) {
      console.error("Error requesting resubmission:", error);
      toast.error("Failed to send resubmission request");
      setResubmitStates((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const getDocumentDisplayName = (documentType: string) => {
    const names: Record<string, string> = {
      aadhar_card: "Aadhar Card",
      pan_card: "PAN Card",
      resume: "Resume",
      experience_certificate: "Experience Certificate",
      education_certificates: "Education Certificates",
      profile_photo: "Profile Photo",
      checkbook_document: "Checkbook Document",
    };

    return names[documentType] || documentType;
  };

  const handleResubmitDocument = async (documentType: string, file: File) => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setResubmitStates((prev) => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("empid", String(id));
      formData.append("documentType", documentType);

      const response = await fetch("/api/employee/upload-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Document resubmitted successfully!");

        setData((prev) => {
          const newData = { ...prev };
          if (documentType === "checkbook_document") {
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

        const fileInput = document.getElementById(`file-${documentType}`) as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to resubmit document");
      }
    } catch (error) {
      console.error("Error resubmitting document:", error);
      toast.error("Failed to resubmit document");
    } finally {
      setResubmitStates((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const handleVerifyEmployee = async () => {
    if (!empid) return;

    setIsVerifying(true);
    try {
      const isCurrentlyVerified = user?.verified === "verified";
      const updatedVerificationStatus = !isCurrentlyVerified;

      const res = await axios.put("/api/auth/employee/updateVerification", {
        empid: empid,
        verificationStatus: updatedVerificationStatus,
      });

      if (res.status === 200) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev?.user,
            verified: updatedVerificationStatus ? "verified" : "not_verified",
          },
        }));
        toast.success(`Employee ${updatedVerificationStatus ? "verified" : "unverified"} successfully!`);
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
        <title>{name ? `${name} - Employee Details` : "Employee Details - HRMS"}</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        <div className="flex-1 overflow-auto p-6">
          <Pageheader
            title="View Employee Profile"
            description="View and manage employee profile and documents"
            href="/employeeList"
          />

          {loading ? (
            <PayrollDetailsSkeleton />
          ) : !data ? (
            <div className="bg-white shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-red-600 text-sm font-medium mb-3">Employee not found</p>
              <Link
                href="/employeeList"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Back to Employee List
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
              {/* Top Subheader Bar */}
              <div className="h-10 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#333]">
                    {name || "Employee"}
                  </span>

                  <span className="text-[12px] text-[#777]">/</span>

                  <span className="text-[12px] text-[#666]">
                    {empid}
                  </span>

                  {user?.position && (
                    <>
                      <span className="text-[12px] text-[#777]">/</span>
                      <span className="text-[12px] text-[#666]">
                        {user.position}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#777]">Verification</span>
                    <span
                      className={`px-2.5 py-1 text-[11px] font-semibold ${
                        user?.verified === "verified"
                          ? "text-lime-700 bg-lime-200 border border-lime-400 rounded-full"
                          : "text-red-700 bg-red-200 border border-red-400 rounded-full"
                      }`}
                    >
                      {user?.verified === "verified" ? "Verified" : "Not Verified"}
                    </span>
                  </div>

                  {hasPerm("employee.verify") && (
                    <button
                      onClick={handleVerifyEmployee}
                      disabled={isVerifying}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                        user?.verified === "verified"
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                          : "bg-lime-100 hover:bg-lime-200 text-lime-800 border border-lime-300"
                      }`}
                    >
                      <CheckCircle size={12} className={isVerifying ? "animate-spin" : ""} />
                      <span>
                        {isVerifying
                          ? user?.verified === "verified"
                            ? "Unverifying..."
                            : "Verifying..."
                          : user?.verified === "verified"
                          ? "Unverify"
                          : "Verify Employee"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="mt-4">
                {/* Complete Registration Notice */}
                {(!employees ||
                  !employees.contact_no ||
                  !addresses?.length ||
                  !bankDetails?.length) && (
                  <div className="border border-amber-300 bg-amber-50/80 p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="text-[12px] font-semibold text-amber-900 mr-2">
                          Incomplete Profile:
                        </span>
                        <span className="text-[12px] text-amber-800">
                          Some registration details are missing. Please complete the registration form.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const formUrl = `/employee/upload-documents/${empid}?name=${encodeURIComponent(
                          name || ""
                        )}&email=${encodeURIComponent(email || "")}`;
                        window.open(formUrl, "_blank");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Complete Form</span>
                    </button>
                  </div>
                )}

                {/* Profile Avatar & Header Card */}
                <div className="border border-gray-200 mb-4 bg-white p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {employees?.profile_photo ? (
                        <Image
                          src={`/api/hr/view-document/${empid}?type=profile_photo`}
                          alt="Profile"
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-full object-cover border border-gray-300"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-300"
                        style={{
                          display: employees?.profile_photo ? "none" : "flex",
                        }}
                      >
                        <User className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#222]">{name}</h2>
                        <p className="text-[12px] text-[#666]">{email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 rounded">
                          ID: {empid}
                        </span>
                        <span className="px-2.5 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded capitalize">
                          Role: {user?.rbacRole?.name || user?.role || "N/A"}
                        </span>
                        <span className="px-2.5 py-0.5 text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded capitalize">
                          Type: {user?.employee_type || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal & Address 2-Column Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                  {/* Personal Information */}
                  <div className="border border-gray-200">
                    <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                      <span className="text-[12px] font-semibold text-[#333]">
                        Personal & Employment Information
                      </span>
                    </div>

                    <div className="bg-white">
                      {/* Employee ID */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Employee ID
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {empid}
                        </div>
                      </div>

                      {/* Name */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Full Name
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {name}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Email Address
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {email}
                        </div>
                      </div>

                      {/* Contact Number */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Contact Number
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {employees?.contact_no || phoneNumber || "N/A"}
                        </div>
                      </div>

                      {/* DOB */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Date of Birth
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {employees?.dob ? new Date(employees.dob as string).toLocaleDateString() : "N/A"}
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Gender
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          {employees?.gender || "N/A"}
                        </div>
                      </div>

                      {/* Position */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Position
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          <div>{user?.position || "N/A"}</div>
                          {hasPerm("employee.edit") && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <select
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-[11px] bg-white text-[#333] focus:outline-none focus:border-indigo-500"
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
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium rounded transition-colors cursor-pointer"
                              >
                                Update
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Employment Type */}
                      <div className="flex min-h-[42px] border-b border-[#ededed]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          Employment Type
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                          <div className="capitalize">{user?.employee_type || "N/A"}</div>
                          {hasPerm("employee.edit") && (
                            <select
                              value={user?.employee_type || ""}
                              onChange={(e) => handleEmployeeTypeChange(e.target.value)}
                              className="mt-1.5 px-2 py-1 border border-gray-300 rounded text-[11px] bg-white text-[#333] focus:outline-none focus:border-indigo-500"
                            >
                              <option value="" disabled>Change Employment Type</option>
                              <option value="Intern">Intern</option>
                              <option value="Full_time">Full-time</option>
                              <option value="Contractor">Contractor</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* User Role */}
                      <div className="flex min-h-[42px]">
                        <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                          User Role
                        </div>
                        <div className="flex-1 px-3 py-2 text-[12px] text-[#222] relative">
                          <div className="capitalize">{user?.rbacRole?.name || user?.role || "N/A"}</div>
                          {hasPerm("employee.edit") && (
                            <div className="mt-1.5 relative max-w-[220px]">
                              <button
                                type="button"
                                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                className="w-full flex items-center justify-between px-2.5 py-1 border border-gray-300 rounded bg-white text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 focus:outline-none cursor-pointer"
                              >
                                <span className="truncate">
                                  {user?.rbacRole?.name || (user?.role ? user.role.toUpperCase() : "Change User Role")}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
                              </button>

                              {isRoleDropdownOpen && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-md max-h-56 overflow-hidden flex flex-col min-w-[200px]">
                                  <div className="p-1.5 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5">
                                    <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Search role..."
                                      value={roleSearchTerm}
                                      onChange={(e) => setRoleSearchTerm(e.target.value)}
                                      className="w-full text-[11px] bg-transparent focus:outline-none"
                                      autoFocus
                                    />
                                  </div>

                                  <div className="overflow-y-auto max-h-44 divide-y divide-gray-50">
                                    {rolesList.filter((r) =>
                                      r.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
                                      (r.description && r.description.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                                    ).length === 0 ? (
                                      <div className="p-2 text-[11px] text-gray-500 text-center">
                                        No matching roles
                                      </div>
                                    ) : (
                                      rolesList
                                        .filter((r) =>
                                          r.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
                                          (r.description && r.description.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                                        )
                                        .map((r) => (
                                          <button
                                            key={r.id}
                                            type="button"
                                            disabled={isUpdatingRole}
                                            onClick={() => handleSelectRole(r)}
                                            className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between cursor-pointer ${
                                              user?.roleId === r.id || user?.rbacRole?.name === r.name
                                                ? "bg-indigo-50 font-semibold text-indigo-600"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            <div>
                                              <div className="font-medium">{r.name}</div>
                                              {r.description && (
                                                <div className="text-[10px] text-gray-400 truncate max-w-[170px]">
                                                  {r.description}
                                                </div>
                                              )}
                                            </div>
                                            {(user?.roleId === r.id || user?.rbacRole?.name === r.name) && (
                                              <Check className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                            )}
                                          </button>
                                        ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="border border-gray-200">
                    <div
                      onClick={() => setIsOpen(!isOpen)}
                      className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center justify-between px-3 cursor-pointer select-none"
                    >
                      <span className="text-[12px] font-semibold text-[#333]">
                        Residential Address Information
                      </span>
                      {isOpen ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
                    </div>

                    {isOpen && (
                      <div className="bg-white">
                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Address Line 1
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.address_line1 || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Address Line 2
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.address_line2 || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            City
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.city || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            State
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.state || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            PIN Code
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.pincode || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Country
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {addresses?.[0]?.country || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Details */}
                <div className="border border-gray-200 mb-4">
                  <div
                    onClick={() => setIsOpen3(!isOpen3)}
                    className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center justify-between px-3 cursor-pointer select-none"
                  >
                    <span className="text-[12px] font-semibold text-[#333]">
                      Banking & Payment Details
                    </span>
                    {isOpen3 ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
                  </div>

                  {isOpen3 && (
                    <div className="bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="flex min-h-[42px] border-b md:border-r border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Account Holder
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {bankDetails?.[0]?.account_holder_name || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Bank Name
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {bankDetails?.[0]?.bank_name || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b md:border-r border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Branch Name
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {bankDetails?.[0]?.branch_name || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Account Number
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {bankDetails?.[0]?.account_number || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px] border-b md:border-b-0 md:border-r border-[#ededed]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            IFSC Code
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px] text-[#222]">
                            {bankDetails?.[0]?.ifsc_code || "N/A"}
                          </div>
                        </div>

                        <div className="flex min-h-[42px]">
                          <div className="w-[42%] bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-r border-[#ededed]">
                            Checkbook / Passbook
                          </div>
                          <div className="flex-1 px-3 py-2 text-[12px]">
                            <FileDetail
                              label=""
                              file={bankDetails?.[0]?.checkbook_document}
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identity & Employment Documents Table */}
                <div className="border border-gray-200 mb-4">
                  <div
                    onClick={() => setIsOpen1(!isOpen1)}
                    className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center justify-between px-3 cursor-pointer select-none"
                  >
                    <span className="text-[12px] font-semibold text-[#333]">
                      Identity & Employment Documents
                    </span>
                    {isOpen1 ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
                  </div>

                  {isOpen1 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#f3f3f3]">
                            <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555] w-[22%]">
                              Document Type
                            </th>
                            <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555] w-[28%]">
                              Document Number / Details
                            </th>
                            <th className="border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555]">
                              File & Verification / Resubmission
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <tr className="bg-white">
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333] font-medium">
                              Aadhar Card
                            </td>
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                              {employees?.aadhar_number || "N/A"}
                            </td>
                            <td className="border-b border-[#ededed] px-3 py-2 text-[12px]">
                              <FileDetail
                                label=""
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
                            </td>
                          </tr>

                          <tr className="bg-[#fafafa]">
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333] font-medium">
                              PAN Card
                            </td>
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                              {employees?.pan_number || "N/A"}
                            </td>
                            <td className="border-b border-[#ededed] px-3 py-2 text-[12px]">
                              <FileDetail
                                label=""
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
                            </td>
                          </tr>

                          <tr className="bg-white">
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333] font-medium">
                              Resume
                            </td>
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#666]">
                              Curriculum Vitae
                            </td>
                            <td className="border-b border-[#ededed] px-3 py-2 text-[12px]">
                              <FileDetail
                                label=""
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
                            </td>
                          </tr>

                          <tr className="bg-[#fafafa]">
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333] font-medium">
                              Experience Certificate
                            </td>
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#666]">
                              Work History Document
                            </td>
                            <td className="border-b border-[#ededed] px-3 py-2 text-[12px]">
                              <FileDetail
                                label=""
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
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Education & Qualification Table */}
                <div className="border border-gray-200 mb-4">
                  <div
                    onClick={() => setIsOpen2(!isOpen2)}
                    className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center justify-between px-3 cursor-pointer select-none"
                  >
                    <span className="text-[12px] font-semibold text-[#333]">
                      Education & Qualification
                    </span>
                    {isOpen2 ? <ChevronUp size={14} className="text-[#666]" /> : <ChevronDown size={14} className="text-[#666]" />}
                  </div>

                  {isOpen2 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#f3f3f3]">
                            <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555] w-[22%]">
                              Category
                            </th>
                            <th className="border-r border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555] w-[28%]">
                              Qualification Detail
                            </th>
                            <th className="border-b border-[#d5d5d5] px-3 py-2 text-left text-[11px] font-semibold text-[#555]">
                              Certificate Document & Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <tr className="bg-white">
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333] font-medium">
                              Highest Qualification
                            </td>
                            <td className="border-r border-b border-[#ededed] px-3 py-2 text-[12px] text-[#333]">
                              {employees?.highest_qualification || "N/A"}
                            </td>
                            <td className="border-b border-[#ededed] px-3 py-2 text-[12px]">
                              <FileDetail
                                label=""
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
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* System Credentials */}
                {(hasPerm("employee.send_credentials") ||
                  hasPerm("employee.reset_password") ||
                  hasPerm("employee.edit")) && (
                  <div className="border border-gray-200">
                    <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                      <span className="text-[12px] font-semibold text-[#333]">
                        System Credentials & Access Management
                      </span>
                    </div>

                    <div className="bg-white p-3">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="border border-[#ededed]">
                          <div className="bg-[#fafafa] px-3 py-2 text-[11px] font-medium text-[#555] border-b border-[#ededed]">
                            Employee ID (Login Username)
                          </div>
                          <div className="px-3 py-2.5 text-[12px] text-[#222] font-semibold">
                            {empid}
                          </div>
                        </div>

                        <div className="border border-[#ededed] p-3 flex flex-col justify-center">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#555]">
                              Password Management
                            </span>
                            <button
                              onClick={handlePasswordReset}
                              disabled={isResetting}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[11px] font-medium rounded transition-colors cursor-pointer"
                            >
                              <RefreshCw size={12} className={isResetting ? "animate-spin" : ""} />
                              <span>{isResetting ? "Resetting..." : "Reset Password"}</span>
                            </button>
                          </div>

                          {newPassword && (
                            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-emerald-800">
                                  New Password:
                                </span>
                                <span className="font-mono text-[12px] bg-white px-2 py-0.5 rounded border border-emerald-300">
                                  {showPassword ? newPassword : "••••••••"}
                                </span>
                                <button
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
                                >
                                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(newPassword);
                                    toast.success("Password copied to clipboard!");
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[11px] font-medium cursor-pointer"
                                >
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </button>
                                <button
                                  onClick={handleSendCredentials}
                                  disabled={isSending}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  <Mail size={12} />
                                  <span>{isSending ? "Sending..." : "Send Credentials"}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FileDetail({
  label,
  file,
  documentType,
  empid,
  onResubmit,
  onRequestResubmission,
  isResubmitting,
  userRole,
  resubmitStates,
  resubmitReason,
  setResubmitReason,
}: {
  label: string;
  file?: string | null;
  documentType: string;
  empid?: string;
  onResubmit: (documentType: string, file: File) => void;
  onRequestResubmission: (documentType: string, reason: string) => void;
  isResubmitting?: boolean | string;
  userRole?: string;
  resubmitStates?: Record<string, boolean | string>;
  resubmitReason?: Record<string, string>;
  setResubmitReason: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showResubmit, setShowResubmit] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
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

  const isEmployee = userRole?.toLowerCase() === "employee";
  const isAdminHR = userRole ? userRole.toLowerCase() !== "employee" : false;
  const canInteract = empid && documentType && onResubmit;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-[11px] text-[#555] mr-1">{label}</span>}

      {file ? (
        <a
          href={`/api/hr/view-document/${empid}?type=${documentType}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition-colors whitespace-nowrap"
        >
          <FileText size={12} />
          <span>View Document</span>
        </a>
      ) : (
        <span className="text-[#888] text-[11px] italic">Not uploaded</span>
      )}

      {canInteract && isEmployee && (
        !showResubmit ? (
          <button
            onClick={() => setShowResubmit(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload size={12} />
            <span>Resubmit</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              id={`file-${documentType}`}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png"
              className="text-[11px] text-gray-500 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            <button
              onClick={handleResubmitClick}
              disabled={!selectedFile || !!isResubmitting}
              className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              {isResubmitting ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setShowResubmit(false);
                setSelectedFile(null);
              }}
              className="px-2 py-1 text-[11px] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )
      )}

      {canInteract && isAdminHR && (
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <input
            type="text"
            value={resubmitReason?.[documentType] || ""}
            onChange={(e) =>
              setResubmitReason((prev) => ({
                ...prev,
                [documentType]: e.target.value,
              }))
            }
            placeholder="Reason for resubmission"
            className="border border-gray-300 rounded px-2 py-1 text-[11px] text-[#222] flex-1 min-w-[130px] focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleRequestResubmission}
            disabled={!!isResubmitting || resubmitStates?.[documentType] === "sent"}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              resubmitStates?.[documentType] === "sent"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-default"
                : isResubmitting
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            <Upload size={12} />
            <span>
              {resubmitStates?.[documentType] === "sent"
                ? "Request Sent"
                : isResubmitting
                ? "Sending..."
                : "Request Resubmission"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientPageWrapper(props: any) {
  return (
    <Suspense fallback={null}>
      <ViewEmployee {...props} />
    </Suspense>
  );
}
