// ✅ src/features/auth/api/adminApi.ts
import {
  apiClient,
  setAccessToken,
  setRefreshCookieFromResponse,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

/* ============================================================
   🧑‍🏫 ADMIN / TEACHER LOGIN
============================================================ */
export const loginAdminOrTeacher = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/admin/login/",
      { username, password }
    );

    const raw = res.data?.data;
    const data: AuthResponse = {
      success: res.data?.success ?? false,
      message: res.data?.message ?? "",
      ...raw,
    };

    // token only if present (OTP flow won't have access)
    if (data.access) {
      setAccessToken(data.access);
    }

    setRefreshCookieFromResponse(res);

    return data;
  } catch (err: any) {
    const r = err?.response;
    return {
      success: false,
      message: r?.data?.message ?? "Invalid credentials",
      cooldown: r?.data?.data?.cooldown,
      locked_until: r?.data?.data?.locked_until,
    };
  }
};

/* ============================================================
   🔢 VERIFY ADMIN / TEACHER OTP
============================================================ */
export const verifyAdminOTP = async (
  userId: number,
  otp: string,
  password?: string
): Promise<AuthResponse> => {
  const payload: Record<string, any> = { user_id: userId, otp };
  if (password) payload.password = password;

  const res = await apiClient.post<ApiResponse<AuthResponse>>(
    "/admin/verify-otp/",
    payload
  );

  const raw = res.data?.data;
  const data: AuthResponse = {
    success: res.data?.success ?? false,
    message: res.data?.message ?? "",
    ...raw,
  };

  if (data.access) {
    setAccessToken(data.access);
  }

  setRefreshCookieFromResponse(res);

  return data;
};

/* ============================================================
   🔐 GOOGLE OAUTH — EXCHANGE AUTH CODE
============================================================ */
export const googleExchangeCode = async (
  code: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/google/login/",
      { code }
    );

    const raw = res.data?.data;
    const data: AuthResponse = {
      success: res.data?.success ?? false,
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
      message: r?.data?.message ?? "Google login failed",
    };
  }
};
