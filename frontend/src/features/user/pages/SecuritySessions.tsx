import { useEffect, useState, useCallback, useRef } from "react";
import { useSecurity } from "../hooks/useSecurity";
import { toast } from "react-hot-toast";
import {
  Laptop, Smartphone, Globe, MapPin, Clock, Shield,
  LogOut, RefreshCw, ChevronDown, ChevronUp, Wifi, AlertTriangle,
} from "lucide-react";
import { createPortal } from "react-dom";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDeviceIcon(os?: string, browser?: string) {
  const osLower = (os || "").toLowerCase();
  if (osLower.includes("android") || osLower.includes("ios") || osLower.includes("iphone"))
    return <Smartphone className="w-5 h-5" />;
  return <Laptop className="w-5 h-5" />;
}

export default function SecuritySessions() {
  const { sessions, load, logoutOne, logoutAll, loading } = useSecurity();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | "all" | null>(null);

  useEffect(() => { load(); }, [load]);

  const handleLogoutOne = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      await logoutOne(id);
      toast.success("Session terminated");
    } catch { toast.error("Failed to terminate session"); }
    finally { setActionLoading(null); }
  }, [logoutOne]);

  const handleLogoutAll = useCallback(async () => {
    setActionLoading("all");
    try {
      await logoutAll();
      toast.success("All sessions terminated");
    } catch { toast.error("Failed to terminate sessions"); }
    finally { setActionLoading(null); setConfirmAll(false); }
  }, [logoutAll]);

  const sessionList = sessions?.recent_sessions || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Device Management
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Monitor and control active sessions across all devices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-all hover:scale-105"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--glass-bg)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {sessionList.length > 1 && (
            <button
              onClick={() => setConfirmAll(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 transition-all hover:bg-red-500/20 hover:scale-105"
            >
              <Shield className="w-3.5 h-3.5" />
              Terminate All
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Sessions", value: sessionList.length, icon: Wifi, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
          { label: "Devices", value: new Set(sessionList.map((s: any) => s.os)).size, icon: Laptop, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Locations", value: new Set(sessionList.map((s: any) => s.ip_address)).size, icon: Globe, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 flex items-center gap-4 ${border}`}
            style={{ background: "var(--bg-elevated)" }}
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && !sessionList.length && (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Loading sessions...</p>
        </div>
      )}

      {/* Session Cards */}
      <div className="space-y-3">
        {sessionList.map((s: any, idx: number) => {
          const isExpanded = expandedId === (s.id ?? idx);
          const isCurrent = s.is_current || idx === 0;
          const isTerminating = actionLoading === s.id;

          return (
            <div
              key={s.id ?? idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isCurrent ? "border-green-500/30" : ""
                } ${isExpanded ? "ring-1 ring-blue-500/30" : ""}`}
              style={{ background: "var(--bg-elevated)", borderColor: isCurrent ? undefined : "var(--border)" }}
            >
              {/* Main Row */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedId(isExpanded ? null : (s.id ?? idx))}
              >
                <div className="flex items-center gap-4">
                  {/* Device Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCurrent ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                    }`}>
                    {getDeviceIcon(s.os, s.browser)}
                  </div>

                  {/* Device Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {s.os || "Unknown OS"}
                      </span>
                      {s.browser && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          • {s.browser}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin className="w-3 h-3" /> {s.ip_address}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <Clock className="w-3 h-3" /> {timeAgo(s.last_active)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLogoutOne(s.id); }}
                    disabled={isTerminating}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg text-red-400 bg-red-500/5 border border-red-500/15 transition-all hover:bg-red-500/15 hover:scale-105 disabled:opacity-50"
                  >
                    {isTerminating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                    {isTerminating ? "..." : "Revoke"}
                  </button>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  }
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  className="px-5 pb-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6 border-t animate-in fade-in slide-in-from-top-1 duration-200"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                      Device Details
                    </h4>
                    <dl className="space-y-2">
                      {[
                        { label: "IP Address", value: s.ip_address },
                        { label: "Operating System", value: s.os || "Unknown" },
                        { label: "Browser", value: s.browser || "Unknown" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center">
                          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</dt>
                          <dd className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                      Session Info
                    </h4>
                    <dl className="space-y-2">
                      {[
                        { label: "Last Active", value: new Date(s.last_active).toLocaleString() },
                        { label: "Session ID", value: s.id ? `#${s.id}` : "N/A" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center">
                          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</dt>
                          <dd className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && !sessionList.length && (
        <div className="py-16 text-center rounded-2xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
          <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>No active sessions</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>All sessions have been terminated.</p>
        </div>
      )}

      {/* Confirm All Dialog */}
      {confirmAll && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setConfirmAll(false)} />
          <div
            className="relative w-full max-w-md rounded-[3rem] border border-white/10 p-10 space-y-8 shadow-[0_0_120px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300 overflow-hidden"
            style={{ background: "var(--bg-elevated)" }}
          >
            {/* Ambient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase" style={{ color: "var(--text-primary)" }}>Revoke All <span className="text-red-500 not-italic">Sessions</span></h3>
                <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mt-1">Institutional Security Protocol</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              This action will immediately terminate every active handshake associated with your identity. Every device will be forced to re-authenticate.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => setConfirmAll(false)}
                className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all hover:bg-white/5 active:scale-95"
                style={{ color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutAll}
                disabled={actionLoading === "all"}
                className="flex-1 h-14 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-2xl bg-red-500 text-white shadow-xl shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
              >
                {actionLoading === "all" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                {actionLoading === "all" ? "Syncing..." : "Authorize Revoke"}
              </button>
            </div>
            <SecurityEscListener onEsc={() => setConfirmAll(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const SecurityEscListener = ({ onEsc }: { onEsc: () => void }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEsc();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", h);
    };
  }, [onEsc]);
  return null;
};
