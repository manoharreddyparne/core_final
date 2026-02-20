import {
  apiClient,
  setAccessToken,
  clearAccessToken,
} from "./base";

import type { ApiResponse, AuthResponse } from "./types";

/* ===================================
   👨‍🎓 STUDENT LOGIN
=================================== */
export const loginUser = async (
  login: string,
  password: string,
  turnstileToken?: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "auth/v2/student/login/",
      { identifier: login, password, turnstile_token: turnstileToken }
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
   🔢 STUDENT OTP FLOW
=================================== */
export const requestStudentOTP = async (
  identifier: string,
  turnstileToken?: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/otp/request/",
      { identifier, turnstile_token: turnstileToken }
    );
    return {
      success: res.data?.success ?? true,
      message: res.data?.message ?? "",
      ...res.data?.data
    };
  } catch (err: any) {
    const r = err?.response;
    return {
      success: false,
      message: r?.data?.message || "Failed to request OTP",
      cooldown: r?.data?.data?.cooldown,
    };
  }
};

export const verifyStudentOTP = async (
  identifier: string,
  otp: string
): Promise<AuthResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/otp/verify/",
      { identifier, otp }
    );

    const data: AuthResponse = {
      success: res.data?.success ?? true,
      message: res.data?.message ?? "",
      ...res.data?.data
    };

    if (data.access) {
      setAccessToken(data.access);
    }

    return data;
  } catch (err: any) {
    const r = err?.response;
    return {
      success: false,
      message: r?.data?.message || "Invalid OTP",
    };
  }
};

/* ===================================
   🚪 LOGOUT
=================================== */
export const logoutUser = async (): Promise<void> => {
  try {
    await apiClient.post("logout/");
  } catch (_) {
    // Soft fail: FE will still wipe tokens regardless
  } finally {
    clearAccessToken();
    // Clear signal cookie
    document.cookie = "auip_logged_in=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }
};
