// Backend session expiry is the single source of truth for auto-logout.
// Frontend idle timer is a UX hint; actual termination happens when the server session expires.
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;       // 5 min — server session window
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;          // 5 min — frontend idle detection
export const PROMPT_BEFORE_MS = 60 * 1000;             // 1 min — show warning before idle
export const ACTIVITY_SYNC_INTERVAL_MS = 60 * 1000;    // 1 min — throttle activity pings
export const JWT_EXPIRY_MS = 12 * 60 * 60 * 1000;      // 12 hr — JWT lifetime
