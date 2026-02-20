// ✅ FINAL — zero-trust secure rotation API
// src/features/auth/api/secureDeviceApi.ts

import {
  apiClient,
  setAccessToken,
} from "./base";

import type { ApiResponse, User } from "./types";

/**
 * 🔐 SecureDeviceResponse
 * ------------------------------------------------
 * Aligns with FE <User> type to avoid TS conflict.
 */
export type SecureDeviceResponse = {
  access?: string;                 // new short-lived access token
  refresh_token_present?: boolean; // backend confirmed refresh cookie
  user?: User;                     // ✅ aligned with FE User type
  success?: boolean;
  message?: string;
};

/** Backend route — keep synced with Django */
const ROTATE_PATH = "secure-device/";

/**
 * 🔁 rotateTokensSecure
 * ------------------------------------------------
 * User manually triggers a security refresh ("Secure Device").
 *
 * ✅ Rotates refresh (httpOnly) + new access
 * ✅ FE stores ONLY access (memory)
 * ✅ Backend pushes refresh via Set-Cookie
 */
export const rotateTokensSecure = async (): Promise<SecureDeviceResponse> => {
  const res = await apiClient.post<ApiResponse<SecureDeviceResponse>>(
    ROTATE_PATH,
    {}
  );

  const data: SecureDeviceResponse = res?.data?.data ?? {};


  // ✅ must have access or fail
  if (data.access) {
    setAccessToken(data.access);
  } else {
    throw new Error("Secure rotation did not return an access token.");
  }

  return {
    ...data,
    success: res?.data?.success,
    message: res?.data?.message ?? "Tokens rotated successfully",
  };
};

/**
 * 🫱 backward-compatible alias
 * supports old import paths:
 *   import { secureDevice } from ...
 */
export const secureDevice = rotateTokensSecure;
