// ✅ FINAL — Zero-trust secure account workflow
// src/features/auth/context/AuthProvider/useSecureAccount.ts

import { useCallback, useState } from "react";
import { bootstrapSession } from "../../api/bootstrapApi";
import { setAccessToken, clearAccessToken } from "../../utils/tokenStorage";

import type { User, SecureDeviceResponse } from "../../api/types";
import { useSecureRotation } from "../../hooks/useSecureRotation";
import { useSecureCooldown } from "../../hooks/useSecureCooldown";

/* ===================================
   🛡️ useSecureAccount
   Full secure rotation + cooldown
=================================== */
export const useSecureAccount = (setUser: (u: User | null) => void) => {
  const { secureNow, loading } = useSecureRotation();
  const {
    canSecure,
    remaining,
    startCooldown,
    clearCooldown,
  } = useSecureCooldown();

  const [secureMessage, setSecureMessage] = useState<string | null>(null);

  /* --------------------------------
       🔐 SECURE ACCOUNT
     - rotate tokens (backend = source of truth)
     - bootstrap new access + user
     - UX cooldown
  -------------------------------- */
  const handleSecureAccount = useCallback(async (): Promise<string> => {
    if (loading) return "Already securing — hang tight.";

    // ✅ UX guard only — backend enforces true limit
    if (!canSecure) {
      return `Try again in ~${Math.ceil(remaining / 60000)} min.`;
    }

    try {
      // 1) 🔁 rotate tokens
      const rotated: SecureDeviceResponse | null = await secureNow();

      if (!rotated?.access) {
        throw new Error("Rotation returned no access token.");
      }

      // 2) ✅ store new access
      setAccessToken(rotated.access);

      // 3) 🔄 bootstrap new user session
      const boot = await bootstrapSession();

      if (!boot?.user) {
        // backend rotated but user missing = stale = kill
        clearAccessToken();
        clearCooldown();
        setUser(null);
        throw new Error("Secure rotation ok but session restore failed.");
      }

      // ✅ restore app-level user
      setUser(boot.user);

      // ✅ UX cooldown start
      startCooldown();

      const msg =
        rotated.message ??
        "✅ Device locked down. Account secured successfully.";

      setSecureMessage(msg);
      console.log("[useSecureAccount] ✅ secure success");
      return msg;
    } catch (err: any) {
      console.error("[useSecureAccount] ❌ error:", err);

      // 🔥 safest → full wipe
      clearAccessToken();
      clearCooldown();
      setUser(null);

      const msg =
        err?.message ?? "Could not secure account. Please log in again.";

      setSecureMessage(msg);
      return msg;
    }
  }, [
    loading,
    canSecure,
    remaining,
    secureNow,
    startCooldown,
    clearCooldown,
    setUser,
  ]);

  /** 📌 Alias for FE API consistency */
  const secureDevice = handleSecureAccount;

  return {
    // ✅ primary action
    handleSecureAccount,
    secureDevice,

    // ✅ metadata / UI state
    isSecuring: loading,
    secureMessage,
    canSecure,
    secureCooldownRemaining: remaining,
  };
};
