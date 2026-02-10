// ✅ FINAL — PRODUCTION-READY
// src/app/routes/AppRoutes.tsx

import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../../features/auth/pages/Login";
import Dashboard from "../../features/dashboard/pages/Dashboard";
import ActivatePage from "../../features/auth/pages/Activate";
import CoreStudentAdmin from "../../features/dashboard/pages/CoreStudentAdmin";
import { AppLayout } from "../../features/auth/layouts/AppLayout";

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

  const landing =
    user?.role?.toLowerCase() === "admin"
      ? "/admin-dashboard"
      : "/student-dashboard";

  return (
    <Routes>
      {/* ------- PUBLIC ------- */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
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
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route path="/profile" element={<MyProfile />} />

        {/* SECURITY */}
        <Route path="/security" element={<SecurityOverview />} />
        <Route path="/security/sessions" element={<SecuritySessions />} />

        {/* USER ADMIN SEARCH */}
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={["admin", "inst_admin", "super_admin"]}>
              <StudentProfileSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/core-students"
          element={
            <ProtectedRoute allowedRoles={["inst_admin", "super_admin"]}>
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

      {/* ------- DEFAULT LANDING -------- */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={landing} replace />
          ) : bootstrapping ? (
            // Wait for bootstrap before redirecting to login
            <div className="flex h-screen items-center justify-center">
              <p className="text-gray-500">Checking session...</p>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ------- CATCH-ALL ------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
