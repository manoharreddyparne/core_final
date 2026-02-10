// src/features/dashboard/pages/Dashboard.tsx
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  leaving?: boolean;
}

const Dashboard = () => {
  const { user, logout, isLoading, role, bootstrapped } = useAuth();
  const navigate = useNavigate();

  // ---------------- Toast Management ----------------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = toastCounter.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  };

  // ---------------- Redirect if not authenticated ----------------
  useEffect(() => {
    if (!user && bootstrapped) {
      navigate("/login", { replace: true });
    }
  }, [user, bootstrapped, navigate]);

  if (!user || !bootstrapped) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white border rounded shadow-lg space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-center">Dashboard</h1>

      {/* User Info */}
      <div className="space-y-2 text-center">
        <p>
          Welcome, <strong>{user.first_name || user.username}</strong>!
        </p>
        <p className="text-gray-600">{user.email}</p>
        <p className="text-sm text-gray-500">Role: {role.toUpperCase()}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {role === "admin" && (
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
            onClick={() => navigate("/admin-dashboard")}
          >
            Admin Panel
          </button>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-5 left-1/2 transform -translate-x-1/2 flex flex-col gap-3 z-50 w-[90%] max-w-3xl">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`relative px-6 py-4 rounded-3xl shadow-lg font-bold text-center text-white transition-all duration-200
              ${t.leaving ? "opacity-0 -translate-y-6 scale-95" : "opacity-100"}
              ${t.type === "success" ? "bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400" : ""}
              ${t.type === "error" ? "bg-gradient-to-r from-red-500 via-pink-500 to-purple-500" : ""}
              ${t.type === "info" ? "bg-blue-500" : ""}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
