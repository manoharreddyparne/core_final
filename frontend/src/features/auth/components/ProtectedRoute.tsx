// ✅ FINAL — Zero-trust + Bootstrap-aware ProtectedRoute
// src/features/auth/components/ProtectedRoute.tsx

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthProvider/AuthProvider";

interface Props {
  children: ReactNode;
  allowedRoles?: ("student" | "admin" | "inst_admin" | "institution_admin" | "super_admin" | "faculty" | "teacher")[];
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0b] text-white">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
        
        <div className="text-center space-y-6 animate-in fade-in duration-700">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="w-24 h-24 border-4 border-white/5 rounded-full flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin" />
               <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-3xl border border-white/10">
                  <div className="w-2 h-8 bg-primary rounded-full animate-pulse" />
               </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-primary font-black uppercase tracking-[0.4em] animate-pulse">
              Initializing Session...
            </p>
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
              Securing Neural Channels // Verify Protocol
            </p>
          </div>
        </div>
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
      // Normalize institution_admin <-> inst_admin <-> admin
      if (allowed === "inst_admin" || allowed === "institution_admin" || allowed === "admin") {
        return userRole === "inst_admin" || userRole === "institution_admin" || userRole === "admin";
      }
      // Normalize faculty <-> teacher
      if (allowed === "faculty" || allowed === "teacher") {
        return userRole === "faculty" || userRole === "teacher";
      }
      return userRole === allowed;
    })
  ) {
    // 🔀 Smooth Redirect instead of 403 screen
    const role = user.role?.toLowerCase();
    const dashboard =
      role === "student" ? "/student-dashboard" :
        (role === "inst_admin" || role === "institution_admin" || role === "admin") ? "/institution/dashboard" :
          role === "super_admin" ? "/superadmin/dashboard" :
            ((role as any) === "faculty" || (role as any) === "teacher") ? "/faculty-dashboard" : "/";

    return <Navigate to={dashboard} replace />;
  }

  /**
   * ✅ 4) User valid → render protected content
   */
  return <>{children}</>;
};

export default ProtectedRoute;
