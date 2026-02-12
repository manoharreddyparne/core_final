import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import useCooldown from "./useCooldown";

/* Types */
import type { Toast } from "../components/ToastRenderer";
import type { User } from "../api/types";

export const useLoginVM = (defaultRole: "student" | "admin" = "student") => {
  const navigate = useNavigate();

  /* providers */
  const { studentLogin, adminLogin, setUser } = useAuth();

  /* role switching */
  const [role, setRole] = useState<"student" | "admin">(defaultRole);
  const activeLogin = role === "admin" ? adminLogin : studentLogin;
  const { login, verifyOTP } = activeLogin;

  /* form state */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();

  /* OTP */
  const [otp, setOTP] = useState("");
  const [otpRequired, setOTPRequired] = useState(false);
  const [otpUserId, setOtpUserId] = useState<number | null>(null);

  /* misc */
  const [isLoading, setIsLoading] = useState(false);

  /* cooldown */
  const { isUnderCooldown, setCooldown } = useCooldown();

  /* toast */
  const toastId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (msg: string, type: Toast["type"] = "success", endTime?: number) => {
      const id = toastId.current++;
      setToasts((prev) => [...prev, { id, msg, type, endTime }]);

      if (type !== "countdown") {
        setTimeout(() => removeToast(id), 4000);
      }
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* redirect logic */
  const redirectAfterLogin = useCallback(
    (user: User) => {
      const r = user.role?.toLowerCase();
      navigate(r === "student" ? "/student-dashboard" : "/admin-dashboard", {
        replace: true,
      });
    },
    [navigate]
  );

  /* ---------------- LOGIN ---------------- */
  const doLogin = useCallback(async () => {
    if (!username.trim() || !password || isLoading) return;

    // ✅ prevent spam only when cooldown active
    if (isUnderCooldown(username)) return;

    setIsLoading(true);

    try {
      const started = Date.now();
      const res = await login(username.trim(), password, turnstileToken);

      // ✅ OTP PATH
      if (res.require_otp && res.user_id) {
        setOTPRequired(true);
        setOtpUserId(res.user_id);

        const sec = res.cooldown ?? 10;
        const end = started + sec * 1000;
        setCooldown(username, end);
        addToast(res.message ?? "OTP required", "countdown", end);
        return;
      }

      // ✅ SUCCESS — detect by `res.user`
      if (res.user) {
        setUser(res.user);
        addToast(res.message ?? "Login success ✅");
        redirectAfterLogin(res.user);
        return;
      }

      // ❌ FAIL PATH — cooldown only if backend sends it
      if (typeof res.cooldown === "number") {
        const end = started + res.cooldown * 1000;
        setCooldown(username, end);
        addToast(res.message ?? "Login failed ❌", "error", end);
      } else {
        addToast(res.message ?? "Login failed ❌", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    username,
    password,
    isLoading,
    login,
    setUser,
    addToast,
    setCooldown,
    redirectAfterLogin,
    isUnderCooldown,
  ]);

  /* --------------- VERIFY OTP ---------------- */
  const doVerifyOTP = useCallback(async () => {
    if (!otpUserId || !otp || isLoading) return;
    setIsLoading(true);

    try {
      const res = await verifyOTP(otpUserId, otp, password);

      // ✅ success — detect by `res.user`
      if (res.user) {
        setUser(res.user);
        addToast("OTP verified ✅", "success");
        redirectAfterLogin(res.user);
      } else {
        addToast(res.message ?? "OTP failed ❌", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    otp,
    otpUserId,
    isLoading,
    verifyOTP,
    password,
    setUser,
    addToast,
    redirectAfterLogin,
  ]);

  return {
    /* form */
    username,
    setUsername,
    password,
    setPassword,

    /* OTP */
    otp,
    setOTP,
    otpRequired,

    /* role */
    role,
    setRole,

    /* state */
    isLoading,
    isUnderCooldown: isUnderCooldown(username),

    /* toast */
    toasts,
    removeToast,

    /* actions */
    doLogin,
    doVerifyOTP,
    setTurnstileToken,
  };
};
