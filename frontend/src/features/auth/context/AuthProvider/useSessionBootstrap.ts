// ✅ PRODUCTION — Zero-Trust Session Bootstrap
// src/features/auth/context/AuthProvider/useSessionBootstrap.ts
//
// Architecture:
//   • Backend is the SOLE source of truth for session validity
//   • Refresh token lives in HttpOnly cookie — JS NEVER sees it
//   • On cold boot, we call /session/bootstrap/ ONCE
//   • Backend checks the HttpOnly cookie:
//       200 + access → session valid → hydrate
//       401         → no session / expired → show login
//   • No JS-readable marker cookies, no local hacks

import { useState, useEffect, useCallback, useRef } from "react";
import { setAccessToken, clearAccessToken } from "../../utils/tokenStorage";
import { bootstrapSession } from "../../api/bootstrapApi";
import type { User } from "../../api/types";

export const useSessionBootstrap = () => {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Prevent duplicate parallel calls (React strict-mode safe)
  const hasRun = useRef(false);

  /**
   * refreshSession()
   * ------------------------------------------------
   * Calls backend bootstrap endpoint ONCE.
   * Returns: true → session restored, false → no session
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (hasRun.current) return false;
    hasRun.current = true;
    setBootstrapping(true);

    try {
      const res = await bootstrapSession();

      // ✅ Backend returned a valid session
      if (res?.success && res.access && res.user) {
        setAccessToken(res.access);
        setUser(res.user);
        return true;
      }

      // ❌ Backend said no (missing token, expired, invalid)
      clearAccessToken();
      setUser(null);
      return false;
    } catch {
      // ❌ Network error or unexpected failure
      clearAccessToken();
      setUser(null);
      return false;
    } finally {
      // ✅ ALWAYS complete — UI can now render login or dashboard
      setBootstrapped(true);
      setBootstrapping(false);
    }
  }, []);

  // 🔁 Auto-bootstrap on mount (once only)
  useEffect(() => {
    if (!hasRun.current) {
      void refreshSession();
    }
  }, [refreshSession]);

  return {
    user,
    bootstrapping,
    bootstrapped,
    refreshSession,
    setUser,
  };
};
