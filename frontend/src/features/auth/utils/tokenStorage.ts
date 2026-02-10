/**
 * ============================================
 * 🔐 SECURE TOKEN STORAGE — ACCESS ONLY
 * ============================================
 *
 * - Access token = ephemeral, memory-only.
 * - Optional sessionStorage mirror = smoother refresh/tab reload.
 * - Refresh = NEVER stored here (httpOnly cookie via backend).
 */

let memoryAccessToken: string | null = null;
const SESSION_KEY = "secure_memory_access_token";

/** ✅ set token (memory + ephemeral fallback) */
export const setAccessToken = (token: string): void => {
  if (!token || typeof token !== "string") return;
  memoryAccessToken = token;
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    /* ignore storage errors */
  }
};

/** ✅ get token (memory first → fallback) */
export const getAccessToken = (): string | null => {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) {
      memoryAccessToken = token; // hydrate
      return token;
    }
  } catch {
    /* ignore */
  }
  return null;
};

/** ❌ nuke all access tokens */
export const clearAccessToken = (): void => {
  memoryAccessToken = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

/** ⛳ quick boolean */
export const hasAccessToken = (): boolean => {
  return !!getAccessToken();
};
