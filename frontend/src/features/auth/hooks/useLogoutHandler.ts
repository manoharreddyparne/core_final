// ✅ FINAL, PROD-GRADE
// src/features/auth/hooks/useLogoutHandler.ts

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ====================================================
   🔗 API Imports
===================================================== */
import { logoutUser } from "../api/studentApi";
import {
  logoutSession as apiLogoutSession,
  logoutAllSessions as apiLogoutAllSessions,
} from "../api/sessionApi";

import { clearAccessToken } from "../utils/tokenStorage";
import type { User } from "../api/types";

/**
 * ✅ Unified logout handler
 * ---------------------------------------------------
 * Responsibilities:
 *  • Notify backend (token invalidation)
 *  • Nuke FE access token + client cookies
 *  • Clear user identity
 *  • Optional redirect
 */
export const useLogoutHandler = (setUser: (user: User | null) => void) => {
  const navigate = useNavigate();

  /**
   * 🧽 Clear FE memory state
   * Backend's POST /logout/ handles clearing the HttpOnly cookie.
   * JS must never touch cookies.
   */
  const clearFrontendTokens = useCallback(() => {
    clearAccessToken();
    // Aggressively clear JS-visible markers
    document.cookie = "auip_logged_in=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }, []);

  /**
   * 🚪 Logout current session/device
   */
  const logout = useCallback(
    async (skipNavigate: boolean = false, after?: () => void) => {
      try {
        await logoutUser();
      } catch (_) {
        // backend fail is soft — FE still clears
      }

      clearFrontendTokens();
      setUser(null);

      if (typeof after === "function") {
        after();
      }

      if (!skipNavigate) {
        navigate("/", { replace: true });
      }
    },
    [navigate, clearFrontendTokens, setUser]
  );

  /**
   * 🔥 Logout ALL devices/sessions
   * Used for security / stolen device
   */
  const logoutAllSessions = useCallback(
    async (after?: () => void) => {
      try {
        await apiLogoutAllSessions();
      } catch (_) {
        // still force memory wipe → zero-trust
      }

      await logout(true, after);
    },
    [logout]
  );

  /**
   * 🔒 Kill a remote session
   * Does NOT affect current FE identity
   */
  const logoutSession = useCallback(async (sessionId: number) => {
    try {
      await apiLogoutSession(sessionId);
    } catch (_) {
      // log but don't interrupt UX
      console.debug(`[logoutSession] failed id=${sessionId}`);
    }
  }, []);

  return {
    logout,
    logoutAllSessions,
    logoutSession,
    clearFrontendTokens,
  };
};
