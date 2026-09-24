"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdleTimer } from "react-idle-timer";
import { ACTIVITY_SYNC_INTERVAL_MS, IDLE_TIMEOUT_MS, PROMPT_BEFORE_MS } from "@/lib/sessionConfig";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/AboutUs",
  "/Contact",
  "/Recruitment/form",
  "/Recruitment/docs_submitted",
  "/form-already-submitted",
  "/unauthorized-form-access",
  "/form-link-expired",
  "/form-locked-device",
];

const AutoLogoutTimer = () => {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const logoutRequestedRef = useRef(false);
  const lastSyncRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState<number | null>(null);

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.some(
      (p) =>
        p !== "/" &&
        (pathname === p ||
          (p === "/Recruitment/form" && pathname.startsWith("/Recruitment/form")))
    );

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setWarningSecondsLeft(null);
  }, []);

  // Single source of truth check — asks server if session is still alive
  const checkServerSession = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch("/api/session/status", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return -1;
      const data = await res.json();
      if (!data.valid) return -1;
      return typeof data.remainingMs === "number" ? data.remainingMs : -1;
    } catch {
      return -1;
    }
  }, []);

  const doLogout = useCallback(async () => {
    if (logoutRequestedRef.current) return;
    logoutRequestedRef.current = true;
    stopCountdown();
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.replace("/login");
  }, [router, stopCountdown]);

  // Fallback ping — only fires when user is active but no backend requests are happening
  // (e.g. writing a long report). Throttled to once per ACTIVITY_SYNC_INTERVAL_MS.
  const pingActivity = useCallback(async () => {
    if (syncInFlightRef.current) return;
    const now = Date.now();
    if (now - lastSyncRef.current < ACTIVITY_SYNC_INTERVAL_MS) return;

    syncInFlightRef.current = true;
    lastSyncRef.current = now;

    try {
      const res = await fetch("/api/session/activity", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      // On 401, verify with status before acting — could be a transient race
      if (res.status === 401) {
        const remaining = await checkServerSession();
        if (remaining === -1) await doLogout();
      }
    } catch {
      // Network error — don't logout, just skip this ping
    } finally {
      syncInFlightRef.current = false;
    }
  }, [checkServerSession, doLogout]);

  // Show warning with countdown driven by actual server remainingMs
  const startWarningCountdown = useCallback(async () => {
    stopCountdown();
    const remainingMs = await checkServerSession();

    // Server already expired — logout immediately
    if (remainingMs === -1) {
      await doLogout();
      return;
    }

    const seconds = Math.max(1, Math.floor(remainingMs / 1000));
    setWarningSecondsLeft(seconds);

    countdownRef.current = setInterval(() => {
      setWarningSecondsLeft((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, [checkServerSession, doLogout, stopCountdown]);

  // Countdown hit 0 — verify server before logging out
  useEffect(() => {
    if (warningSecondsLeft !== 0) return;
    checkServerSession().then((remaining) => {
      if (remaining === -1) doLogout();
      else stopCountdown(); // Another tab kept session alive
    });
  }, [warningSecondsLeft, checkServerSession, doLogout, stopCountdown]);

  const { reset } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: Math.max(1000, Math.min(PROMPT_BEFORE_MS, IDLE_TIMEOUT_MS - 1000)),
    debounce: 500,
    // Real intentional interactions only — not mousemove/scroll which fire constantly
    events: ["mousedown", "click", "keydown", "keyup", "input", "change", "touchstart"],
    crossTab: true,
    startOnMount: true,
    disabled: isPublic,

    onAction: async () => {
      // User is active — ping backend as fallback (throttled)
      await pingActivity();
      // If warning was showing, dismiss it and reset idle timer
      if (warningSecondsLeft !== null) {
        stopCountdown();
        reset();
      }
    },

    onPrompt: () => {
      // User has been idle for (IDLE_TIMEOUT_MS - PROMPT_BEFORE_MS) — show warning
      startWarningCountdown();
    },

    onIdle: async () => {
      // Frontend says fully idle — but only logout if server confirms session expired
      const remaining = await checkServerSession();
      if (remaining === -1) {
        await doLogout();
      } else {
        // Server still alive (e.g. another tab was active) — reset and continue
        stopCountdown();
        reset();
      }
    },
  });

  if (isPublic || warningSecondsLeft === null) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 9999,
        backgroundColor: "#fff7ed",
        border: "1px solid #fdba74",
        color: "#9a5b00",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxWidth: "320px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
        Session expiring in {warningSecondsLeft}s
      </div>
      <div style={{ fontSize: "14px", lineHeight: 1.4 }}>
        Click or press a key to stay logged in.
      </div>
    </div>
  );
};

export default AutoLogoutTimer;
