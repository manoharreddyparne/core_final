// ✅ FINAL — Zero-Trust Session Bootstrap
// src/features/auth/context/AuthProvider/useSessionBootstrap.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { setAccessToken, clearAccessToken } from "../../utils/tokenStorage";
import { bootstrapSession } from "../../api/bootstrapApi";
import type { User } from "../../api/types";

/**
 * 🔐 useSessionBootstrap
 * --------------------------------------------------
 * Purpose:
 *   Restore + validate session using HttpOnly refresh.
 *
 * Guarantee:
 *   ✅ Backend drives truth — FE trusts NOTHING locally
 *   ✅ If backend OK → we hydrate access + user
 *   ✅ If backend FAIL → we wipe + return null
 *
 * SSR-safe & idempotent:
 *   -> skip duplicate bootstrap calls
 */
export const useSessionBootstrap = () => {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // ✅ avoid duplicate parallel executions
  const isRunning = useRef(false);

  /**
   * refreshSession()
   * ------------------------------------------------
   * Returns:
   *   true  → restored
   *   false → invalid / expired
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRunning.current) return false;

    // 🕵️ Check for presence marker before hitting backend
    // REMOVED: We don't trust the JS cookie. We trust the HttpOnly cookie.
    // const hasMarker = document.cookie.includes("refresh_token_present=1");
    // if (!hasMarker) {
    //   setBootstrapping(false);
    //   setBootstrapped(true);
    //   return false;
    // }

    isRunning.current = true;
    setBootstrapping(true);
    // ... rest of the code

    try {
      const res = await bootstrapSession(); // backend trust source

      /**
       * ✅ SUCCESS SHAPE:
       *   {
       *     access: string,
       *     refresh_token_present: true,
       *     user: { ... }
       *   }
       */
      if (res && typeof res === "object" && res.access) {
        // secure memory-access hydration
        setAccessToken(res.access);

        if (res.user) {
          setUser(res.user);
        } else {
          // server returned access but no user → reject session
          clearAccessToken();
          setUser(null);
          setBootstrapped(false);
          return false;
        }

        setBootstrapped(true);
        return true;
      }

      // ❌ Backend implicitly says NO
      clearAccessToken();
      setUser(null);
      setBootstrapped(false);
      return false;
    } catch (err: any) {
      const status = err?.response?.status;

      // 401/403 → refresh invalid, wipe
      if (status === 401 || status === 403) {
        clearAccessToken();
        setUser(null);
      }

      return false;
    } finally {
      // ✅ ATTEMPT FINISHED
      setBootstrapped(true);
      setBootstrapping(false);
      isRunning.current = false;
    }
  }, []);

  // 🔁 Cold start auto-bootstrap
  useEffect(() => {
    // Only skip if already running or fully bootstrapped
    if (isRunning.current || bootstrapped) return;

    void refreshSession();
  }, [refreshSession, bootstrapped]);

  return {
    user,
    bootstrapping,
    bootstrapped,
    refreshSession,
    setUser,        // ✅ expose so VM/User context can update identity
  };
};
