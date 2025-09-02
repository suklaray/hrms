import Image from "next/image";
import { User, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProfileSection({ user }) {
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isLoading, setIsLoading] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now - workStartTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [isWorking, workStartTime]);

  const handleToggleWork = async () => {
    if (!user?.empid || isLoading) return;
    
    setIsLoading(true);
    const endpoint = isWorking ? "checkout" : "checkin";
    
    try {
      const res = await fetch(`/api/employee/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ empid: user.empid }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      setIsWorking(!isWorking);
      if (!isWorking) {
        setWorkStartTime(new Date());
      } else {
        setWorkStartTime(null);
        setElapsedTime('00:00:00');
      }
      
      // Success feedback
      if (data.message) {
        console.log(data.message + (data.hours ? ` (Worked: ${data.hours} hrs)` : ""));
      }
      
    } catch (err) {
      console.error("Work toggle error:", err);
      // Revert state on error
      setIsWorking(isWorking);
      alert("Failed to update attendance. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
                alt={user?.name || "Profile"}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
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
            <Clock className={`w-4 h-4 ${isWorking ? 'text-green-600' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${isWorking ? 'text-green-600' : 'text-gray-600'}`}>
              {isWorking ? "Currently Working" : "Not Working"}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isWorking}
              onChange={handleToggleWork}
              disabled={isLoading || !user?.empid}
            />
            <div className={`w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors duration-300 ${isLoading ? 'opacity-50' : ''}`}></div>
            <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-md transform peer-checked:translate-x-5 transition-transform duration-300"></div>
          </label>
          {isWorking && (
            <div className="flex items-center mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-mono font-bold text-green-600">{elapsedTime}</span>
            </div>
          )}
          {isLoading && (
            <div className="text-xs text-gray-500">Updating...</div>
          )}
        </div>
      </div>
    </div>
  );
}