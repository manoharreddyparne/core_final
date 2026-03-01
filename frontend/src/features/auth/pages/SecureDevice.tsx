// src/features/auth/pages/SecureDevice.tsx
// Full production "Trust this device" page — shown after login when MFA is required
// and the user has the option to mark the current device as trusted (skip OTP next time).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import {
  ShieldCheck, Smartphone, Monitor, Tablet,
  CheckCircle2, XCircle, Loader2, ArrowRight,
  Clock, Globe, Lock, AlertTriangle,
} from "lucide-react";

const DEVICE_LABELS: Record<string, { icon: typeof Monitor; label: string }> = {
  mobile: { icon: Smartphone, label: "Mobile Device" },
  tablet: { icon: Tablet, label: "Tablet" },
  desktop: { icon: Monitor, label: "Desktop / Laptop" },
};

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  return "Unknown Browser";
}

export default function SecureDevice() {
  const { secureNow } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const deviceType = getDeviceType();
  const { icon: DeviceIcon, label: deviceLabel } = DEVICE_LABELS[deviceType];
  const browser = getBrowserName();
  const now = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const handleTrust = async () => {
    if (!secureNow) {
      setStatus("error");
      setMessage("Session context unavailable. Please log in again.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await secureNow();
      if (res?.access) {
        setStatus("success");
        setMessage("This device is now trusted. OTP will be skipped on future logins from this device.");
        setTimeout(() => navigate(-1), 2500);
      } else {
        setStatus("error");
        setMessage("Trust registration failed. Please try again.");
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "An error occurred while securing the device.");
    }
  };

  const handleSkip = () => navigate(-1);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 font-inter transition-colors duration-300"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] max-w-[500px] rounded-full blur-[140px]" style={{ background: "rgba(16,185,129,0.1)" }} />
        <div className="absolute bottom-[10%] right-[15%] w-[35vw] h-[35vw] max-w-[400px] rounded-full blur-[140px]" style={{ background: "var(--primary-glow)" }} />
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center border shadow-2xl" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)" }}>
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight">
            Trust This <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Device?</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Mark this device as trusted to skip OTP verification on future logins.
            Only do this on devices you own and control.
          </p>
        </div>

        {/* Device card */}
        <div
          className="rounded-3xl p-6 space-y-4 border"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
        >
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Current Session Details
          </h3>
          <div className="space-y-3">
            {[
              { icon: DeviceIcon, label: "Device Type", value: deviceLabel },
              { icon: Globe, label: "Browser", value: browser },
              { icon: Clock, label: "Timestamp", value: now },
              { icon: Lock, label: "Auth Level", value: "Zero-Trust MFA" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="flex gap-3 p-4 rounded-2xl border" style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.2)" }}>
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong className="text-amber-400">Only trust personal devices.</strong> Never mark shared computers, public terminals, or borrowed devices as trusted.
          </p>
        </div>

        {/* Status feedback */}
        {status === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium text-emerald-400">{message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/25">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-medium text-red-400">{message}</p>
          </div>
        )}

        {/* Actions */}
        {status !== "success" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleTrust}
              disabled={status === "loading"}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 32px rgba(16,185,129,0.25)" }}
            >
              {status === "loading" ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Securing Device...</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> Trust This Device</>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={status === "loading"}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Skip for Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-center text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Trust stored as per AUIP Adaptive MFA policy
        </p>
      </div>
    </div>
  );
}
