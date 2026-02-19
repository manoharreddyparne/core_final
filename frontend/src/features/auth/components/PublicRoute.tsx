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

    let redirectTo = "/student-dashboard";

    if (role === "super_admin") {
      redirectTo = "/superadmin/dashboard";
    }
    else if (role === "inst_admin" || role === "institution_admin") {
      redirectTo = "/institution/dashboard";
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
