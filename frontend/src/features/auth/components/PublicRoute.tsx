// ✅ FINAL — PublicRoute
// src/features/auth/components/PublicRoute.tsx

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider/AuthProvider";

import { LoadingScreen } from "../../../shared/components/LoadingScreen";

interface Props {
  children: ReactNode;
}

const PublicRoute = ({ children }: Props) => {
  const { user, bootstrapping } = useAuth();
  const { pathname } = useLocation();

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  // ✅ reset routes stay public
  const isResetPage =
    pathname.startsWith("/reset-password") ||
    pathname === "/reset-password-request" ||
    pathname.startsWith("/reset-password-confirm");

  // ✅ logged-in users should NOT see login/register
  if (user && !isResetPage) {
    const role = user.role?.toLowerCase?.() ?? "";

    let redirectTo = sessionStorage.getItem("auip_last_valid_path") || "/student-dashboard";

    if (role === "super_admin" && !sessionStorage.getItem("auip_last_valid_path")) {
      redirectTo = "/superadmin/dashboard";
    }
    else if ((role === "inst_admin" || role === "institution_admin") && !sessionStorage.getItem("auip_last_valid_path")) {
      redirectTo = "/institution/dashboard";
    }
    else if (role === "faculty" && !sessionStorage.getItem("auip_last_valid_path")) {
      redirectTo = "/faculty-dashboard";
    }

    // Basic safety check: if currently at login, and savedPath is login, fallback to dashboard
    if (redirectTo === "/login" || redirectTo === pathname) {
      if (role === 'student') redirectTo = "/student-dashboard";
      else if (role === 'super_admin') redirectTo = "/superadmin/dashboard";
      else redirectTo = "/institution/dashboard";
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
