import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "@/Components/empSidebar";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get("/api/auth/settings/user-profile", { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => console.error("Failed to fetch user profile"));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (error) {
      alert("Upload failed.");
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post("/api/auth/change-password", { newPassword }, { withCredentials: true });
      alert(res.data.message);
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update password");
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex-1 bg-gradient-to-l from-purple-100 to-sky-100 p-10">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-8 relative">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">Profile Settings</h2>

          {user ? (
            <>
              <div className="flex flex-col items-center mb-6">
                {preview || user.profilePic ? (
                  <img
                    src={preview || user.profilePic}
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

              <div className="space-y-4 text-sm text-gray-800">
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
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[90%] max-w-md shadow-xl relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Change Password</h2>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded"
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordUpdate}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
