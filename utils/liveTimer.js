import { useEffect, useState } from "react";

export default function LiveTimer({ currentCheckInTime, isLoggedIn, totalHours, completedSeconds }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!isLoggedIn || !currentCheckInTime) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentCheckInTime]);

  if (!isLoggedIn || !currentCheckInTime) {
    return <span className="text-sm font-mono text-gray-900">{totalHours || '--'}</span>;
  }

  const checkIn = new Date(currentCheckInTime);
  
  // Only validate if checkIn is invalid
  if (isNaN(checkIn.getTime())) {
    return <span className="text-sm font-mono text-gray-900">{totalHours || '--'}</span>;
  }

  // Calculate time from current open session start to now
  const currentSessionSeconds = (currentTime - checkIn) / 1000;
  const completedTime = Number(completedSeconds) || 0;
  
  // Total = all completed sessions + current session
  const totalSecondsToday = completedTime + currentSessionSeconds;
  
  const hours = Math.floor(totalSecondsToday / 3600);
  const minutes = Math.floor((totalSecondsToday % 3600) / 60);
  const seconds = Math.floor(totalSecondsToday % 60);

  return (
    <span className="text-sm font-mono text-green-600 font-semibold">
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}