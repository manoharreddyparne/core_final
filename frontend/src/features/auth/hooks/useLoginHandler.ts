// ✅ FINAL — ENTERPRISE-GRADE
// src/features/auth/hooks/useLoginHandler.ts

import { useCallback, useRef, useState } from "react";

/* ===========================
   API
=========================== */
import { loginUser } from "../api/studentApi";
import {
  loginAdminOrTeacher,
  verifyAdminOTP,
} from "../api/adminApi";
import { bootstrapSession } from "../api/bootstrapApi";

/* ===========================
   TOKEN
=========================== */
import {
  setAccessToken,
  clearAccessToken,
} from "../utils/tokenStorage";

/* ===========================
   TYPES
=========================== */
import type { AuthResponse, User } from "../api/types";

export type LoginResult = AuthResponse & {
  role: "student" | "admin";
};

export const useLoginHandler = (
  role: "student" | "admin",
  setUser: (u: User | null) => void
) => {
  /* Track cooldowns locally */
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  /* Temp store for OTP */
  const otpRef = useRef<{ userId: number; password: string } | null>(null);

  /* -------------------------------
     COOLDOWN MGMT
  -------------------------------- */
  const setCooldown = useCallback((key: string, seconds: number) => {
    const until = Date.now() + seconds * 1000;
    setCooldowns((prev) => ({ ...prev, [key]: until }));
  }, []);

  const isUnderCooldown = useCallback(
    (key: string) => !!cooldowns[key] && cooldowns[key] > Date.now(),
    [cooldowns]
  );

  /* -------------------------------
     LOGIN
  -------------------------------- */
  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const username = identifier.trim();

      if (!username || !password) {
        return {
          success: false,
          message: "Missing username/email or password",
          role,
        };
      }

      // Cooldown block
      if (isUnderCooldown(username)) {
        return {
          success: false,
          message: "Cooldown active. Try again soon.",
          cooldown: Math.ceil((cooldowns[username]! - Date.now()) / 1000),
          role,
        };
      }

      try {
        // Call API by role
        const res: AuthResponse =
          role === "student"
            ? await loginUser(username, password)
            : await loginAdminOrTeacher(username, password);

        // Cooldown (if backend instructs)
        if (res.cooldown) {
          setCooldown(username, res.cooldown);
        }

        // 🔐 OTP required?
        if (res.require_otp && res.user_id) {
          otpRef.current = { userId: res.user_id, password };
          return { ...res, role };
        }

        // ✅ Full login OK
        if (res.success && res.access) {
          setAccessToken(res.access);

          // bootstrap + setUser
          const boot = await bootstrapSession();
          setUser(boot?.user ?? null);

          otpRef.current = null;
        } else {
          // ❌ Failed login
          clearAccessToken();
          setUser(null);
        }

        return { ...res, role };
      } catch (err: any) {
        const e = err?.response?.data;

        if (e?.cooldown) {
          setCooldown(username, e.cooldown);
        }

        return {
          success: false,
          message: e?.message ?? "Login failed.",
          cooldown: e?.cooldown,
          require_otp: e?.require_otp,
          user_id: e?.user_id,
          role,
        };
      }
    },
    [role, cooldowns, setCooldown, setUser, isUnderCooldown]
  );

  /* -------------------------------
     VERIFY OTP
  -------------------------------- */
  const verifyOTP = useCallback(
    async (
      userId: number,
      otp: string,
      password?: string
    ): Promise<LoginResult> => {
      // Students don’t use OTP
      if (role === "student") {
        return {
          success: false,
          message: "OTP not required for students.",
          require_otp: false,
          role,
        };
      }

      const refPw = password ?? otpRef.current?.password;
      if (!refPw) {
        return {
          success: false,
          message: "Missing password for OTP.",
          require_otp: true,
          user_id: userId,
          role,
        };
      }

      try {
        const res = await verifyAdminOTP(userId, otp, refPw);

        if (!res.access) {
          throw new Error("OTP verification returned no access token");
        }

        setAccessToken(res.access);

        // bootstrap + setUser
        const boot = await bootstrapSession();
        setUser(boot?.user ?? null);

        otpRef.current = null;

        return {
          ...res,
          require_otp: false,
          user_id: userId,
          role,
        };
      } catch (err: any) {
        otpRef.current = null;
        const e = err?.response?.data;

        return {
          success: false,
          message: e?.message ?? "OTP verification failed.",
          cooldown: e?.cooldown,
          require_otp: true,
          user_id: userId,
          role,
        };
      }
    },
    [role, setUser]
  );

  /* -------------------------------
     EXPORT
  -------------------------------- */
  return {
    login,
    verifyOTP,
  };
};
