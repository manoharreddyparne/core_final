// ✅ src/features/auth/hooks/useLoginHandler.ts
import { useCallback, useRef, useState } from "react";

/* ===========================
   API
=========================== */
import { loginUser, requestStudentOTP, verifyStudentOTP } from "../api/studentApi";
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
  const otpRef = useRef<{ userId?: number; identifier?: string; password?: string } | null>(null);

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
     LOGIN / REQUEST OTP
  -------------------------------- */
  const login = useCallback(
    async (identifier: string, password?: string, turnstileToken?: string): Promise<LoginResult> => {
      const username = identifier.trim();

      if (!username) {
        return {
          success: false,
          message: "Missing identifier",
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
        let res: AuthResponse;

        if (role === "student") {
          // Student flow: OTP Request
          res = await requestStudentOTP(username, turnstileToken);
          if (res.success) {
            // Backend sends generic success, we trigger OTP view
            otpRef.current = { identifier: username };
            return { ...res, success: true, require_otp: true, role };
          }
        } else {
          // Admin flow: Password + optional 2FA
          if (!password) {
            return { success: false, message: "Password required for admin", role };
          }
          res = await loginAdminOrTeacher(username, password, turnstileToken);
        }

        // Cooldown (if backend instructs)
        if (res.cooldown) {
          setCooldown(username, res.cooldown);
        }

        // 🔐 OTP required (for Admin 2FA)
        if (res.require_otp && res.user_id) {
          otpRef.current = { userId: res.user_id, password };
          return { ...res, role };
        }

        // ✅ Full login OK (usually for Admin if 2FA disabled)
        if (res.success && res.access) {
          setAccessToken(res.access);
          const boot = await bootstrapSession();
          setUser(boot?.user ?? null);
          otpRef.current = null;
        } else if (!res.require_otp) {
          // ❌ Failed login
          clearAccessToken();
          setUser(null);
        }

        return { ...res, role };
      } catch (err: any) {
        const e = err?.response?.data;
        return {
          success: false,
          message: e?.message ?? "Authentication failed.",
          cooldown: e?.cooldown,
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

      try {
        let res: AuthResponse;

        if (role === "student") {
          const identifier = otpRef.current?.identifier;
          if (!identifier) {
            return { success: false, message: "Session expired. Please request OTP again.", role };
          }
          res = await verifyStudentOTP(identifier, otp);
        } else {
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
          res = await verifyAdminOTP(userId, otp, refPw);
        }

        if (res.success && res.access) {
          setAccessToken(res.access);
          const boot = await bootstrapSession();
          setUser(boot?.user ?? null);
          otpRef.current = null;
          return { ...res, require_otp: false, role };
        }

        return { ...res, role };
      } catch (err: any) {
        const e = err?.response?.data;
        return {
          success: false,
          message: e?.message ?? "OTP verification failed.",
          role,
        };
      }
    },
    [role, setUser]
  );

  return {
    login,
    verifyOTP,
  };
};
