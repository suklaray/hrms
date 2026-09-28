//keep sidebar in client component as it uses react hooks and nextjs router
declare global {
  interface Window {
    __HRMS_APP_SHELL__?: boolean;
    __HRMS_SIDEBAR_SHELL_ACTIVE__?: boolean;
  }
}

export function setAppShellEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.__HRMS_APP_SHELL__ = enabled;
  }
}

export function isAppShellEnabled() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__HRMS_APP_SHELL__);
}

export function activateSharedSidebarShell() {
  if (typeof window !== "undefined") {
    window.__HRMS_SIDEBAR_SHELL_ACTIVE__ = true;
  }
}

export function isSidebarShellActive() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__HRMS_SIDEBAR_SHELL_ACTIVE__);
}
