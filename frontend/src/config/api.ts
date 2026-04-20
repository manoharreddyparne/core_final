/**
 * ASEP Centralized API Configuration
 * Single source of truth for all API base URLs.
 * Every feature module imports from here instead of defining its own.
 */
const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const API_CONFIG = {
  BASE,
  API: `${BASE}/api/`,
  USERS: `${BASE}/api/users/`,
  INSTITUTION: `${BASE}/api/institution/`,
  COURSES: `${BASE}/api/courses/`,
  WS: BASE.replace(/^http/, 'ws'),
} as const;
