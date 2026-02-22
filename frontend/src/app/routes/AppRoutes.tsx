// ✅ FINAL — PRODUCTION-READY
// src/app/routes/AppRoutes.tsx

import { Routes, Route, Navigate } from "react-router-dom";

import StudentLogin from "../../features/auth/pages/StudentLogin";
import SuperAdminLogin from "../../features/auth/pages/SuperAdminLogin";
import StudentRegistration from "../../features/auth/pages/StudentRegistration";
import Dashboard from "../../features/dashboard/pages/Dashboard";
import InstAdminDashboard from "../../features/dashboard/pages/InstAdminDashboard";
import FacultyDashboard from "../../features/dashboard/pages/FacultyDashboard";
import ActivatePage from "../../features/auth/pages/Activate";
import InstAdminLogin from "../../features/auth/pages/InstAdminLogin";
import InstAdminActivate from "../../features/auth/pages/InstAdminActivate";
import FacultyLogin from "../../features/auth/pages/FacultyLogin";
import AdminRecovery from "../../features/auth/pages/AdminRecovery";
import { PageNotFound } from "../../components/PageNotFound";
import CoreStudentAdmin from "../../features/dashboard/pages/CoreStudentAdmin";
import InstitutionAdmin from "../../features/dashboard/pages/InstitutionAdmin";
import FacultyAdmin from "../../features/dashboard/pages/FacultyAdmin";
import { RegisterUniversity } from "../../features/auth/pages/RegisterUniversity";
import { LandingPage } from "../../features/dashboard/pages/LandingPage";
import { AppLayout } from "../../features/auth/layouts/AppLayout";
import { StudentRegistry } from "../../features/institution/pages/StudentRegistry";
import { FacultyRegistry } from "../../features/institution/pages/FacultyRegistry";
import IntelligenceDashboard from "../../features/intelligence/pages/IntelligenceDashboard";
import SmartResumeStudio from "../../features/resumes/pages/SmartResumeStudio";
import PlacementHub from "../../features/placement/pages/PlacementHub";
import ProfessionalHub from "../../features/social/pages/ProfessionalHub";
import SupportDesk from "../../features/social/pages/SupportDesk";
import { ChatHub } from "../../features/social/pages/ChatHub";
import { DiscoveryHub } from "../../features/social/pages/DiscoveryHub";
import { NewsletterPage } from "../../features/governance/pages/NewsletterPage";

import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import PublicRoute from "../../features/auth/components/PublicRoute";

import ChangePasswordForm from "../../features/auth/components/ChangePassword";
import { ResetPasswordRequestForm } from "../../features/auth/components/ResetPasswordRequestForm";
import { ResetPasswordConfirmWrapper } from "../../features/auth/components/ResetPasswordConfirmWrapper";

import { SessionManager } from "../../features/auth/components/SessionManager";

import MyProfile from "../../features/user/pages/MyProfile";
import EditProfile from "../../features/user/pages/EditProfile";

// ✅ security pages
import SecurityOverview from "../../features/user/pages/SecurityOverview";
import SecuritySessions from "../../features/user/pages/SecuritySessions";

// ✅ admin detail pages
import StudentDetail from "../../features/user/pages/StudentDetail";
import TeacherDetail from "../../features/user/pages/TeacherDetail";

// ✅ search pages
import StudentProfileSearch from "../../features/user/pages/StudentProfileSearch";
import TeacherProfileSearch from "../../features/user/pages/TeacherProfileSearch";

import { useAuth } from "../../features/auth/context/AuthProvider/AuthProvider";

export const AppRoutes = () => {
  const { user, bootstrapping } = useAuth();

  const role = user?.role?.toLowerCase();

  // Persistence logic: Check if we have a saved path to restore
  const savedPath = sessionStorage.getItem("auip_last_valid_path");

  const defaultLanding =
    role === "student"
      ? "/student-dashboard"
      : role === "super_admin"
        ? "/superadmin/dashboard"
        : (role === "inst_admin" || role === "institution_admin")
          ? "/institution/dashboard"
          : role === "faculty"
            ? "/faculty-dashboard"
            : "/institution/dashboard";

  // Use saved path if it looks valid for the user's role
  const landing = (savedPath && savedPath !== "/" && savedPath !== "/login") ? savedPath : defaultLanding;

  return (
    <Routes>
      {/* ------- DEFAULT LANDING -------- */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={landing} replace />
          ) : (
            <LandingPage />
          )
        }
      />

      {/* ------- PUBLIC ------- */}
      <Route
        path="/login"
        element={<Navigate to="/auth/student/login" replace />}
      />

      <Route
        path="/auth/student/login"
        element={
          <PublicRoute>
            <StudentLogin />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/secure-gateway"
        element={
          <PublicRoute>
            <SuperAdminLogin />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/infrastructure-status"
        element={
          <PublicRoute>
            <AdminRecovery />
          </PublicRoute>
        }
      />

      {/* ─── INSTITUTIONAL ADMIN ─── */}
      <Route
        path="/auth/inst-admin/login"
        element={
          <PublicRoute>
            <InstAdminLogin />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/inst-admin/activate"
        element={
          <PublicRoute>
            <InstAdminActivate />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/faculty/login"
        element={
          <PublicRoute>
            <FacultyLogin />
          </PublicRoute>
        }
      />

      {/* ─── ACTIVATION (General) ─── */}
      <Route
        path="/auth/activate"
        element={
          <PublicRoute>
            <ActivatePage />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/student/register"
        element={
          <PublicRoute>
            <StudentRegistration />
          </PublicRoute>
        }
      />

      <Route
        path="/activate-request"
        element={<Navigate to="/auth/student/register" replace />}
      />

      <Route
        path="/register-university"
        element={
          <PublicRoute>
            <RegisterUniversity />
          </PublicRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordRequestForm />
          </PublicRoute>
        }
      />

      <Route
        path="/reset-password-confirm/:token"
        element={
          <PublicRoute>
            <ResetPasswordConfirmWrapper />
          </PublicRoute>
        }
      />

      {/* ------- AUTHENTICATED LAYOUT ------- */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* DASHBOARDS */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-intelligence"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <IntelligenceDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume-studio/:id?"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <SmartResumeStudio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/placement-hub"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PlacementHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional-hub"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin", "super_admin"]}>
              <ProfessionalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discovery"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin", "super_admin"]}>
              <DiscoveryHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat-hub"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin", "super_admin"]}>
              <ChatHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support-hub"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin", "super_admin"]}>
              <SupportDesk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/newsletters"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <NewsletterPage />
            </ProtectedRoute>
          }
        />
        {/* --- ADMINISTRATIVE DOMAINS (SEGREGATED) --- */}

        {/* GLOBAL GOVERNANCE (SUPER ADMIN) */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/institutions"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <InstitutionAdmin />
            </ProtectedRoute>
          }
        />

        {/* INSTITUTIONAL HUB (INST ADMIN & PROXY SUPER ADMIN) */}
        <Route
          path="/institution/dashboard"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "super_admin"]}>
              <InstAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRoles={["faculty"]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institution/students"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "super_admin"]}>
              <StudentRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/faculty"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "super_admin"]}>
              <FacultyRegistry />
            </ProtectedRoute>
          }
        />

        {/* LEGACY REDIRECT */}
        <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />

        {/* PROFILE */}
        <Route path="/profile" element={<MyProfile />} />

        {/* SECURITY */}
        <Route path="/security" element={<SecurityOverview />} />
        <Route path="/security/sessions" element={<SecuritySessions />} />

        {/* USER ADMIN SEARCH */}
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={["admin", "institution_admin", "super_admin"]}>
              <StudentProfileSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/core-students"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "super_admin"]}>
              <CoreStudentAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TeacherProfileSearch />
            </ProtectedRoute>
          }
        />

        {/* USER ADMIN DETAIL */}
        <Route
          path="/admin/students/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TeacherDetail />
            </ProtectedRoute>
          }
        />

        {/* ACCOUNT MGMT */}
        <Route path="/change-password" element={<ChangePasswordForm />} />
        <Route path="/sessions" element={<SessionManager />} />

        {/* SETTINGS (Nested) */}
        <Route path="/settings">
          <Route index element={<Navigate to="sessions" replace />} />
          <Route path="profile" element={<EditProfile />} />
          <Route path="change-password" element={<ChangePasswordForm />} />
          <Route path="sessions" element={<SessionManager />} />
        </Route>
      </Route>


      {/* ------- CATCH-ALL ------- */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};
