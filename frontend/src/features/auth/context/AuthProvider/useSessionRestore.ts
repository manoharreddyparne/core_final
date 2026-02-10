// ✅ FINAL — Zero-Trust: Session Restore
// src/features/auth/context/AuthProvider/useSessionRestore.ts

import { useState, useCallback } from "react";

import {
  getAccessToken,
  clearAccessToken,
  setAccessToken,
} from "../../utils/tokenStorage";

import { bootstrapSession } from "../../api/bootstrapApi";
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
export const useSessionRestore = () => {
  const [restoring, setRestoring] = useState(false);
  const [restoredUser, setRestoredUser] = useState<User | null>(null);
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

    // ✅ no memory token → nothing to do
    if (!existing) {
      return null;
    }

    setRestoring(true);
    setError(null);

    try {
      const res = await bootstrapSession();

      // ✅ Valid session — backend grants new access + user
      if (res?.access) {
        setAccessToken(res.access);
      }

      if (res?.user) {
        setRestoredUser(res.user);
        return res.user;
      }

      // ❌ no user returned → treat as invalid
      clearAccessToken();
      setRestoredUser(null);
      return null;
    } catch (err: any) {
      console.warn("❌ [useSessionRestore] backend reject:", err);
      clearAccessToken();
      setError("restore_failed");
      setRestoredUser(null);
      return null;
    } finally {
      setRestoring(false);
    }
  }, []);

  return {
    restoring,
    restoredUser,
    error,
    restoreSession,
  };
};
