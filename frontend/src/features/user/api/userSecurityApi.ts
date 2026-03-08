// ✅ FINAL — SYNCED WITH BACKEND
// src/features/user/api/userSecurityApi.ts

import { apiClient as api } from "../../auth/api/base";

/* -----------------------------------------------
   TYPES
----------------------------------------------- */

export interface SecurityOverview {
  last_login: string | null;
  two_factor_enabled: boolean;
  recent_devices: {
    ip_address: string;
    user_agent: string;
    last_active: string;
  }[];
}

export interface SessionRecord {
  id: number;
  jti: string;
  is_active: boolean;
  created_at: string;
  last_active: string;
  expires_at: string;
  ip_address: string;
  location: string;
  device: string;
  login_type: string;
  device_type?: string;
  os?: string;
  browser?: string;
}

export interface SecuritySettings {
  recent_sessions: SessionRecord[];
  two_factor_enabled: boolean;
}

/* -----------------------------------------------
   OVERVIEW — ProfileSecurityView
----------------------------------------------- */

export const getSecurityOverview = async (): Promise<SecurityOverview> => {
  const { data } = await api.get("profile/security/");
  return data?.data;
};

/* -----------------------------------------------
   SESSIONS — SettingsSecurityView
----------------------------------------------- */

export const getSessionSettings = async (): Promise<SecuritySettings> => {
  const { data } = await api.get("profile/settings/");
  return {
    two_factor_enabled: data?.data?.two_factor_enabled ?? false,
    recent_sessions: data?.data?.recent_sessions ?? [],
  };
};

export const logoutSession = async (sessionId: number) => {
  const { data } = await api.post("profile/settings/", {
    action: "logout",
    session_id: sessionId,
  });
  return data;
};

export const logoutAllSessions = async () => {
  const { data } = await api.post("profile/settings/", {
    action: "logout_all",
  });
  return data;
};

export const secureDevice = async () => {
  const { data } = await api.post("secure-device/");
  return data;
};
