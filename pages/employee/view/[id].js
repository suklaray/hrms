
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import axios from "axios";

export default function ViewEmployee() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

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



  return (
    <div className="flex">
      <SideBar />
      <div className="flex-1 min-h-screen bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 py-10 px-4">
        <div className="w-full mx-auto p-10 bg-white shadow-2xl rounded-3xl space-y-6">
          <h1 className="text-3xl pb-6 font-bold text-center text-indigo-700">Employee Details</h1>

          <div className="flex justify-center pb-5">
            {employees?.profile_photo ? (
              <img
                src={employees.profile_photo}
                alt="Profile"
                className="w-40 h-40 rounded-full object-cover shadow-lg border-4 border-indigo-300"
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                No Photo
              </div>
            )}
          </div>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Detail label="Employee ID" value={empid} />
              <Detail label="Name" value={name} />
              <Detail label="Email" value={email} />
              <Detail label="Contact No" value={employees?.contact_no || "N/A"} />
              <Detail label="DOB" value={employees?.dob ? new Date(employees.dob).toLocaleDateString() : "N/A"} />
              <Detail label="Gender" value={employees?.gender || "N/A"} />
              <div>
                <p className="text-gray-600">Employment Type</p>
                <p className="font-semibold mt-1 capitalize">{user?.employee_type || "N/A"}</p>

                {["admin", "superadmin"].includes(role) ? (
                  <select
                    value={user?.employee_type || ""}
                    onChange={(e) => handleEmployeeTypeChange(e.target.value)}
                    className="mt-1 p-1 border border-indigo-300 rounded text-sm"
                  >
                    <option value="" disabled>Change Employement Type</option>
                    <option value="Intern">Intern</option>
                    <option value="Full_time">Full-time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                ) : (
                  <p className="font-semibold mt-1">{user?.employee_type || "N/A"}</p>
                )}
              </div>

              <div>
                <p className="text-gray-600">User Role</p>
                <p className="font-semibold mt-1 capitalize">{user?.role || "N/A"}</p>
                {["admin", "superadmin"].includes(role) ? (
                  <select
                    value={user?.role || ""}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="mt-1 p-1 border border-indigo-300 rounded text-sm"
                  >
                    <option value="" disabled>Change User Role</option>
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                ) : null}
              </div>

            </div>

          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Address</h2>
            {addresses?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Line 1" value={addresses[0]?.address_line1 || "N/A"} />
                <Detail label="Line 2" value={addresses[0]?.address_line2 || "N/A"} />
                <Detail label="City" value={addresses[0]?.city || "N/A"} />
                <Detail label="State" value={addresses[0]?.state || "N/A"} />
                <Detail label="Pincode" value={addresses[0]?.pincode || "N/A"} />
                <Detail label="Country" value={addresses[0]?.country || "N/A"} />
              </div>
            ) : (
              <p className="text-gray-500">No address available</p>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FileDetail label="Aadhar Card" file={employees?.aadhar_card} />
              <Detail label="Aadhar Number" value={employees?.aadhar_number || "N/A"} />
              <FileDetail label="PAN Card" file={employees?.pan_card} />
              <Detail label="PAN Number" value={employees?.pan_number || "N/A"} />
              <FileDetail label="Resume" file={employees?.resume} />
              <FileDetail label="Experience Certificate" file={employees?.experience_certificate} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Qualification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Detail label="Highest Qualification" value={employees?.highest_qualification || "N/A"} />
              <FileDetail label="Education Certificates" file={employees?.education_certificates} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Bank Details</h2>
            {bankDetails?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Account Holder" value={bankDetails[0]?.account_holder_name || "N/A"} />
                <Detail label="Bank Name" value={bankDetails[0]?.bank_name || "N/A"} />
                <Detail label="Branch Name" value={bankDetails[0]?.branch_name || "N/A"} />
                <Detail label="Account Number" value={bankDetails[0]?.account_number || "N/A"} />
                <Detail label="IFSC Code" value={bankDetails[0]?.ifsc_code || "N/A"} />
                <FileDetail label="Checkbook Document" file={bankDetails[0]?.checkbook_document} />
              </div>
            ) : (
              <p className="text-gray-500">No bank details available</p>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">System Credentials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Detail label="Employee ID" value={empid} />
              <Detail label="Password" value={password || "N/A"} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-gray-600">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function FileDetail({ label, file }) {
  return (
    <div>
      <p className="text-gray-600">{label}</p>
      {file ? (
        <a href={file} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">
          View
        </a>
      ) : (
        <p className="font-semibold">N/A</p>
      )}
    </div>
  );
}
