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

import { useSessionHydration } from "./useSessionHydration";
import { setAccessToken } from "../../utils/tokenStorage";

/* ===================================
   🔑 usePasswordHandler
=================================== */
export const usePasswordHandler = (
  setUser: (user: User | null) => void
) => {
  const { hydrateSession } = useSessionHydration();

  /* ----------------------------
     🔁 CHANGE PASSWORD
  ---------------------------- */
  const changePassword = useCallback(
    async (oldPwd: string, newPwd: string): Promise<any> => {
      const res = await apiChangePassword(oldPwd, newPwd);

      if (res?.access) {
        setAccessToken(res.access);
        await hydrateSession();
        if (res?.user) setUser(res.user);
      }

      return res;
    },
    [hydrateSession, setUser]
  );

  /* ----------------------------
     ✉️ RESET PASSWORD REQUEST
  ---------------------------- */
  const resetPasswordRequest = useCallback(
    async (email: string, roleContext?: string): Promise<ResetPasswordRequestDetail> =>
      await apiResetPasswordRequest(email, roleContext),
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
