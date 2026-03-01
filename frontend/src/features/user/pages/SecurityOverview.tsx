// ✅ FINAL
import { useEffect } from "react";
import { useSecurity } from "../hooks/useSecurity";

export default function SecurityOverview() {
  const { overview, load, loading } = useSecurity();

  useEffect(() => {
    load();
  }, [load]);

  const handleSecureDevice = () => {
    window.dispatchEvent(new CustomEvent('trigger-secure-modal'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Synchronizing security protocols...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-elevated)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">Security Hub</h2>
          <p className="text-[var(--text-secondary)] font-medium">Manage your account security and sessions.</p>
        </div>
        <button
          onClick={handleSecureDevice}
          className="px-6 py-3 premium-gradient text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure My Device
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-elevated)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Account Access
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed font-medium">Your account is currently protected by standard authentication.</p>
          <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] uppercase font-black tracking-widest mb-1">Last System Audit</p>
            <p className="text-[var(--text-primary)] font-bold">{overview?.last_login ? new Date(overview.last_login).toLocaleString() : "No recent activity"}</p>
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Device Snapshot</h3>
          <div className="space-y-4">
            {overview?.recent_devices?.length ? (
              overview.recent_devices.map((dev, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 hover:bg-[var(--bg-card)] rounded-xl transition-colors border border-transparent hover:border-[var(--border)]">
                  <div className="w-8 h-8 bg-[var(--primary-glow)] rounded-lg flex items-center justify-center text-[var(--primary)] pt-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{dev.ip_address}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">{dev.user_agent}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-[var(--text-secondary)] text-sm">No secondary devices detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}
