// ✅ FINAL — Zero-Trust: Session Restore
// src/features/auth/context/AuthProvider/useSessionRestore.ts

import { useState, useCallback, useEffect } from "react";

import {
  getAccessToken,
  clearAccessToken,
  setAccessToken,
} from "../../utils/tokenStorage";

import { hydratePassport } from "../../api/passportApi";
import type { User } from "../../api/types";

/**
 * ♻️ useSessionRestore
 * --------------------------------------------------
 * Purpose:
 *   Lightweight re-sync tool.
 *   Does *not* run automatically — caller-triggered only.
 *
 * Scenarios:
 *   • Tab focus wake
 *   • WS "force_refresh"
 *   • Network reconnect
 *
 * Behavior:
 *   ✅ If FE has access → backend confirms session
 *   ✅ If server returns access+user → synced + updated
 *   ❌ If server rejects → clean token + null user
 */
export const useSessionRestore = (setUser: (user: User | null) => void) => {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * restoreSession()
   * --------------------------------------------------
   * Returns:
   *   User | null
   *
   * Trust Model:
   *   Frontend treats access as *hint*, not truth.
   *   Only backend validation sets the record straight.
   */
  const restoreSession = useCallback(async (): Promise<User | null> => {
    const existing = getAccessToken();

    // If no RAM token, check if Shield cookies still exist via signal cookie.
    // If Shield is present → Passport can re-issue a fresh access token.
    if (!existing) {
      const { getCookie } = await import("../../utils/cookieUtils");
      const shieldPresent = getCookie("auip_logged_in");
      if (!shieldPresent) return null; // Truly logged out — no Shield cookies
      // Shield cookies present but RAM token lost (reload/tab close/offline)
      // → fall through to Passport re-hydration below
    }

    setRestoring(true);
    setError(null);

    try {
      const res = await hydratePassport();

      // ✅ Valid session — backend grants new access + user
      if (res?.access) {
        setAccessToken(res.access);
      }

      if (res?.user) {
        if (typeof setUser === 'function') {
          setUser(res.user);
        }
        return res.user;
      }

      // ❌ no user returned → treat as invalid
      clearAccessToken();
      if (typeof setUser === 'function') {
        setUser(null);
      }
      return null;
    } catch (err: any) {
      console.warn("❌ [useSessionRestore] backend reject:", err);
      clearAccessToken();
      setError("restore_failed");
      if (typeof setUser === 'function') {
        setUser(null);
      }
      return null;
    } finally {
      setRestoring(false);
    }
  }, [setUser]);

  /**
   * 🛡️ Proactive Resilience
   * --------------------------------------------------
   * Trigger re-sync on window focus or network back-online.
   */
  useEffect(() => {
    const handleEvents = () => {
      if (document.visibilityState === "visible") {
        console.debug("🔄 [SessionRestore] Proactive re-sync triggered (Focus/Online)");
        restoreSession();
      }
    };

    window.addEventListener("focus", handleEvents);
    window.addEventListener("online", handleEvents);
    return () => {
      window.removeEventListener("focus", handleEvents);
      window.removeEventListener("online", handleEvents);
    };
  }, [restoreSession]);

  return {
    restoring,
    error,
    restoreSession,
  };
};
