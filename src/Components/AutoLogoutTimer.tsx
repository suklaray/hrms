"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdleTimer, type EventsType } from "react-idle-timer";
import {
  ACTIVITY_THROTTLE_MS,
  IDLE_TIMEOUT_MS,
  PROMPT_BEFORE_MS,
} from "@/lib/sessionConfig";

const AutoLogoutTimer = () => {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const lastPingRef = useRef(0);
  const pendingPingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRequestedRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);

  const publicPaths = [
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

  const checkIsPublicPath = (currentPath: string) =>
    publicPaths.some(
      (path) =>
        (path === "/" && currentPath === "/") ||
        (path !== "/" && currentPath === path) ||
        (path === "/Recruitment/form" && currentPath.startsWith("/Recruitment/form")),
    );

  const isPublic = checkIsPublicPath(pathname);

  const forceLogout = useCallback(async () => {
    if (logoutRequestedRef.current) return;
    logoutRequestedRef.current = true;

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "session_invalid" }),
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  const handleSessionExpired = useCallback(async () => {
    if (logoutRequestedRef.current) return;
    await forceLogout();
  }, [forceLogout]);

  const pingServer = useCallback(async (): Promise<{ ok: boolean; status: number }> => {
    const now = Date.now();
    const elapsed = now - lastPingRef.current;

    if (elapsed >= ACTIVITY_THROTTLE_MS) {
      lastPingRef.current = now;
      try {
        const res = await fetch("/api/session/activity", {
          method: "POST",
          credentials: "include",
        });
        return { ok: res.ok, status: res.status };
      } catch (error) {
        console.error("[AUTO-LOGOUT] Activity ping failed:", error);
        return { ok: false, status: 0 };
      }
    }

    if (pendingPingRef.current) {
      clearTimeout(pendingPingRef.current);
    }

    const delay = ACTIVITY_THROTTLE_MS - elapsed;
    return new Promise((resolve) => {
      pendingPingRef.current = setTimeout(async () => {
        pendingPingRef.current = null;
        lastPingRef.current = Date.now();

        try {
          const res = await fetch("/api/session/activity", {
            method: "POST",
            credentials: "include",
          });
          resolve({ ok: res.ok, status: res.status });
        } catch (error) {
          console.error("[AUTO-LOGOUT] trailing ping failed:", error);
          resolve({ ok: false, status: 0 });
        }
      }, delay);
    });
  }, []);

  const fetchServerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/session/status", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        return { valid: false, statusCode: 401 };
      }

      if (!res.ok) {
        return { valid: null, statusCode: res.status };
      }

      const data = await res.json();
      return { ...data, valid: !!data.valid };
    } catch (error) {
      console.error("Status fetch failed:", error);
      return { valid: null, statusCode: 0, error: "network" };
    }
  }, []);

  const activityEvents: EventsType[] = [
    "mousemove",
    "mousedown",
    "mouseup",
    "click",
    "pointerdown",
    "pointermove",
    "keydown",
    "keyup",
    "input",
    "change",
    "touchstart",
    "touchmove",
    "wheel",
    "scroll",
    "focus",
    "visibilitychange",
  ];

  const safePromptBeforeIdle = Math.max(1000, Math.min(PROMPT_BEFORE_MS, Math.max(IDLE_TIMEOUT_MS - 1000, 1000)));

  const { reset } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: safePromptBeforeIdle,
    debounce: 200,
    events: activityEvents,
    crossTab: true,
    startOnMount: true,
    disabled: isPublic,
    onAction: async () => {
      reset();
      setShowWarning(false);

      const result: { ok: boolean; status: number } = await pingServer();
      if (result.ok === false && result.status === 401) {
        await handleSessionExpired();
      }
    },
    onPrompt: async () => {
      setShowWarning(true);

      const status = await fetchServerStatus();
      if (status && status.valid === false) {
        await handleSessionExpired();
        return;
      }
    },
    onIdle: async () => {
      setShowWarning(false);
      await forceLogout();
    },
  });

  useEffect(() => {
    return () => {
      if (pendingPingRef.current) {
        clearTimeout(pendingPingRef.current);
        pendingPingRef.current = null;
      }
    };
  }, []);

  if (isPublic) return null;
  if (!showWarning) return null;

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
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
        maxWidth: "320px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
        Your session is about to expire.
      </div>
      <div style={{ fontSize: "14px", lineHeight: 1.4 }}>
        Move your mouse, click, or press a key to continue.
      </div>
    </div>
  );
};

export default AutoLogoutTimer;