/* ============================================
   📦 GENERIC API WRAPPER
   — All backend responses conform to this shape
============================================ */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  stage?: string; // ✅ Top-level stage indicator
}

/* ============================================
   👤 USER MODEL (SSOT)
============================================ */
export interface User {
  id: number;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "TEACHER" | "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "FACULTY";

  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar?: string;

  first_time_login?: boolean;
  need_password_reset?: boolean;
}

/* ============================================
   PERSONA MODELS
============================================ */
export interface StudentProfile {
  user: User;
  roll_number: string;
  admission_year?: string;
  batch?: string;
}

export interface TeacherProfile {
  user: User;
  email?: string;
  department?: string;
}

/* ============================================
   🔐 AUTH RESPONSE
============================================ */
export interface AuthResponse {
  success: boolean;
  message?: string;

  access?: string;
  refresh?: string; // rarely used; backend manages cookie
  user?: User | null;

  require_otp?: boolean;
  requires_otp?: boolean;
  email_hint?: string;
  user_id?: number;

  cooldown?: number;
  locked_until?: string | null;
  stage?: string; // ✅ State machine stage (e.g. SECURE_SESSION, OTP_CHALLENGE)
}

/* ============================================
   🔑 CHANGE PASSWORD RESPONSE
============================================ */
export interface PasswordChangeResponse {
  success: boolean;
  message?: string;
  access?: string;
  user?: User | null;
}

/* ============================================
   ✉️ RESET PASSWORD — REQUEST
   (/reset-password-request/)
============================================ */
export interface ResetPasswordRequestDetail {
  success: boolean;
  message?: string;

  cooldown?: number;
  dev_token?: string;
  locked_until?: number;
  ip?: string;

  errors?: Record<string, any>;
  field_errors?: Record<string, string[]>;
}

/* ============================================
   🔒 RESET PASSWORD — CONFIRM
   (/reset-password-confirm/)
============================================ */
export interface ResetPasswordConfirmResponse {
  success?: boolean;
  reset_success?: boolean;
  message?: string;

  access?: string;
  refresh?: string;
  user?: User | null;
}

/* ============================================
   💻 SESSION ITEM
============================================ */
export interface Session {
  id: number;
  jti: string;
  is_active: boolean;
  created_at: string;
  last_active: string;
  expires_at: string | null;

  ip_address: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  } | null;

  device: string;
  device_type?: string;
  os?: string;
  browser?: string;
  user_agent?: string;

  is_current?: boolean; // frontend derived
  latitude?: number | null;
  longitude?: number | null;
}

/* ============================================
   🔌 SESSION WS EVENT PAYLOAD
============================================ */
export interface SessionUpdateEvent {
  action: "force_logout" | "new_session" | "rotate" | "logout";
  session_id: number;
}

/* ============================================
   🔐 SECURE DEVICE RESPONSE
   Matches /token/secure/
============================================ */
export interface SecureDeviceResponse {
  success?: boolean;
  message?: string;

  access?: string;
  refresh?: string;
  user?: User | null;
}

/* ============================================
   🔁 TOKEN REFRESH TYPES
============================================ */
export interface LoginResponse {
  access: string;
}

export interface RefreshResponse {
  access: string;
}
