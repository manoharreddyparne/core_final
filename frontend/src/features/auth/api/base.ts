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

export const CORE_API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/`
    : `http://localhost:8000/api/`;

export const INST_API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/institution/`
    : `http://localhost:8000/api/institution/`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const instApiClient = axios.create({
  baseURL: INST_API_BASE_URL,
  withCredentials: true,
});

export const coreApiClient = axios.create({
  baseURL: CORE_API_BASE_URL,
  withCredentials: true,
});

/* ===================================
   🧾 AUTH HEADERS
=================================== */

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};


/* ===================================
   🔄 REFRESH QUEUE LOGIC
=================================== */

// URLs that should NOT trigger a refresh loop
const SKIP_REFRESH_URLS = [
  "auth/login/",
  "auth/v2/student/login/",
  "auth/v2/faculty/login/",
  "auth/inst-admin/login/",
  "admin/login/",
  "admin/verify-otp/",
  "auth/passport/",
  "auth/token/secure/"
];

// Queue state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

import { AxiosInstance } from "axios";

// ✅ Shared Interceptor Logic
export const attachInterceptors = (client: AxiosInstance) => {
  // Request Interceptor
  client.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  client.interceptors.response.use(
    (response) => {
      const newToken = response.headers["x-new-access-token"];
      if (newToken) {
        console.debug("[Auth] 🔄 Silent rotation detected via header");
        setAccessToken(newToken);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Update token if new one came in error headers (rare but possible)
      const newToken = error.response?.headers["x-new-access-token"];
      if (newToken) setAccessToken(newToken);

      // Prevent infinite loops / crashes if originalRequest is missing
      if (!originalRequest) return Promise.reject(error);

      const url = originalRequest.url || "";

      // Skip auth endpoints
      const isAuthEndpoint = SKIP_REFRESH_URLS.some((u) => url.includes(u));

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !isAuthEndpoint
      ) {
        if (isRefreshing || isHydrating()) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers["Authorization"] = "Bearer " + token;
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;
        startHydrating();

        try {
          // Attempt refresh using global axios instance (fresh config)
          // We target the Passport endpoint which validates the HTTP-only cookie
          const res = await axios.get(
            `${API_BASE_URL}auth/passport/`,
            { withCredentials: true }
          );

          const newAccess = res.data?.data?.access; // Adjust based on actual response structure

          if (newAccess) {
            setAccessToken(newAccess);
            originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            return client(originalRequest);
          }

          throw new Error("No access token returned from passport");
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
};

// Listen for token updates from other tabs
subscribeToTokenUpdates((token) => {
  if (token) {
    processQueue(null, token);
  }
});

// Apply to all clients
attachInterceptors(apiClient);
attachInterceptors(instApiClient);
attachInterceptors(coreApiClient);

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

