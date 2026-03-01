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
import SuperAdminDashboard from "../../features/dashboard/pages/SuperAdminDashboard";

// Removed FacultyLogin import to centralize login
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
import AdminPlacementHub from "../../features/placement/pages/AdminPlacementHub";
import ProfessionalHub from "../../features/social/pages/ProfessionalHub";
import SupportDesk from "../../features/social/pages/SupportDesk";
import { ChatHub } from "../../features/social/pages/ChatHub";
import { DiscoveryHub } from "../../features/social/pages/DiscoveryHub";
import { NewsletterPage } from "../../features/governance/pages/NewsletterPage";
import GovernanceBrainDashboard from "../../features/intelligence/pages/GovernanceBrainDashboard";
import TPOAnalyticsDashboard from "../../features/intelligence/pages/TPOAnalyticsDashboard";
import MockTestHub from "../../features/quizzes/pages/MockTestHub";
import AcademicHub from "../../features/academic/pages/AcademicHub";
import CertificateVerify from "../../features/auth/pages/CertificateVerify";

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

  const roleNorm = role?.toLowerCase();
  const defaultLanding =
    roleNorm === "student"
      ? "/student-dashboard"
      : roleNorm === "super_admin"
        ? "/superadmin/dashboard"
        : (roleNorm === "inst_admin" || roleNorm === "institution_admin" || roleNorm === "admin")
          ? "/institution/dashboard"
          : (roleNorm === "faculty" || roleNorm === "teacher")
            ? "/faculty-dashboard"
            : "/"; // Safe fallback to landing

  // Use saved path if it looks valid for the user's role
  const landing = (savedPath && savedPath !== "/" && savedPath !== "/login") ? savedPath : defaultLanding;

  return (
    <Routes>
      {/* ------- REDIRECTS FOR LEGACY PATHS -------- */}
      <Route path="/admin/institutions" element={<Navigate to="/superadmin/institutions" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/superadmin/dashboard" replace />} />

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
        path="/auth/activate"
        element={
          <PublicRoute>
            <ActivatePage />
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
        path="/auth/register-university"
        element={
          <PublicRoute>
            <RegisterUniversity />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordRequestForm />
          </PublicRoute>
        }
      />

      <Route
        path="/auth/reset-password-confirm/:uid/:token"
        element={
          <PublicRoute>
            <ResetPasswordConfirmWrapper />
          </PublicRoute>
        }
      />

      {/* ─── PUBLIC: Certificate Verification Portal (no auth required) ─── */}
      <Route path="/verify-certificate/:type/:certId" element={<CertificateVerify />} />
      <Route path="/verify-certificate/:certId" element={<CertificateVerify />} />

      {/* ------- PROTECTED ------- */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* SHARED */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* STUDENT HUB */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <CoreStudentAdmin />
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
          path="/resume-studio"
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
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin"]}>
              <ProfessionalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discovery"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin"]}>
              <DiscoveryHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/newsletters"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin"]}>
              <NewsletterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat-hub"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin"]}>
              <ChatHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support-hub"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty", "institution_admin", "admin"]}>
              <SupportDesk />
            </ProtectedRoute>
          }
        />

        {/* GLOBAL HUB (SUPER ADMIN) */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminDashboard />
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

        {/* INSTITUTIONAL HUB (INST ADMIN ONLY) */}
        <Route
          path="/institution/dashboard"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <InstAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRoles={["faculty", "teacher"]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/institution/students"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <StudentRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/placements"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <AdminPlacementHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/faculty"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <FacultyRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/academic"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <AcademicHub />
            </ProtectedRoute>
          }
        />

        {/* GOVERNANCE BRAIN — Sprint 4 */}
        <Route
          path="/institution/brain"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin", "faculty"]}>
              <GovernanceBrainDashboard />
            </ProtectedRoute>
          }
        />

        {/* TPO ANALYTICS — Sprint 7 */}
        <Route
          path="/institution/analytics"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "inst_admin"]}>
              <TPOAnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* MOCK TEST HUB — Sprint 8 */}
        <Route
          path="/mock-tests"
          element={
            <ProtectedRoute allowedRoles={["student", "faculty"]}>
              <MockTestHub />
            </ProtectedRoute>
          }
        />

        {/* LEGACY REDIRECT */}
        <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />

        {/* PROFILE */}
        <Route path="/profile" element={<MyProfile />} />

        <Route
          path="/settings/security"
          element={
            <ProtectedRoute>
              <SecurityOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/sessions"
          element={
            <ProtectedRoute>
              <SessionManager />
            </ProtectedRoute>
          }
        />

        {/* SEARCH & DETAIL */}
        <Route
          path="/search/students"
          element={
            <ProtectedRoute allowedRoles={["faculty", "institution_admin", "admin"]}>
              <StudentProfileSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search/teachers"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin"]}>
              <FacultyAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search/profiles"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin"]}>
              <TeacherProfileSearch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/:id"
          element={
            <ProtectedRoute allowedRoles={["faculty", "institution_admin", "admin", "student"]}>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/:id"
          element={
            <ProtectedRoute allowedRoles={["institution_admin", "admin", "faculty"]}>
              <TeacherDetail />
            </ProtectedRoute>
          }
        />

        <Route path="/settings/change-password" element={<ChangePasswordForm />} />
        <Route path="/settings/device-management" element={<SessionManager />} />
      </Route>

      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/settings/password" element={<ChangePasswordForm />} />
      <Route path="/settings/devices" element={<SessionManager />} />

      {/* FALLBACK */}
      <Route path="/404" element={<PageNotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};
