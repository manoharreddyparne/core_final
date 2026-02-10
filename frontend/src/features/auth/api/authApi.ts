// import axios, { type AxiosResponse } from "axios";
// import {
//   getAccessToken,
//   setAccessToken,
//   clearAccessToken,
// } from "../utils/tokenStorage";

// /* ===================================
//    🔗 BASE URL
// =================================== */
// export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
//   ? `${import.meta.env.VITE_BACKEND_URL}/api/users`
//   : "http://localhost:8000/api/users";

// /* ===================================
//    👤 USER TYPES
// =================================== */
// export type BackendRole = "STUDENT" | "ADMIN" | "TEACHER";

// export interface User {
//   id: number;
//   username: string;
//   email: string;
//   first_name?: string;
//   last_name?: string;
//   first_time_login: boolean;
//   need_password_reset: boolean;
//   role: BackendRole;
// }

// /* ===================================
//    📦 GENERIC API RESPONSE
// =================================== */
// export interface ApiResponse<T> {
//   success: boolean;
//   message: string;
//   data?: T;
// }

// /* ===================================
//    🪪 AUTH HEADERS
// =================================== */
// const authHeaders = () => ({
//   Authorization: `Bearer ${getAccessToken()}`,
// });

// /* ===================================
//    🍪 REFRESH TOKEN HELPERS
// =================================== */
// export const getRefreshCookieName = () => "refresh_token";

// export const clearRefreshTokenCookies = (): void => {
//   document.cookie.split(";").forEach((cookie) => {
//     const [rawName] = cookie.split("=");
//     const name = rawName.trim();
//     if (/refresh/i.test(name) || name === "refresh_token_present") {
//       document.cookie = `${name}=; path=/; max-age=0`;
//       try {
//         document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0`;
//       } catch {
//         /* ignore cross-domain cleanup */
//       }
//     }
//   });
// };

// /* ===================================
//    🔐 AUTH RESPONSE TYPES
// =================================== */
// export interface AuthResponse {
//   access?: string;
//   refresh?: string;
//   user?: User | null;
//   success?: boolean;
//   message?: string;
//   cooldown?: number;
//   locked_until?: number;
//   require_otp?: boolean;
//   user_id?: number;
// }

// /* ===================================
//    🍪 SET REFRESH COOKIE LOCALLY (optional)
// =================================== */
// const setRefreshCookieFromResponse = (res: AxiosResponse): void => {
//   const refreshToken = res.data?.data?.refresh || res.data?.refresh;
//   if (!refreshToken) return;

//   const maxAge = 7 * 24 * 3600; // 7 days
//   const isLocalhost = window.location.hostname === "localhost";
//   const cookieFlags = isLocalhost ? "; SameSite=Lax" : "; Secure; SameSite=Strict";

//   document.cookie = `${getRefreshCookieName()}=${refreshToken}; path=/; max-age=${maxAge}${cookieFlags}`;
//   document.cookie = `refresh_token_present=1; path=/; max-age=${maxAge}`;
// };

// /* ===================================
//    🧍‍♂️ LOGIN (STUDENT)
// =================================== */
// export const loginUser = async (
//   login: string,
//   password: string
// ): Promise<AuthResponse> => {
//   try {
//     const res = await axios.post<ApiResponse<AuthResponse>>(
//       `${API_BASE_URL}/login/`,
//       { login, password },
//       { withCredentials: true }
//     );

//     const data = res.data.data ?? {};
//     if (data.access) setAccessToken(data.access);
//     setRefreshCookieFromResponse(res);

//     return { ...data, success: res.data.success, message: res.data.message };
//   } catch (err: any) {
//     const res = err.response;
//     return {
//       success: false,
//       message: res?.data?.message || err.message || "Invalid credentials",
//       cooldown: res?.data?.data?.cooldown,
//       locked_until: res?.data?.data?.locked_until,
//     };
//   }
// };

// /* ===================================
//    🧑‍🏫 LOGIN (ADMIN / TEACHER)
// =================================== */
// export const loginAdminOrTeacher = async (
//   username: string,
//   password: string
// ): Promise<AuthResponse> => {
//   try {
//     const res = await axios.post<ApiResponse<AuthResponse>>(
//       `${API_BASE_URL}/admin/login/`,
//       { username, password },
//       { withCredentials: true }
//     );

//     const data = res.data.data ?? {};
//     if (data.access) setAccessToken(data.access);
//     setRefreshCookieFromResponse(res);

//     return { ...data, success: res.data.success, message: res.data.message };
//   } catch (err: any) {
//     const res = err.response;
//     return {
//       success: false,
//       message: res?.data?.message || err.message || "Invalid credentials",
//       cooldown: res?.data?.data?.cooldown,
//       locked_until: res?.data?.data?.locked_until,
//     };
//   }
// };

// /* ===================================
//    🔢 VERIFY ADMIN OTP
// =================================== */
// export const verifyAdminOTP = async (
//   userId: number,
//   otp: string,
//   password?: string
// ): Promise<AuthResponse> => {
//   const payload: Record<string, any> = { user_id: userId, otp };
//   if (password) payload.password = password;

//   const res = await axios.post<ApiResponse<AuthResponse>>(
//     `${API_BASE_URL}/admin/verify-otp/`,
//     payload,
//     { withCredentials: true }
//   );

//   const data = res.data.data ?? {};
//   if (data.access) setAccessToken(data.access);
//   setRefreshCookieFromResponse(res);
//   return { ...data, success: res.data.success, message: res.data.message };
// };

// /* ===================================
//    ♻️ BOOTSTRAP SESSION
// =================================== */
// export const bootstrapSession = async (): Promise<AuthResponse> => {
//   try {
//     const res = await axios.get<ApiResponse<AuthResponse>>(
//       `${API_BASE_URL}/session/bootstrap/`,
//       { withCredentials: true }
//     );

//     const data = res.data.data ?? {};
//     if (data.access) {
//       setAccessToken(data.access);
//       console.log("✅ [Auth] Session refreshed via bootstrapSession");
//     }

//     setRefreshCookieFromResponse(res);
//     return { ...data, success: res.data.success, message: res.data.message };
//   } catch (err: any) {
//     const status = err.response?.status;
//     if (status === 401 || status === 403) {
//       clearAccessToken();
//       clearRefreshTokenCookies();
//       console.warn("⚠️ [Auth] Session expired or refresh failed");
//       return { success: false, message: "No active session", user: null };
//     }
//     throw err;
//   }
// };

// /* ===================================
//    🚪 LOGOUT
// =================================== */
// export const logoutUser = async (): Promise<void> => {
//   try {
//     await axios.post(`${API_BASE_URL}/logout/`, {}, { withCredentials: true });
//   } finally {
//     clearAccessToken();
//     clearRefreshTokenCookies();
//   }
// };

// /* ===================================
//    🔑 CHANGE PASSWORD
// =================================== */
// export interface ChangePasswordResponse {
//   access?: string;
//   refresh?: string;
//   user?: User | null;
// }

// export const changePassword = async (
//   oldPassword: string,
//   newPassword: string
// ): Promise<ChangePasswordResponse & { message: string }> => {
//   const res = await axios.post<ApiResponse<ChangePasswordResponse>>(
//     `${API_BASE_URL}/change-password/`,
//     { old_password: oldPassword, new_password: newPassword },
//     { headers: authHeaders(), withCredentials: true }
//   );

//   const data = res.data.data ?? {};
//   if (data.access) setAccessToken(data.access);
//   setRefreshCookieFromResponse(res);
//   return { ...data, message: res.data.message };
// };

// /* ===================================
//    🔁 RESET PASSWORD FLOW
// =================================== */
// export interface ResetPasswordRequestDetail {
//   message: string;
//   success: boolean;
//   cooldown?: number;
//   dev_token?: string;
//   locked_until?: number;
//   ip?: string;
//   errors?: Record<string, any>;
//   field_errors?: Record<string, string[]>;
// }

// export const resetPasswordRequest = async (
//   email: string
// ): Promise<ResetPasswordRequestDetail> => {
//   try {
//     const res = await axios.post<ApiResponse<ResetPasswordRequestDetail>>(
//       `${API_BASE_URL}/reset-password-request/`,
//       { email },
//       { withCredentials: true }
//     );
//     return { success: true, ...res.data.data, message: res.data.message };
//   } catch (err: any) {
//     const res = err.response?.data as ApiResponse<
//       Partial<ResetPasswordRequestDetail>
//     >;
//     return {
//       success: false,
//       message: res?.message ?? "Failed to request password reset.",
//       ...res?.data,
//     };
//   }
// };

// export interface ResetPasswordConfirmResponse {
//   reset_success?: boolean;
//   message?: string;
//   access?: string;
//   refresh?: string;
//   user?: User | null;
// }

// export const resetPasswordConfirm = async (
//   token: string,
//   newPassword: string,
//   confirmPassword: string
// ): Promise<ResetPasswordConfirmResponse> => {
//   const res = await axios.post<ApiResponse<ResetPasswordConfirmResponse>>(
//     `${API_BASE_URL}/reset-password-confirm/${encodeURIComponent(token)}/`,
//     { token, new_password: newPassword, confirm_password: confirmPassword },
//     { withCredentials: true }
//   );

//   const data = res.data.data ?? {};
//   if (data.access) setAccessToken(data.access);
//   setRefreshCookieFromResponse(res);
//   return { ...data, message: res.data.message ?? data.message };
// };

// export const resetPasswordValidate = async (token: string) => {
//   try {
//     const res = await axios.get<ApiResponse<any>>(
//       `${API_BASE_URL}/reset-password-validate/${encodeURIComponent(token)}/`,
//       { withCredentials: true }
//     );
//     return res.data;
//   } catch (err: any) {
//     if (err.response?.data) throw err.response.data;
//     throw new Error(err.message || "Invalid or expired password reset token.");
//   }
// };

// /* ===================================
//    🧩 SECURE DEVICE / TOKEN ROTATION
// =================================== */
// export interface SecureDeviceResponse {
//   access?: string;
//   refresh?: string;
//   message?: string;
// }

// const SECURE_DEVICE_KEY = "secure_device_last_call";

// export const secureDevice = async (): Promise<SecureDeviceResponse> => {
//   const lastCall = Number(localStorage.getItem(SECURE_DEVICE_KEY));
//   const now = Date.now();

//   // Prevent spam calls (limit to once per hour)
//   if (lastCall && now - lastCall < 3600_000) {
//     const accessToken = getAccessToken();
//     if (!accessToken)
//       throw new Error("No access token available for secure device.");
//     return {
//       access: accessToken,
//       message: "Your account is already secure. Try again later.",
//     };
//   }

//   const res = await axios.post<ApiResponse<SecureDeviceResponse>>(
//     `${API_BASE_URL}/token/secure/`,
//     {},
//     { headers: authHeaders(), withCredentials: true }
//   );

//   const data = res.data.data ?? {};
//   if (!data.access)
//     throw new Error("Access token missing in secure device response.");

//   setAccessToken(data.access);
//   setRefreshCookieFromResponse(res);
//   localStorage.setItem(SECURE_DEVICE_KEY, now.toString());

//   return {
//     ...data,
//     message: res.data.message ?? "Your account has been secured successfully.",
//   };
// };
