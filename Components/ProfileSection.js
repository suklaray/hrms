import Image from "next/image";
import { User, Clock } from "lucide-react";
import { useState } from "react";

export default function ProfileSection({ user }) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleToggle = () => {
    setIsCheckedIn(!isCheckedIn);
    // Add API call for check-in/out here
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {user?.profile_photo ? (
              <Image
                src={user.profile_photo}
                alt={user.name || "Profile"}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.name || "N/A"}</h3>
            <p className="text-sm text-gray-600 capitalize">{user?.role || "Employee"}</p>
            {user?.position && (
              <p className="text-sm text-gray-500">{user.position}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {isCheckedIn ? "Checked In" : "Checked Out"}
            </span>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isCheckedIn ? "bg-green-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isCheckedIn ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}