// ✅ FINAL — Zero-trust + Bootstrap-aware ProtectedRoute
// src/features/auth/components/ProtectedRoute.tsx

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthProvider/AuthProvider";

interface Props {
  children: ReactNode;
  allowedRoles?: ("student" | "admin" | "inst_admin" | "super_admin")[];
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
    !allowedRoles.includes(user.role?.toLowerCase() as any)
  ) {
    const fallback =
      user.role?.toLowerCase() === "student"
        ? "/student-dashboard"
        : "/admin-dashboard";

    return <Navigate to={fallback} replace />;
  }

  /**
   * ✅ 4) User valid → render protected content
   */
  return <>{children}</>;
};

export default ProtectedRoute;
