// ✅ src/features/auth/utils/jwtHelpers.ts
import { jwtDecode } from "jwt-decode";

/**
 * ===========================================
 * JWT HELPERS — Zero-trust
 * ===========================================
 */

export interface DecodedJWT {
  user_id?: number;
  username?: string;
  role?: string;
  exp?: number; // expiration (sec)
  iat?: number;
  [k: string]: any;
}

/**
 * ✅ Safe decode — never throws
 */
export const decodeToken = <T = DecodedJWT>(
  token?: string | null
): T | null => {
  if (!token || typeof token !== "string" || token.trim().length < 10) {
    return null;
  }

  try {
    return jwtDecode<T>(token);
  } catch {
    return null;
  }
};

/**
 * ✅ Check expiration with buffer
 * @param bufferSeconds: early invalidation
 */
export const isTokenExpired = (
  token?: string | null,
  bufferSeconds = 30
): boolean => {
  const decoded = decodeToken<DecodedJWT>(token);
  if (!decoded?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp <= now + bufferSeconds;
};

/**
 * ✅ Seconds until expiry (0 if expired)
 */
export const getTokenRemainingTime = (
  token?: string | null
): number => {
  const decoded = decodeToken<DecodedJWT>(token);
  if (!decoded?.exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(decoded.exp - now, 0);
};

/**
 * ✅ Extract user info, if valid
 */
export const getUserFromToken = (
  token?: string | null
): DecodedJWT | null => {
  if (!token || isTokenExpired(token)) return null;
  return decodeToken<DecodedJWT>(token);
};
