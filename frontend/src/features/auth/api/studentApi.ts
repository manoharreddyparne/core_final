// ✅ src/features/auth/api/studentApi.ts
import {
  apiClient,
  setAccessToken,
  setRefreshCookieFromResponse,
  clearAccessToken,
  clearRefreshTokenCookies,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

/* ===================================
   👨‍🎓 STUDENT LOGIN
=================================== */
export const loginUser = async (
  login: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/login/",
      { identifier: login, password }
    );

    const raw = res.data?.data;

    const data: AuthResponse = {
      success: res.data?.success ?? true,
      message: res.data?.message ?? "",
      ...raw,
    };

    if (data.access) {
      setAccessToken(data.access);
    }

    setRefreshCookieFromResponse(res);

    return data;
  } catch (err: any) {
    const r = err?.response;
    return {
      success: false,
      message: r?.data?.message || "Invalid credentials",
      cooldown: r?.data?.data?.cooldown,
      locked_until: r?.data?.data?.locked_until,
    };
  }
};

/* ===================================
   🚪 LOGOUT — current session only
=================================== */
export const logoutUser = async (): Promise<void> => {
  try {
    await apiClient.post("/logout/");
  } finally {
    clearAccessToken();
    clearRefreshTokenCookies();
  }
};
