// ✅ PRODUCTION — Bank-Grade Bootstrap API
// src/features/auth/api/bootstrapApi.ts
//
// Architecture:
//   • Calls GET /session/bootstrap/ ONCE on cold boot
//   • Backend checks HttpOnly refresh cookie (JS never sees it)
//   • 200 + access → valid session → hydrate
//   • 400 → no active session → show login (not an error)
//   • 401/403 → expired/invalid → clear access, show login
//   • No JS cookie manipulation at all

import {
  apiClient,
  setAccessToken,
  clearAccessToken,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

type BootstrapPayload = {
  access?: string;
  user?: AuthResponse["user"];
};

/**
 * 🚀 bootstrapSession
 * ------------------------------------------------
 * Backend = source of truth. FE = just the messenger.
 *
 * ✅ Refresh stays HttpOnly — JS never sees it
 * ✅ Access rotated when backend says
 * ✅ User always comes from backend
 * ✅ 400 → gracefully "no active session"
 * ✅ 401/403 → session invalid → wipe access
 */
export const bootstrapSession = async (): Promise<AuthResponse> => {
  try {
    const res = await apiClient.get<ApiResponse<AuthResponse>>(
      "/session/bootstrap/"
    );

    const payload = (res?.data?.data ?? {}) as BootstrapPayload;

    // ✅ If backend rotated access → store in memory
    if (payload.access) {
      setAccessToken(payload.access);
      console.info("✅ [bootstrap] fresh access token received");
    }

    return {
      success: res?.data?.success ?? true,
      message: res?.data?.message ?? "Session restored",
      access: payload.access,
      user: payload.user ?? null,
    };
  } catch (err: any) {
    const status = err?.response?.status;

    // 💛 400 → No active session (not a failure, just cold boot)
    if (status === 400) {
      console.info("ℹ️ [bootstrap] no active session (400)");
      return {
        success: false,
        message: "No active session",
        access: undefined,
        user: null,
      };
    }

    // ⛔ 401/403 → invalid refresh → clear memory access token
    if (status === 401 || status === 403) {
      console.info("⛔ [bootstrap] session invalid (401/403) → clearing access token");
      clearAccessToken();
      return {
        success: false,
        message: "Session expired",
        access: undefined,
        user: null,
      };
    }

    // 💥 Unknown server failure
    console.error("❌ [bootstrap] unexpected error:", err);
    throw err;
  }
};
