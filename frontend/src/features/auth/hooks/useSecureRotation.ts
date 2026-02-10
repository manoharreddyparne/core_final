// ✅ FINAL — Zero-Trust Secure Rotation Hook
// src/features/auth/hooks/useSecureRotation.ts

import { useState, useCallback } from "react";

import { rotateTokensSecure } from "../api/secureDeviceApi";
import { bootstrapSession } from "../api/bootstrapApi";

import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../utils/tokenStorage";

import type { SecureDeviceResponse } from "../api/types";

/**
 * 🔐 useSecureRotation
 * ---------------------------------------------------
 * Purpose:
 *   Manually trigger backend-driven access/refresh rotation.
 *
 * Backend responsibilities:
 *   ✅ Issues new access token
 *   ✅ Rotates HttpOnly refresh cookie
 *   ✅ Enforces anti-replay & session hygiene
 *
 * Hook responsibilities:
 *   ✅ Stores fresh access → volatile memory only
 *   ✅ Initiates bootstrap to refresh current user / session
 *   ✅ Fails closed → purge local access + notify caller
 */
export const useSecureRotation = () => {
  const [loading, setLoading] = useState(false);
  const [lastSecured, setLastSecured] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * secureNow
   * ------------------------------------------------
   * Invokes backend rotation
   * Returns:
   *   - rotated tokens via SecureDeviceResponse
   *   - null on fatal failure
   */
  const secureNow = useCallback(async (): Promise<SecureDeviceResponse | null> => {
    const existing = getAccessToken();
    if (!existing) {
      setError("No active session");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // (1) Request token rotation
      const rotated = await rotateTokensSecure();

      if (!rotated?.access) {
        throw new Error("No access returned from secure rotation");
      }

      // (2) Save new access
      setAccessToken(rotated.access);
      setLastSecured(Date.now());

      // (3) Refresh session + user state
      const boot = await bootstrapSession();
      if (!boot?.user) {
        throw new Error("Rotation succeeded but bootstrap had no user");
      }

      console.log("✅ [useSecureRotation] rotation successful");
      return rotated;
    } catch (err: any) {
      console.error("❌ [useSecureRotation] rotation failed:", err);

      // fail-closed
      clearAccessToken();
      setError("Security upgrade failed — please re-authenticate.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    secureNow,
    loading,
    lastSecured,
    error,
  };
};
