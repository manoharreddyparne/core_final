// ✅ src/features/auth/api/socialApi.ts
import {
  apiClient,
  setAccessToken,
  setRefreshCookieFromResponse,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

/* ============================================================
   🔐 GOOGLE OAUTH — CODE → BACKEND → JWT SESSION
============================================================ */
export const googleLogin = async (authCode: string): Promise<AuthResponse> => {
  try {
    // ✅ correct backend endpoint
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/users/social/google/",
      { code: authCode }
    );

    const raw = res.data?.data;

    const data: AuthResponse = {
      success: res.data?.success ?? false,
      message: res.data?.message ?? "",
      ...raw,
    };

    // 🔐 store access
    if (data.access) {
      setAccessToken(data.access);
    }

    // 🍪 refresh token
    setRefreshCookieFromResponse(res);

    return data;
  } catch (err: any) {
    const r = err?.response;

    return {
      success: false,
      message: r?.data?.message ?? "Google login failed",
    };
  }
};
