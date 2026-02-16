// ✅ FINAL — session management API (hardened)
// src/features/auth/api/sessionApi.ts

import {
  apiClient,
  authHeaders,
} from "./base";

import type { ApiResponse } from "./types";

/* ============================================
   🗂  Types
============================================ */
export interface Session {
  id: number;
  device: string;
  ip: string;
  user_agent: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

export type SessionUpdateEvent = {
  action: "force_logout" | "new_session" | "rotate" | "logout";
  session_id: number;
};


/* ============================================
   🔍 GET — Fetch active sessions
============================================ */
export const fetchSessions = async (): Promise<Session[]> => {
  try {
    const res = await apiClient.get<ApiResponse<Session[]>>(
      "/sessions/",
      { headers: authHeaders() }
    );

    return res?.data?.data ?? [];
  } catch (err: any) {
    console.error("❌ [sessionApi] fetchSessions failed:", err);

    throw new Error(
      err?.response?.data?.detail ??
      err?.response?.data?.message ??
      "Failed to fetch sessions"
    );
  }
};


/* ============================================
   🚪 POST — Logout a single session
============================================ */
export const logoutSession = async (
  sessionId: number
): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await apiClient.post<ApiResponse>(
      `/sessions/${sessionId}/logout/`,
      {},
      { headers: authHeaders() }
    );

    return {
      success: res?.data?.success ?? true,
      message: res?.data?.message ?? "Session logged out",
    };
  } catch (err: any) {
    console.error(`❌ [sessionApi] logoutSession(${sessionId}) failed:`, err);

    throw new Error(
      err?.response?.data?.detail ??
      err?.response?.data?.message ??
      `Failed to logout session ${sessionId}`
    );
  }
};


/* ============================================
   🧨 POST — Logout all sessions
============================================ */
export const logoutAllSessions = async (): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const res = await apiClient.post<ApiResponse>(
      "/sessions/logout-all/",
      {},
      { headers: authHeaders() }
    );

    return {
      success: res?.data?.success ?? true,
      message: res?.data?.message ?? "All sessions logged out",
    };
  } catch (err: any) {
    console.error("❌ [sessionApi] logoutAllSessions failed:", err);

    throw new Error(
      err?.response?.data?.detail ??
      err?.response?.data?.message ??
      "Failed to logout all sessions"
    );
  }
};
