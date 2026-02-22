// ✅ PRODUCTION — Zero-Trust Session Hydration
// src/features/auth/context/AuthProvider/useSessionHydration.ts
//
// Architecture:
//   • Backend is the SOLE source of truth for session validity
//   • Refresh token lives in HttpOnly cookie — JS NEVER sees it
//   • On cold boot, we call /auth/passport/ ONCE
//   • Backend checks the Quad-Shield cookies:
//       200 + access → session valid → hydrate
//       401         → no session / expired → show login
//   • No JS-readable marker cookies, no local hacks

import { useState, useEffect, useCallback, useRef } from "react";
import { setAccessToken, getAccessToken, clearAccessToken } from "../../utils/tokenStorage";
import { hydratePassport } from "../../api/passportApi";
import type { User } from "../../api/types";

export const useSessionHydration = (setUser: (user: User | null) => void) => {
  const [hydrating, setHydrating] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Prevent duplicate parallel calls (React strict-mode safe)
  const hasRun = useRef(false);

  /**
   * hydrateSession()
   * ------------------------------------------------
   * Calls backend passport endpoint ONCE.
   * Returns: true → session restored, false → no session
   */
  const hydrateSession = useCallback(async (): Promise<boolean> => {
    if (hasRun.current) return false;
    hasRun.current = true;

    // 🔒 CROSS-TAB LOCK: If another tab is already hydrating, wait.
    const { isHydrating, startHydrating, stopHydrating, getAccessToken } = await import("../../utils/tokenStorage");

    if (isHydrating()) {
      console.debug("⏳ [hydration] Another tab is hydrating. Waiting...");
      // Poll/wait for up to 2 seconds
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (getAccessToken()) {
          console.debug("🚀 [hydration] Token received from parallel tab. Bypassing fetch.");
          setHydrated(true);
          setHydrating(false);
          return true;
        }
        if (!isHydrating()) break;
      }
    }

    startHydrating();
    setHydrating(true);

    try {
      const res = await hydratePassport();

      // ✅ Backend returned a valid session
      if (res?.success && res.access && res.user) {
        setAccessToken(res.access);
        if (typeof setUser === 'function') {
          setUser(res.user);
        } else {
          console.error("❌ [useSessionHydration] Success but setUser is not a function!");
        }
        return true;
      }

      // ❌ Backend said no (missing token, expired, invalid)
      // ⚠️ RACE CONDITION FIX:
      // If a login happened in parallel (user just logged in while this ran),
      // we might have a valid access token in memory now. Don't nuke it.
      if (getAccessToken()) {
        console.debug("⚠️ [hydration] Failed, but valid token exists in memory. Assuming parallel login success.");
        return true;
      }

      clearAccessToken();
      if (typeof setUser === 'function') {
        setUser(null);
      } else {
        console.warn("⚠️ [useSessionHydration] setUser is not a function during cleanup (failed passport)");
      }
      return false;
    } catch (err) {
      // ❌ Network error or unexpected failure
      console.error("❌ [useSessionHydration] Error during hydration:", err);
      clearAccessToken();
      if (typeof setUser === 'function') {
        setUser(null);
      } else {
        console.warn("⚠️ [useSessionHydration] setUser is not a function during catch block");
      }
      return false;
    } finally {
      // ✅ ALWAYS complete — UI can now render login or dashboard
      stopHydrating();
      setHydrated(true);
      setHydrating(false);
    }
  }, [setUser]);

  // 🔁 Auto-hydrate on mount (once only)
  useEffect(() => {
    if (!hasRun.current) {
      void hydrateSession();
    }
  }, [hydrateSession]);

  return {
    hydrating,
    hydrated,
    hydrateSession,
  };
};
