// src/features/auth/components/AuthLoading.tsx
import React from "react";

/**
 * AuthLoading
 * ----------------
 * Simple full-screen loader to display while authentication
 * is initializing (checking refresh token, validating session, etc.).
 * Can be used in AuthProvider or any protected route.
 */
const AuthLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="loader mb-4"></div>
      <p className="text-gray-700 text-lg">Loading authentication...</p>

      {/* Optional: simple CSS spinner */}
      <style>
        {`
          .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3b82f6; /* Tailwind blue-500 */
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AuthLoading;
