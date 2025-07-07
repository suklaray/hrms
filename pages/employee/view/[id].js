import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SideBar from "@/Components/SideBar";
import axios from "axios";

export default function ViewEmployee() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      axios.get(`/api/auth/employee/view/${id}`)
        .then((res) => {
          setData(res.data.user);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching employee details:", err);
          setLoading(false);
        });
    }
  }, [id]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

  const { name, email, empid, employees, candidates, bank_details, addresses, password } = data;

return (
    <div className="flex">
      <SideBar />
      <div className="flex-1 min-h-screen bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 py-10 px-4">
        <div className="w-full mx-auto p-10 bg-white shadow-2xl rounded-3xl space-y-6">
        <h1 className="text-3xl pb-6  font-bold text-center text-indigo-700">Employee Details</h1>

          {/* Profile Photo */}
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

          {/* Personal Details */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Detail label="Employee ID" value={empid} />
              <Detail label="Name" value={name} />
              <Detail label="Email" value={email} />
              <Detail label="Contact No" value={employees?.contact_no || "N/A"} />
              <Detail label="DOB" value={employees?.dob ? new Date(employees.dob).toLocaleDateString() : "N/A"} />
              <Detail label="Gender" value={employees?.gender || "N/A"} />
            </div>
          </section>

          {/* Address */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Address</h2>
            {addresses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Line 1" value={addresses.address_line1} />
                <Detail label="Line 2" value={addresses.address_line2} />
                <Detail label="City" value={addresses.city} />
                <Detail label="State" value={addresses.state} />
                <Detail label="Pincode" value={addresses.pincode} />
                <Detail label="Country" value={addresses.country} />
              </div>
            ) : (
              <p className="text-gray-500">No address available</p>
            )}
          </section>

          {/* Documents */}
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

          {/* Qualification */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Qualification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Detail label="Highest Qualification" value={employees?.highest_qualification || "N/A"} />
              <FileDetail label="Education Certificates" file={employees?.education_certificates} />
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">Bank Details</h2>
            {bank_details ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Detail label="Account Holder" value={bank_details.account_holder_name} />
                <Detail label="Bank Name" value={bank_details.bank_name} />
                <Detail label="Branch Name" value={bank_details.branch_name} />
                <Detail label="Account Number" value={bank_details.account_number} />
                <Detail label="IFSC Code" value={bank_details.ifsc_code} />
                <FileDetail label="Checkbook Document" file={bank_details.checkbook_document} />
              </div>
            ) : (
              <p className="text-gray-500">No bank details available</p>
            )}
          </section>

          {/* Credentials */}
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
  // Helper component for key-value display
function Detail({ label, value }) {
  return (
    <div>
      <p className="text-gray-600">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

// Helper component for file links
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
}
