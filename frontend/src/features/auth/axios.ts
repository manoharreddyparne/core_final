// ✅ FINAL — enterprise-grade
// src/features/auth/axios.ts

import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosInstance,
  AxiosHeaders,
} from "axios";

import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../auth/utils/tokenStorage";

import { bootstrapSession } from "../auth/api/bootstrapApi";

/* --------------------------------------------------
   🌐 BASE URL
-------------------------------------------------- */
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/users/`
    : "http://localhost:8000/api/users/";

/* --------------------------------------------------
   ✅ PRIMARY AXIOS — handles bootstrap + rotation
-------------------------------------------------- */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* --------------------------------------------------
   🔓 PUBLIC ENDPOINTS
-------------------------------------------------- */
const PUBLIC_ENDPOINTS = [
  "/login/",
  "/reset-password-request/",
  "/reset-password-confirm/",
  "/admin/login/",
  "/admin/verify-otp/",
];

/* --------------------------------------------------
   🔁 TOKEN REFRESH QUEUE
-------------------------------------------------- */
let isRefreshing = false;
let refreshQueue: ((t: string | null) => void)[] = [];

/* --------------------------------------------------
   🧾 HEADER UTILITY (safe type casting)
-------------------------------------------------- */
function setAuthHeader<T extends AxiosRequestConfig | InternalAxiosRequestConfig>(
  config: T,
  token?: string
): T {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  (config.headers as AxiosHeaders).set(
    "Authorization",
    token ? `Bearer ${token}` : ""
  );

  return config;
}

/* --------------------------------------------------
   🚀 REQUEST INTERCEPTOR
-------------------------------------------------- */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  const isPublic = PUBLIC_ENDPOINTS.some((p) => config.url?.includes(p));
  if (!token || isPublic) return config;

  return setAuthHeader(config, token);
});

/* --------------------------------------------------
   🔁 RESPONSE INTERCEPTOR
-------------------------------------------------- */
api.interceptors.response.use(
  (res: AxiosResponse) => res,

  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!original) return Promise.reject(err);

    const url = original.url || "";
    const isPublic = PUBLIC_ENDPOINTS.some((p) => url.includes(p));
    if (isPublic) return Promise.reject(err);

    /* ------------------------------
        🔐 401 → bootstrap session
    ------------------------------- */
    if (err.response?.status === 401 && !original._retry) {
      const hint =
        getAccessToken() || document.cookie.includes("refresh_token_present");

      if (!hint) return Promise.reject(err);

      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) resolve(api(setAuthHeader(original, token)));
            else reject(err);
          });
        });
      }

      isRefreshing = true;

      try {
        const r = await bootstrapSession();
        const access = r?.access ?? null;

        if (!access) throw new Error("bootstrapSession did not return token");

        setAccessToken(access);

        refreshQueue.forEach((cb) => cb(access));
        refreshQueue = [];

        return api(setAuthHeader(original, access));
      } catch (e) {
        refreshQueue.forEach((cb) => cb(null));
        refreshQueue = [];

        clearAccessToken();
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    /* ------------------------------
        🧩 Normalized errors
    ------------------------------- */
    if (err.response?.data) {
      const d: any = err.response.data;
      return Promise.reject({
        response: {
          data: {
            message:
              d.message ||
              d.detail ||
              (typeof d === "string" ? d : "Request failed"),
            cooldown: Number(d.cooldown ?? 0),
            dev_token: d.dev_token,
            field_errors: d.field_errors,
            ip: d.ip,
          },
        },
      });
    }

    return Promise.reject(err);
  }
);

/* --------------------------------------------------
   ⚡ SIMPLE ACCESSORS
-------------------------------------------------- */
export const apiGet = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const res = await api.get<T>(url, config);
  return res.data;
};

export const apiPost = async <T = any, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
  const res = await api.post<T>(url, data, config);
  return res.data;
};

export const apiPut = async <T = any, D = any>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
  const res = await api.put<T>(url, data, config);
  return res.data;
};

export const apiDelete = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const res = await api.delete<T>(url, config);
  return res.data;
};

/* --------------------------------------------------
   ✅ createApi — Thin, override-friendly instance
-------------------------------------------------- */
export default function createApi(
  getToken?: () => string | null,
  refreshAccessOnly?: () => Promise<boolean>,
  logout?: () => void
): AxiosInstance {
  const inst = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });

  inst.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) {
      config.headers = config.headers ?? new AxiosHeaders();
      (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  inst.interceptors.response.use(
    (ok) => ok,
    async (err) => {
      const cfg = err?.config as any;
      const status = err?.response?.status;

      if (status === 401 && refreshAccessOnly && !cfg?._retry) {
        cfg._retry = true;

        const ok = await refreshAccessOnly();
        if (ok) return inst(cfg);

        clearAccessToken();
        logout?.();
      }

      return Promise.reject(err);
    }
  );

  return inst;
}
