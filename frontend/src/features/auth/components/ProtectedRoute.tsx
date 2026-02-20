// ✅ FINAL — Zero-trust + Bootstrap-aware ProtectedRoute
// src/features/auth/components/ProtectedRoute.tsx

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthProvider/AuthProvider";

interface Props {
  children: ReactNode;
  allowedRoles?: ("student" | "admin" | "inst_admin" | "institution_admin" | "super_admin" | "faculty")[];
}

/**
 * ✅ ProtectedRoute
 * -----------------------
 * - Waits for bootstrap/restore
 * - Blocks unauth’d users
 * - Supports RBAC (optional)
 * - Minimal FE logic: trust backend
 */
const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const {
    user,
    bootstrapping,
    bootstrapped,
    restoreSession,   // optional hook, already triggered internally
  } = useAuth();

  /**
   * ✅ 1) Still bootstrapping → show placeholder
   * Prevents flicker → avoids redirecting before backend restore.
   */
  if (bootstrapping) {
    return (
      <div className="w-full flex items-center justify-center py-16 text-gray-500">
        Initializing session…
      </div>
    );
  }

  /**
   * ✅ 2) Bootstrap finished but NO user → redirect to login
   */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /**
   * ✅ 3) RBAC — block mismatched roles
   */
  if (
    allowedRoles &&
    !allowedRoles.some((allowed) => {
      const userRole = user.role?.toLowerCase();
      // Normalize institution_admin <-> inst_admin
      if (allowed === "inst_admin" || allowed === "institution_admin") {
        return userRole === "inst_admin" || userRole === "institution_admin";
      }
      return userRole === allowed;
    })
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] text-white">
        <h1 className="text-4xl font-black text-red-500 mb-4">403 FORBIDDEN</h1>
        <p className="text-gray-400">Access Restricted: Your role does not have permission to view this resource.</p>
        <button
          onClick={() => window.history.back()}
          className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-bold uppercase tracking-widest text-xs"
        >
          Go Back
        </button>
      </div>
    );
  }

  /**
   * ✅ 4) User valid → render protected content
   */
  return <>{children}</>;
};

export default ProtectedRoute;
