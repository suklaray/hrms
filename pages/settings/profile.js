import { useState, useEffect, useRef } from "react";
import axios from "axios";
import SideBar from "@/Components/SideBar";
import { useRouter } from "next/router";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/auth/settings/user-profile").then((res) => setUser(res.data));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewURL = URL.createObjectURL(file);
    setPreview(previewURL);

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axios.post("/api/auth/settings/upload-profile-pic", formData);
      if (res.status === 200) {
        setTimeout(() => {
          window.location.reload(); // reload to get latest DB data
        }, 300);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <SideBar />
      <div className="flex-1 bg-gradient-to-b from-white to-gray-100 p-10">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6">Profile Settings</h2>

          {user ? (
            <>
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                {user.profilePic ? (
  <img
    src={user.profilePic}
    alt="Profile"
    className="w-[120px] h-[120px] rounded-full object-cover border-4 border-indigo-500"
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
                  className="mt-3 text-indigo-600 hover:underline text-sm font-medium"
                >
                  Change Profile Picture
                </button>
              </div>

              {/* Details */}
              <div className="space-y-4 text-sm text-gray-800">
                <p><span className="font-semibold">Name:</span> {user.name}</p>
                <p><span className="font-semibold">Email:</span> {user.email}</p>
                <p><span className="font-semibold">Password:</span> *****</p>
                <button
                  onClick={() => router.push("/reset-password")}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Change Password
                </button>
              </div>
            </>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
