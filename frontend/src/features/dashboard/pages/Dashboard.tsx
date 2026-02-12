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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Welcome, <span className="text-primary">{user.first_name || user.username}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Accessing the <span className="text-white font-mono uppercase text-xs font-bold px-2 py-1 bg-white/5 rounded-lg border border-white/10">{user.role}</span> Control System
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-2xl text-primary text-sm font-bold">
            Cloud Sync: Active
          </div>
        </div>
      </div>

      {/* Role-Based Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="glass p-6 rounded-[2.5rem] space-y-4">
          <div className="w-12 h-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">
              {role === "student" ? "ACADEMIC PROGRESS" : "INSTITUTIONAL HUB"}
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {role === "student" ? "Active" : "3 Universities"}
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass p-6 rounded-[2.5rem] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">SECURITY STATUS</p>
            <p className="text-2xl font-bold text-green-400 mt-1 uppercase">Hardened</p>
          </div>
        </div>
      </div>

      {/* Informational Hero Card */}
      <div className="glass p-10 rounded-[3rem] premium-gradient border-none relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z" /></svg>
        </div>
        <div className="relative z-10 space-y-4 max-w-lg">
          <h2 className="text-4xl font-black text-white leading-tight">
            Seamless Academic Governance.
          </h2>
          <p className="text-blue-100/80 font-medium">
            AUIP Platform is the nexus of secure examinations and institutional data management. Every action is audited and protected by high-altitude encryption.
          </p>
          <div className="pt-4 flex gap-4">
            <button
              onClick={() => role === "admin" ? navigate("/admin/core-students") : null}
              className="px-8 py-3 bg-white text-blue-900 font-bold rounded-2xl shadow-xl hover:bg-white/90 transition-all"
            >
              Explore Hub
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`glass px-6 py-4 rounded-2xl shadow-2xl border-l-4 font-bold text-white transition-all duration-400
              ${t.leaving ? "opacity-0 translate-x-12 scale-95" : "opacity-100"}
              ${t.type === "success" ? "border-green-400" : ""}
              ${t.type === "error" ? "border-red-400" : ""}
              ${t.type === "info" ? "border-primary" : ""}
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
