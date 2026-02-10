// ✅ FINAL — bank-grade bootstrap flow
// src/features/auth/api/bootstrapApi.ts

import {
  apiClient,
  setAccessToken,
  clearAccessToken,
  setRefreshCookieFromResponse,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

/** Light wrapper of backend payload */
type BootstrapPayload = {
  access?: string;
  user?: AuthResponse["user"];
};

/**
 * 🚀 bootstrapSession
 * ------------------------------------------------
 * Backend = source of truth.
 * FE = just the messenger.
 *
 * ✅ Refresh stays HttpOnly
 * ✅ Access rotated when backend says
 * ✅ User always comes from backend
 * ✅ 400 → gracefully "no active session"
 * ✅ 401/403 → session invalid → wipe
 */
export const bootstrapSession = async (): Promise<AuthResponse> => {
  try {
    const res = await apiClient.get<ApiResponse<AuthResponse>>(
      "/session/bootstrap/"
    );

    const payload: BootstrapPayload = (res?.data?.data ?? {}) as BootstrapPayload;

    // ✅ If backend rotated access → store memory token
    if (payload.access) {
      setAccessToken(payload.access);
      console.info("✅ [bootstrap] fresh access token received");
    }

    // ✅ sync refresh cookie if backend rotated it
    setRefreshCookieFromResponse(res);

    return {
      success: res?.data?.success ?? true,
      message: res?.data?.message ?? "Session restored",
      access: payload.access, // undefined when missing — TS-safe
      user: payload.user ?? null,
    };
  } catch (err: any) {
    const status = err?.response?.status;

    /**
     * 💛 400 → No active session (not a failure)
     */
    if (status === 400) {
      console.warn("ℹ️ [bootstrap] no active session (400)");
      return {
        success: false,
        message: "No active session",
        access: undefined,
        user: null,
      };
    }

    /**
     * ⛔ 401/403 → refresh invalid → wipe
     */
    if (status === 401 || status === 403) {
      console.warn("⛔ [bootstrap] session invalid → nuking access");
      clearAccessToken();
      return {
        success: false,
        message: "Session expired",
        access: undefined,
        user: null,
      };
    }

    /**
     * 💥 Unknown server failure
     */
    console.error("❌ [bootstrap] unexpected error:", err);
    throw err;
  }
};
