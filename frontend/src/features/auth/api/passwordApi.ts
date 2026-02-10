// ✅ FINAL — Password API (fully backend-aligned)
// src/features/auth/api/passwordApi.ts

import {
  apiClient,
  authHeaders,
  setRefreshCookieFromResponse,
} from "./base";

import { setAccessToken } from "../utils/tokenStorage";
import type {
  ApiResponse,
  PasswordChangeResponse,
  ResetPasswordRequestDetail,
  ResetPasswordConfirmResponse,
} from "./types";

/* ===================================
   🔐 CHANGE PASSWORD
=================================== */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<PasswordChangeResponse> => {
  try {
    const res = await apiClient.post<ApiResponse<PasswordChangeResponse>>(
      "/change-password/",
      { old_password: oldPassword, new_password: newPassword },
      { headers: authHeaders() }
    );

    const data = (res?.data?.data ?? {}) as PasswordChangeResponse;

    if (data.access) setAccessToken(data.access);
    setRefreshCookieFromResponse(res);

    return {
      ...data,
      success: true,
      message: res?.data?.message ?? data?.message ?? "Password changed",
    };
  } catch (err: any) {
    const r = err?.response;
    const data = (r?.data?.data ?? {}) as PasswordChangeResponse;

    return {
      ...data,
      success: false,
      message: r?.data?.message ?? "Password change failed",
    };
  }
};

/* ===================================
   🔁 RESET PASSWORD REQUEST
=================================== */
export const resetPasswordRequest = async (
  email: string
): Promise<ResetPasswordRequestDetail> => {
  try {
    const res = await apiClient.post<ApiResponse<ResetPasswordRequestDetail>>(
      "/reset-password-request/",
      { email }
    );

    const data = (res?.data?.data ?? {}) as ResetPasswordRequestDetail;

    return {
      ...data,
      success: true,
      message: res?.data?.message ?? "Email sent",
    };
  } catch (err: any) {
    const r = err?.response;
    const data = (r?.data?.data ?? {}) as ResetPasswordRequestDetail;

    return {
      ...data,
      success: false,
      message: r?.data?.message ?? "Failed to request password reset",
    };
  }
};

/* ===================================
   🔁 RESET PASSWORD CONFIRM
=================================== */
export const resetPasswordConfirm = async (
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<ResetPasswordConfirmResponse> => {
  try {
    const res = await apiClient.post<
      ApiResponse<ResetPasswordConfirmResponse>
    >(
      `/reset-password-confirm/${encodeURIComponent(token)}/`,
      {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }
    );

    const data = (res?.data?.data ?? {}) as ResetPasswordConfirmResponse;

    if (data.access) setAccessToken(data.access);
    setRefreshCookieFromResponse(res);

    return {
      ...data,
      success: true,
      message: res?.data?.message ?? data?.message,
    };
  } catch (err: any) {
    const r = err?.response;
    const data = (r?.data?.data ?? {}) as ResetPasswordConfirmResponse;

    return {
      ...data,
      success: false,
      message: r?.data?.message ?? "Reset password failed",
    };
  }
};

/* ===================================
   🔁 VALIDATE RESET TOKEN
=================================== */
export const resetPasswordValidate = async (token: string) => {
  const res = await apiClient.get(
    `/reset-password-validate/${encodeURIComponent(token)}/`
  );

  return res?.data;
};
