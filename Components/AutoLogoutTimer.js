import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

const AutoLogoutTimer = () => {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [showActivityReminder, setShowActivityReminder] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const reminderTimerRef = useRef(null);

  const publicPaths = [
    '/', '/login', '/employee/login', '/AboutUs', '/Contact',
    '/Recruitment/form', '/Recruitment/docs_submitted',
    '/form-already-submitted', '/unauthorized-form-access',
    '/form-link-expired', '/form-locked-device'
  ];

  const checkIsPublicPath = (pathname) => {
    return publicPaths.some(path => 
      (path === '/' && pathname === '/') ||
      (path !== '/' && pathname === path) ||
      (path === '/Recruitment/form' && pathname.startsWith('/Recruitment/form'))
    );
  };

  const getLoginPath = () => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    return currentPath.startsWith('/employee') ? '/employee/login' : '/login';
  };

  const handleLogout = async () => {
    clearAllTimers();
    setShowWarning(false);

    const currentPath = window.location.pathname;
    const isEmployeePath = currentPath.startsWith('/employee');
    const logoutEndpoint = isEmployeePath ? '/api/auth/employee/logout' : '/api/auth/logout';

    try {
      await fetch(logoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'inactivity_timeout' }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    router.replace(getLoginPath());
  };

  const displayActivityReminder = () => {
    setShowActivityReminder(true);
    
    // Auto-hide reminder after 5 seconds
    setTimeout(() => {
      setShowActivityReminder(false);
    }, 5000);
  };

  const showWarningModal = () => {
    setShowWarning(true);
    setCountdown(60);

    // Start 60-second countdown
    let remainingSeconds = 60;
    
    countdownIntervalRef.current = setInterval(() => {
      remainingSeconds -= 1;
      setCountdown(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(countdownIntervalRef.current);
        handleLogout();
      }
    }, 1000);
  };

  const keepWorking = async () => {
    clearAllTimers();
    setShowWarning(false);

    try {
      const response = await fetch('/api/session/activity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        handleLogout();
        return;
      }

      // Restart timers after successful refresh
      startTimers();
    } catch (error) {
      console.error('Session refresh failed:', error);
      handleLogout();
    }
  };

  const startTimers = () => {
    clearAllTimers();

    // Show activity reminder after 2 minutes (120 seconds)
    reminderTimerRef.current = setTimeout(() => {
      displayActivityReminder();
    }, 2 * 60 * 1000); // 2 minutes

    // Show warning after 4 minutes (240 seconds)
    warningTimerRef.current = setTimeout(() => {
      showWarningModal();
    }, 4 * 60 * 1000); // 4 minutes

    // Auto logout after 5 minutes (300 seconds)  
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, 5 * 60 * 1000); // 5 minutes
  };

  const clearAllTimers = () => {
    if (reminderTimerRef.current) {
      clearTimeout(reminderTimerRef.current);
      reminderTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const resetTimers = () => {
    startTimers();
  };

  // Reset timers on user activity
  useEffect(() => {
    const handleUserActivity = () => {
      // Hide activity reminder if showing
      if (showActivityReminder) {
        setShowActivityReminder(false);
      }
      
      // Only reset timers if warning is not showing
      if (!showWarning) {
        resetTimers();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [showWarning, showActivityReminder]);

  useEffect(() => {
    const isPublic = checkIsPublicPath(router.pathname);

    if (isPublic) {
      clearAllTimers();
      setShowWarning(false);
      setShowActivityReminder(false);
      return;
    }

    // Start timers for protected pages
    startTimers();

    return () => {
      clearAllTimers();
    };
  }, [router.pathname]);

  // Render activity reminder (appears for 5 seconds)
  const renderActivityReminder = () => {
    if (!showActivityReminder) return null;

    return (
      <div style={reminderStyles.container}>
        <div style={reminderStyles.content}>
          <span style={reminderStyles.icon}>⏰</span>
          <span style={reminderStyles.text}>
            Move your mouse or you&apos;ll be logged out due to inactivity!
          </span>
        </div>
      </div>
    );
  };

  // Render warning modal (countdown)
  const renderWarningModal = () => {
    if (!showWarning) return null;

    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.container}>
          <h3 style={modalStyles.title}>Session Expiring Soon</h3>
          <p style={modalStyles.text}>
            Your session will expire due to inactivity in:
          </p>
          <div style={modalStyles.countdown}>
            {countdown} second{countdown !== 1 ? 's' : ''}
          </div>
          <button onClick={keepWorking} style={modalStyles.button}>
            Keep Working
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderActivityReminder()}
      {renderWarningModal()}
    </>
  );
};

const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', display: 'flex', alignItems: 'center', zIndex: 999999, fontFamily: 'sans-serif', justifyContent: 'center' },
  container: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  title: { margin: '0 0 12px 0', color: '#d32f2f', fontSize: '20px', fontWeight: '600' },
  text: { color: '#4a4a4a', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' },
  countdown: { fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '24px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' },
  button: { backgroundColor: '#0070f3', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer' }
};

const reminderStyles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 999998,
    fontFamily: 'sans-serif',
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out'
  },
  content: {
    backgroundColor: '#ff9800',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    maxWidth: '350px',
    border: '2px solid #f57c00'
  },
  icon: {
    fontSize: '18px',
    marginRight: '10px'
  },
  text: {
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4'
  }
};

export default AutoLogoutTimer;