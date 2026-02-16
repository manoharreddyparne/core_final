// ✅ PRODUCTION — Bank-Grade Passport API
// src/features/auth/api/passportApi.ts
//
// Architecture:
//   • Calls GET /auth/passport/ ONCE on cold boot
//   • Backend checks Quad-Shield cookies (JS never sees them)
//   • 200 + access → valid session → hydrate
//   • 200 + success:false → no active session → show login (not an error)
//   • 401/403 → expired/invalid → clear access, show login
//   • No JS cookie manipulation at all

import {
  apiClient,
  setAccessToken,
  clearAccessToken,
  getAccessToken,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

type PassportPayload = {
  access?: string;
  user?: AuthResponse["user"];
};

// Helper to read cookies
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

/**
 * 🚀 hydratePassport (Quantum Shield Edition)
 * ------------------------------------------------
 * Backend = source of truth. FE = just the messenger.
 *
 * ✅ Calls Unified /auth/passport/
 * ✅ Access rotated when backend says
 * ✅ Handles Stages (JIT -> OTP -> SECURE)
 */
export const hydratePassport = async (): Promise<AuthResponse> => {
  try {
    const res = await apiClient.get<ApiResponse<AuthResponse>>(
      "/auth/passport/"
    );

    const payload = (res?.data?.data ?? {}) as AuthResponse;

    // ✅ If backend provided access -> store in RAM (synced via BroadcastChannel)
    if (payload.access) {
      setAccessToken(payload.access);
      console.debug("✅ [passport] shield rehydrated successfully");
    } else if (res?.data?.success === false) {
      // ℹ️ Expected for cold boot (no error, just unauthenticated)
      const stage = res?.data?.stage || "UNAUTHENTICATED";
      console.debug(`ℹ️ [passport] standby: ${stage}`);

      if (stage === "UNAUTHENTICATED") {
        clearAccessToken();
      }

      return {
        success: false,
        message: res.data.message || "Session required",
        access: undefined,
        user: null,
        stage: stage
      };
    }

    return {
      success: res?.data?.success ?? true,
      message: res?.data?.message ?? "Passport hydrated",
      access: payload.access,
      user: payload.user ?? null,
      stage: payload.stage || "SECURE_SESSION",
    };
  } catch (err: any) {
    const status = err?.response?.status;
    const stage = err?.response?.data?.stage;

    // 401 with stage info -> user needs action (Login/OTP)
    if (status === 401) {
      console.debug(`ℹ️ [passport] stage: ${stage || 'UNAUTHENTICATED'}`);

      // Clear RAM access if not in SECURE stage
      if (stage !== "SECURE_SESSION") {
        clearAccessToken();
      }

      return {
        success: false,
        message: "Session required",
        access: undefined,
        user: null,
        stage: stage || "UNAUTHENTICATED"
      };
    }

    // 💥 Truly unexpected error (Network, 500 etc)
    console.error("❌ [passport] system error:", err);
    throw err;
  }
};
