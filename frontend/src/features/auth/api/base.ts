// ✅ PRODUCTION — Zero-Trust Axios Client
// src/features/auth/api/base.ts
//
// Architecture:
//   • Access token: memory-only (never in cookies/storage)
//   • Refresh token: HttpOnly cookie (JS NEVER touches it)
//   • Silent refresh: on 401, call /auth/passport/ ONCE
//   • No JS-readable marker cookies — backend is sole truth

import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  hasAccessToken,
  isHydrating,
  startHydrating,
  stopHydrating,
  subscribeToTokenUpdates,
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

// ✅ Request Interceptor: Automatic Header Injection
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ===================================
   🔄 SILENT REFRESH INTERCEPTOR
   ─────────────────────────────────
   On 401 → try /auth/passport/ ONCE
   If passport also fails → clear state, reject
   
   ⛔ NEVER retry passport/login/logout endpoints
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

// Start listening for token updates from other tabs
if (typeof window !== "undefined") {
  subscribeToTokenUpdates((token) => {
    if (token && failedQueue.length > 0) {
      console.info("⚡ [Auth] Queue flushed via cross-tab token sync");
      processQueue(null, token);
    }
  });
}

// Endpoints that must NEVER trigger silent refresh (Auth/OTP flows)
const SKIP_REFRESH_URLS = [
  "auth/passport",
  "auth/config",
  "/login/",
  "/logout/",
  "/auth/otp/",
  "admin/login/",
  "admin/verify-otp/",
  "auth/v2/faculty/login/",
  "auth/v2/faculty/mfa/",
  "auth/v2/student/login/",
];

apiClient.interceptors.response.use(
  (response) => {
    // Check for silent rotation token from backend
    const newToken = response.headers["x-new-access-token"];
    if (newToken) {
      console.debug("[Auth] 🔄 Silent rotation detected via header (RAM state synced)");
      setAccessToken(newToken);
    }

    console.debug(`[API-SUCCESS] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    // Even on error, we might have a new token in headers (e.g. 403 or 400 that still rotated)
    const newToken = error.response?.headers["x-new-access-token"];
    if (newToken) {
      setAccessToken(newToken);
    }

    const originalRequest = error.config;
    const url = originalRequest?.url || "";
    const isPassport = url.includes("auth/passport");

    if (error.response?.status === 401 && isPassport) {
      console.debug(`[API-READY] Passport rehydration standby (login required).`);
    } else {
      console.error(`[API-ERROR] ${error.response?.status || "NET_FAIL"} ${url}`, error.response?.data);
    }

    // ⛔ Skip auth endpoints — prevents infinite 401 loop
    const isAuthEndpoint = SKIP_REFRESH_URLS.some((u) => url.includes(u));

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing || isHydrating()) {
        console.info("⏳ [Auth] Queuing request: refresh already in progress (cross-tab aware)");
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
      startHydrating();

      try {
        const res = await apiClient.get("auth/passport/");
        const newAccess = res.data?.data?.access;

        if (newAccess) {
          setAccessToken(newAccess);
          // ✅ CRITICAL: Update the original request's header BEFORE retrying
          originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
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
        stopHydrating();
      }
    }

    return Promise.reject(error);
  }
);

/* ===================================
   RE-EXPORT low-level storage
=================================== */
export { setAccessToken, getAccessToken, clearAccessToken, hasAccessToken, isHydrating };

/* ===================================
   🚫 DEPRECATED NO-OP STUBS
   ─────────────────────────────────
   Backend now manages ALL cookies via HttpOnly Set-Cookie headers.
   These exist only for backward-compatibility with existing imports.
   They intentionally do NOTHING — JS must never touch cookies.
=================================== */

