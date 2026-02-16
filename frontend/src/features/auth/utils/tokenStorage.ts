/**
 * ============================================
 * 🔐 SECURE TOKEN STORAGE — ACCESS ONLY
 * ============================================
 *
 * - Access token = ephemeral, memory-only.
 * - Refresh = NEVER stored here (httpOnly cookie via backend).
 */

let memoryAccessToken: string | null = null;
let hydrationInProgress = false;
const AUTH_CHANNEL = "auip_auth_bus";

/** 📡 Tab Sync Channel */
const authChannel = typeof window !== "undefined" ? new BroadcastChannel(AUTH_CHANNEL) : null;

const subscribers: ((token: string | null) => void)[] = [];

/** ✅ Listen for Sync Messages */
if (authChannel) {
  authChannel.onmessage = (event) => {
    const { type, token } = event.data;
    if (type === "SYNC_TOKEN") {
      console.debug("🔄 [Auth] Token synced from another tab");
      memoryAccessToken = token;
      hydrationInProgress = false; // Release lock if synced
      subscribers.forEach(cb => cb(token));
    } else if (type === "CLEAR_TOKEN") {
      console.debug("🧹 [Auth] Token cleared by another tab");
      memoryAccessToken = null;
      subscribers.forEach(cb => cb(null));
    } else if (type === "HYDRATION_START") {
      console.debug("🔒 [Auth] Hydration lock acquired by another tab");
      hydrationInProgress = true;
    } else if (type === "HYDRATION_END") {
      console.debug("🔓 [Auth] Hydration lock released by another tab");
      hydrationInProgress = false;
    }
  };
}

/** ✅ set token (memory only + broadcast) */
export const setAccessToken = (token: string): void => {
  if (!token || typeof token !== "string") return;
  memoryAccessToken = token;
  authChannel?.postMessage({ type: "SYNC_TOKEN", token });
};

/** ✅ get token (memory only) */
export const getAccessToken = (): string | null => {
  return memoryAccessToken;
};

/** 🔒 Hydration Coordination */
export const startHydrating = () => {
  hydrationInProgress = true;
  authChannel?.postMessage({ type: "HYDRATION_START" });
};

export const stopHydrating = () => {
  hydrationInProgress = false;
  authChannel?.postMessage({ type: "HYDRATION_END" });
};

export const isHydrating = () => hydrationInProgress;

export const subscribeToTokenUpdates = (cb: (token: string | null) => void) => {
  subscribers.push(cb);
  return () => {
    const index = subscribers.indexOf(cb);
    if (index > -1) subscribers.splice(index, 1);
  };
};

/** ❌ nuke all access tokens */
export const clearAccessToken = (): void => {
  if (memoryAccessToken === null) return;

  memoryAccessToken = null;
  authChannel?.postMessage({ type: "CLEAR_TOKEN" });
};

/** ⛳ quick boolean */
export const hasAccessToken = (): boolean => {
  return !!getAccessToken();
};
