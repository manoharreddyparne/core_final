// ✅ FINAL — Zero-trust Axios + helper utilities
// src/features/auth/api/base.ts

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
    : `http://localhost:8000/api/users/`; // ✅ Force localhost for cookie alignment

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ allow refresh cookie
});

/* ===================================
   🧾 AUTH HEADERS
=================================== */

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ===================================
   🍪 CLIENT-SIDE REFRESH HELPERS
   — NOT REAL REFRESH TOKEN STORAGE —
=================================== */

/** FE marker only — actual refresh is httpOnly + server managed */
export const getRefreshCookieName = () => "refresh_token_v2";

/**
 * ✅ Remove FE-side artifacts only
 * backend httpOnly cookie stays controlled from server
 */
export const clearRefreshTokenCookies = (): void => {
  document.cookie.split(";").forEach((cookie) => {
    const [raw] = cookie.split("=");
    const name = raw.trim();

    if (/refresh/i.test(name) || name === "refresh_token_present") {
      // Best-effort clear
      document.cookie = `${name}=; path=/; max-age=0`;
      try {
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0`;
      } catch {
        /* ignore */
      }
    }
  });
};

/**
 * ⚠️ FE SHOULD NOT SET REFRESH TOKEN.
 * But backend rotation endpoint sometimes returns refresh for legacy clients.
 *
 * We:
 *   ✅ DO NOT store refresh anywhere
 *   ✅ Set only presence marker → UX helper
 */
export const setRefreshCookieFromResponse = (res: any): void => {
  const refresh = res?.data?.data?.refresh;
  if (!refresh) return;

  // ✅ never store refresh in JS
  const maxAge = 30 * 24 * 3600; // 30 days
  document.cookie = `refresh_token_present=1; path=/; max-age=${maxAge}`;
};

/* ===================================
   RE-EXPORT low-level storage
=================================== */
export { setAccessToken, getAccessToken, clearAccessToken };
