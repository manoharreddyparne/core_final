// ✅ PRODUCTION — Zero-Trust Axios Client
// src/features/auth/api/base.ts
//
// Architecture:
//   • Access token: memory-only (never in cookies/storage)
//   • Refresh token: HttpOnly cookie (JS NEVER touches it)
//   • Silent refresh: on 401, call /session/bootstrap/ ONCE
//   • No JS-readable marker cookies — backend is sole truth

import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../utils/tokenStorage";

/* ===================================
   🔗 BASE CONFIG
=================================== */

export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/users/`
    : `http://localhost:8000/api/users/`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ sends HttpOnly refresh cookie automatically
});

/* ===================================
   🧾 AUTH HEADERS
=================================== */

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ===================================
   🔄 SILENT REFRESH INTERCEPTOR
   ─────────────────────────────────
   On 401 → try /session/bootstrap/ ONCE
   If bootstrap also fails → clear state, reject
   
   ⛔ NEVER retry bootstrap/login/logout endpoints
      to prevent infinite 401 loops
=================================== */

let isRefreshing = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Endpoints that must NEVER trigger silent refresh
const SKIP_REFRESH_URLS = [
  "session/bootstrap",
  "/login/",
  "/logout/",
  "/auth/otp/",
];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";

    // ⛔ Skip auth endpoints — prevents infinite 401 loop
    const isAuthEndpoint = SKIP_REFRESH_URLS.some((u) => url.includes(u));

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers["Authorization"] = "Bearer " + token;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await apiClient.get("session/bootstrap/");
        const newAccess = res.data?.data?.access;

        if (newAccess) {
          setAccessToken(newAccess);
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
          processQueue(null, newAccess);
          return apiClient(originalRequest);
        }

        // No access token in response → session truly expired
        processQueue(new Error("No access token"), null);
        clearAccessToken();
        return Promise.reject(error);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* ===================================
   RE-EXPORT low-level storage
=================================== */
export { setAccessToken, getAccessToken, clearAccessToken };

/* ===================================
   🚫 DEPRECATED NO-OP STUBS
   ─────────────────────────────────
   Backend now manages ALL cookies via HttpOnly Set-Cookie headers.
   These exist only for backward-compatibility with existing imports.
   They intentionally do NOTHING — JS must never touch cookies.
=================================== */

/** @deprecated Backend sets refresh cookie via Set-Cookie header. This is a no-op. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setRefreshCookieFromResponse = (_res: any): void => { };

/** @deprecated Backend clears cookies on logout. This is a no-op. */
export const clearRefreshTokenCookies = (): void => { };
