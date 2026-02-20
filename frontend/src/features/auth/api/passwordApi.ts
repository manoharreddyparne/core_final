// ✅ FINAL — Password API (fully backend-aligned)
// src/features/auth/api/passwordApi.ts

import {
  apiClient,
  authHeaders,
} from "./base";

import { setAccessToken } from "../utils/tokenStorage";
import { extractApiError } from "../utils/extractApiError";
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

    return {
      ...data,
      success: true,
      message: res?.data?.message ?? data?.message ?? "Password changed",
    };
  } catch (err: any) {
    const r = err?.response;
    const data = (r?.data?.data ?? {}) as PasswordChangeResponse;
    // Extract field-level DRF errors (e.g. {new_password: ["..."] })
    // They may live at r?.data?.errors OR directly at r?.data
    const rawErrors = r?.data?.errors ?? r?.data ?? {};

    return {
      ...data,
      success: false,
      message: extractApiError(err, "Password change failed"),
      errors: rawErrors,
    } as any;
  }
};

/* ===================================
   🔁 RESET PASSWORD REQUEST
=================================== */
export const resetPasswordRequest = async (
  email: string,
  roleContext?: string
): Promise<ResetPasswordRequestDetail> => {
  try {
    const res = await apiClient.post<ApiResponse<ResetPasswordRequestDetail>>(
      "/reset-password-request/",
      { email, role_context: roleContext }
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
      message: extractApiError(err, "Failed to request password reset"),
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

    return {
      ...data,
      success: true,
      message: res?.data?.message ?? data?.message,
    };
  } catch (err: any) {
    const r = err?.response;
    const data = (r?.data?.data ?? {}) as ResetPasswordConfirmResponse;
    const rawErrors = r?.data?.errors ?? r?.data ?? {};

    return {
      ...data,
      success: false,
      message: extractApiError(err, "Reset password failed"),
      errors: rawErrors,
    } as any;
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
