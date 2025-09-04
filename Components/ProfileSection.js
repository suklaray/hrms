import Image from "next/image";
import { User, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProfileSection({ user }) {
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const fetchWorkStatus = async () => {
      try {
        const res = await fetch('/api/employee/work-status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setIsWorking(data.isWorking);
          if (data.isWorking && data.workStartTime) {
            setWorkStartTime(new Date(data.workStartTime));
          }
        }
      } catch (err) {
        console.error('Error fetching work status:', err);
      } finally {
        setStatusLoading(false);
      }
    };
    fetchWorkStatus();
  }, []);

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
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error(`API Error: ${res.status} - ${data.error || 'Unknown error'}`);
        alert(data.error || `Failed to ${endpoint}. Please try again.`);
        return;
      }
      
      const newStatus = !isWorking;
      setIsWorking(newStatus);
      if (newStatus) {
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
      alert("Network error. Please check your connection and try again.");
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
          {statusLoading ? (
            <div className="flex items-center justify-center w-40 sm:w-44 h-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
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
                <div className={`w-40 sm:w-44 h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full peer-checked:from-green-400 peer-checked:to-green-600 transition-all duration-500 shadow-inner relative overflow-hidden ${isLoading ? 'opacity-50' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-xs sm:text-sm font-medium">
                    <span className={`transition-all duration-300 whitespace-nowrap ${isWorking ? 'text-white' : 'text-gray-700'}`}>
                      Check In
                    </span>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isWorking ? 'text-white' : 'text-gray-700'}`}>
                      Check Out
                    </span>
                  </div>
                </div>
                <div className="absolute left-1 top-1 w-16 sm:w-20 h-10 bg-white rounded-full shadow-lg transform peer-checked:translate-x-20 sm:peer-checked:translate-x-20 transition-all duration-500 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {isWorking ? 'Check Out' : 'Check In'}
                  </span>
                </div>
              </label>
            </>
          )}
          {!statusLoading && isWorking && (
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