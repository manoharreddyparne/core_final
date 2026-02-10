// ✅ FINAL — Password Handler
// src/features/auth/context/AuthProvider/usePasswordHandler.ts

import { useCallback } from "react";

import {
  changePassword as apiChangePassword,
  resetPasswordRequest as apiResetPasswordRequest,
  resetPasswordConfirm as apiResetPasswordConfirm,
  resetPasswordValidate as apiResetPasswordValidate,
} from "../../api/passwordApi";

import type {
  ResetPasswordRequestDetail,
  ResetPasswordConfirmResponse,
  User,
} from "../../api/types";

import { useSessionBootstrap } from "./useSessionBootstrap";
import { setAccessToken } from "../../utils/tokenStorage";

/* ===================================
   🔑 usePasswordHandler
=================================== */
export const usePasswordHandler = (
  setUser: (user: User | null) => void
) => {
  const { refreshSession } = useSessionBootstrap();

  /* ----------------------------
     🔁 CHANGE PASSWORD
  ---------------------------- */
  const changePassword = useCallback(
    async (oldPwd: string, newPwd: string): Promise<string> => {
      const res = await apiChangePassword(oldPwd, newPwd);

      if (res?.access) {
        setAccessToken(res.access);
        await refreshSession();
        if (res?.user) setUser(res.user);
      }

      return res?.message ?? "Password changed";
    },
    [refreshSession, setUser]
  );

  /* ----------------------------
     ✉️ RESET PASSWORD REQUEST
  ---------------------------- */
  const resetPasswordRequest = useCallback(
    async (email: string): Promise<ResetPasswordRequestDetail> =>
      await apiResetPasswordRequest(email),
    []
  );

  /* ----------------------------
     🔒 RESET PASSWORD CONFIRM
  ---------------------------- */
  const resetPasswordConfirm = useCallback(
    async (
      token: string,
      newPwd: string,
      confirmPwd: string
    ): Promise<ResetPasswordConfirmResponse> =>
      await apiResetPasswordConfirm(token, newPwd, confirmPwd),
    []
  );

  /* ----------------------------
     ✅ VALIDATE RESET TOKEN
  ---------------------------- */
  const resetPasswordValidate = useCallback(
    async (token: string) => await apiResetPasswordValidate(token),
    []
  );

  return {
    changePassword,
    resetPasswordRequest,
    resetPasswordConfirm,
    resetPasswordValidate,
  };
};
