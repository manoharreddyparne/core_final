// ✅ src/features/auth/hooks/useGoogleLogin.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { googleExchangeCode } from "../api/adminApi";
import { hydratePassport } from "../api/passportApi";
import { useAuth } from "../context/AuthProvider/AuthProvider";

export const useGoogleLogin = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const doGoogleLogin = useCallback(
    async (authCode: string) => {
      // hit backend: /auth/google/login/
      const res = await googleExchangeCode(authCode);

      if (!res?.success || !res?.access) {
        throw new Error(res?.message ?? "Google login failed");
      }

      // refresh + hydrate user
      const boot = await hydratePassport();
      setUser(boot?.user ?? null);

      // redirect
      const role = boot?.user?.role?.toLowerCase();
      navigate(
        role === "admin" ? "/admin-dashboard" : "/student-dashboard",
        { replace: true }
      );

      return res;
    },
    [setUser, navigate]
  );

  return { doGoogleLogin };
};
