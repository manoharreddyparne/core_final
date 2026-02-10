// import { useState, useCallback } from "react";
// import {
//   loginUser,
//   loginAdminOrTeacher,
//   verifyAdminOTP,
//   type AuthResponse,
// } from "../api/authApi";
// import { setAccessToken } from "../utils/tokenStorage";
// import type { User } from "../api/authApi";

// interface UseLoginReturn {
//   isLoading: boolean;
//   otpRequired: boolean;
//   otpUserId: number | null;
//   cooldowns: Record<string, number>;
//   loginUserHandler: (login: string, password: string, role: "student" | "admin") => Promise<AuthResponse | null>;
//   verifyOtpHandler: (otp: string, password?: string) => Promise<AuthResponse | null>;
//   resetOtp: () => void;
// }

// export const useLogin = (onSuccess?: (user: User, access?: string) => void): UseLoginReturn => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [otpRequired, setOtpRequired] = useState(false);
//   const [otpUserId, setOtpUserId] = useState<number | null>(null);
//   const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

//   // ===========================
//   // Student / Admin Login
//   // ===========================
//   const loginUserHandler = useCallback(async (login: string, password: string, role: "student" | "admin") => {
//     if (!login || !password) return null;

//     setIsLoading(true);
//     const now = Date.now();

//     try {
//       const res =
//         role === "admin"
//           ? await loginAdminOrTeacher(login, password)
//           : await loginUser(login, password);

//       if (res.require_otp && res.user_id) {
//         // Admin login: OTP required
//         setOtpRequired(true);
//         setOtpUserId(res.user_id);

//         const cooldownEnd = now + ((res.cooldown ?? 10) * 1000);
//         setCooldowns((prev) => ({ ...prev, [login]: cooldownEnd }));

//         return res;
//       }

//       if (res.success && res.user) {
//         // Student login: success
//         if (res.access) setAccessToken(res.access);
//         onSuccess?.(res.user, res.access);
//       }

//       return res;
//     } catch (err: any) {
//       console.error("❌ Login failed:", err);
//       return {
//         success: false,
//         message: err?.response?.data?.message || err.message || "Login failed",
//       } as AuthResponse;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [onSuccess]);

//   // ===========================
//   // Verify OTP for Admin
//   // ===========================
//   const verifyOtpHandler = useCallback(async (otp: string, password?: string) => {
//     if (!otpUserId) return null;
//     setIsLoading(true);

//     try {
//       const res = await verifyAdminOTP(otpUserId, otp, password);

//       if (res.success && res.user) {
//         setAccessToken(res.access ?? "");
//         onSuccess?.(res.user, res.access);
//         setOtpRequired(false);
//         setOtpUserId(null);
//       }

//       return res;
//     } catch (err: any) {
//       console.error("❌ OTP verification failed:", err);
//       return {
//         success: false,
//         message: err?.response?.data?.message || err.message || "Invalid OTP",
//       } as AuthResponse;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [otpUserId, onSuccess]);

//   // ===========================
//   // Reset OTP Flow
//   // ===========================
//   const resetOtp = useCallback(() => {
//     setOtpRequired(false);
//     setOtpUserId(null);
//   }, []);

//   return {
//     isLoading,
//     otpRequired,
//     otpUserId,
//     cooldowns,
//     loginUserHandler,
//     verifyOtpHandler,
//     resetOtp,
//   };
// };
