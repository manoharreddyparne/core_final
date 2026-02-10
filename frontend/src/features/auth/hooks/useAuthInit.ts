// ✅ src/features/auth/hooks/useAuthInit.ts
import { useEffect, useState, useCallback } from "react";

import { clearRefreshTokenCookies } from "../api/base";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../utils/tokenStorage";

import type { User } from "../api/types";

/**
 * ⚙️ useAuthInit
 * ----------------------------------------------------
 * Initializes baseline auth on app start.
 *
 * ✅ Restores token from memory/session
 * ✅ Does NOT call backend — bootstrap handles that
 * ✅ Zero-trust posture → clears broken tokens
 */
export const useAuthInit = () => {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // We only track that *a token existed*, not that user is valid
  const [sessionRestored, setSessionRestored] = useState(false);

  const restoreSession = useCallback(async () => {
    setLoading(true);

    try {
      const token = getAccessToken();

      if (!token) {
        console.log("⚠️ [useAuthInit] No token found → cold boot");
        setSessionRestored(false);
        setUser(null);
        return;
      }

      // Ensure token is mirrored into memory
      console.log("✅ [useAuthInit] Token found → baseline restore");
      setAccessToken(token);
      setSessionRestored(true);
    } catch (err) {
      console.warn("❌ [useAuthInit] Token restore error:", err);
      clearAccessToken();
      clearRefreshTokenCookies();
      setUser(null);
      setSessionRestored(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return {
    user,
    setUser,
    loading,
    initialized,
    sessionRestored,
    restoreSession,
  };
};
