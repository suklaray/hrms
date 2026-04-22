import { useEffect } from 'react';
import { useRouter } from 'next/router';

const AutoLogoutHandler = () => {
  const router = useRouter();

  useEffect(() => {
    const publicPaths = [
      '/',
      '/login',
      '/employee/login',
      '/AboutUs',
      '/Contact',
      '/Recruitment/form',
      '/Recruitment/docs_submitted',
      '/form-already-submitted',
      '/unauthorized-form-access',
      '/form-link-expired',
      '/form-locked-device'
    ];

    const isPublicPath = publicPaths.some(path => {
      return (
        (path === '/' && router.pathname === '/') ||
        (path !== '/' && router.pathname === path) ||
        (path === '/Recruitment/form' &&
          router.pathname.startsWith('/Recruitment/form'))
      );
    });

    if (!isPublicPath) {
      const TAB_ID = `tab_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const BROADCAST_CHANNEL = 'hrms_tabs';

      sessionStorage.setItem('tabActive', 'true');
      sessionStorage.setItem('tabId', TAB_ID);

      const updateActiveTabsList = () => {
        const activeTabs = JSON.parse(
          localStorage.getItem('activeTabs') || '[]'
        );
        if (!activeTabs.includes(TAB_ID)) {
          activeTabs.push(TAB_ID);
          localStorage.setItem('activeTabs', JSON.stringify(activeTabs));
        }
      };

      const removeFromActiveTabsList = () => {
        const activeTabs = JSON.parse(
          localStorage.getItem('activeTabs') || '[]'
        );
        const updatedTabs = activeTabs.filter(id => id !== TAB_ID);
        localStorage.setItem('activeTabs', JSON.stringify(updatedTabs));
        return updatedTabs.length === 0;
      };

      const broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);

      const performLogout = async (reason) => {
        const isEmployeePath = router.pathname.startsWith('/employee');
        const logoutEndpoint = isEmployeePath
          ? '/api/auth/employee/logout'
          : '/api/auth/logout';

        try {
          await fetch(logoutEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, tabId: TAB_ID }),
            credentials: 'include'
          });
        } catch (error) {
          console.error('Logout failed:', error);
        }

        const loginPath = isEmployeePath
          ? '/employee/login'
          : '/login';

        router.replace(loginPath);
      };

      // ✅ THE IMPORTANT PART
      const handlePageHide = (event) => {
        // 👉 If persisted = true → tab is cached (NOT closed)
        if (event.persisted) return;

        // 👉 If document is still visible → NOT closing
        if (document.visibilityState === 'visible') return;

        sessionStorage.setItem('tabActive', 'false');
        removeFromActiveTabsList();

        const isEmployeePath = router.pathname.startsWith('/employee');
        const logoutEndpoint = isEmployeePath
          ? '/api/auth/employee/logout'
          : '/api/auth/logout';

        const beaconData = JSON.stringify({
          reason: 'tab_closed',
          tabId: TAB_ID
        });

        // 🔥 MOST RELIABLE for unload
        navigator.sendBeacon(logoutEndpoint, beaconData);

        broadcastChannel.postMessage({
          type: 'LOGOUT',
          reason: 'tab_closed'
        });
      };

      broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
          performLogout('broadcast_logout');
        }
      };

      updateActiveTabsList();

      // ✅ ONLY this event
      window.addEventListener('pagehide', handlePageHide);

      return () => {
        sessionStorage.setItem('tabActive', 'false');
        removeFromActiveTabsList();

        window.removeEventListener('pagehide', handlePageHide);
        broadcastChannel.close();
      };
    }
  }, [router.pathname]);

  return null;
};

export default AutoLogoutHandler;