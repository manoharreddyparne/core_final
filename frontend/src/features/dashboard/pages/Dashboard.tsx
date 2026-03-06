// src/features/dashboard/pages/Dashboard.tsx
// Generic hub — redirects to the correct role-specific dashboard.
// Also serves as the layout shell for Super Admins who have no separate dashboard page.

import { useEffect } from "react";
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/superadmin/institutions",
  INST_ADMIN: "/institution/dashboard",
  ADMIN: "/institution/dashboard",
  TEACHER: "/faculty-dashboard",
  FACULTY: "/faculty-dashboard",
  EDUCATOR: "/faculty-dashboard",
  SPOC: "/faculty-dashboard",
  STUDENT: "/student-dashboard",
};

const Dashboard = () => {
  const { user, bootstrapped, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    const normalizedRole = (role || user.role || "").toString().toUpperCase();
    const target = ROLE_ROUTES[normalizedRole];
    if (target) {
      navigate(target, { replace: true });
    }
  }, [user, bootstrapped, role, navigate]);

  // Show spinner while resolving
  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-sm font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Initialising workspace…
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
