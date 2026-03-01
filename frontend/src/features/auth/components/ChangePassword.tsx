// ✅ src/features/auth/components/ChangePassword.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import toast from "react-hot-toast";
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";

const ChangePassword = () => {
  const { changePassword } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------------- PASSWORD RULES ---------------- */
  const strengthRules = [
    { label: "At least 8 characters", check: () => newPassword.length >= 8 },
    { label: "1 lowercase letter", check: () => /[a-z]/.test(newPassword) },
    { label: "1 uppercase letter", check: () => /[A-Z]/.test(newPassword) },
    { label: "1 number", check: () => /\d/.test(newPassword) },
    { label: "1 special character", check: () => /[\W_]/.test(newPassword) },
    { label: "No spaces", check: () => !/\s/.test(newPassword) },
    { label: "Max 16 characters", check: () => newPassword.length <= 16 },
  ];

  const [strengthState, setStrengthState] = useState(
    strengthRules.map(r => ({ ...r, passed: false }))
  );

  useEffect(() => {
    setStrengthState(strengthRules.map(r => ({ ...r, passed: r.check() })));
  }, [newPassword]);

  const strengthScore = strengthState.filter(r => r.passed).length;
  const strengthPct = (strengthScore / strengthState.length) * 100;
  const strengthColor = strengthPct <= 40 ? "bg-red-500" : strengthPct < 80 ? "bg-yellow-400" : "bg-emerald-500";
  const strengthLabel = strengthPct <= 40 ? "Weak" : strengthPct < 80 ? "Moderate" : "Strong";

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (oldPassword === newPassword) {
      toast.error("New password cannot be the same as the current password.");
      return;
    }

    setLoading(true);
    try {
      const result: any = await changePassword(oldPassword, newPassword);

      if (result?.success === false || result === false) {
        // result.message is the human-readable string already built by extractApiError in passwordApi.ts
        toast.error(result?.message || "Failed to change password.", { duration: 6000 });
      } else {
        // ✅ Password changed — don't echo the backend's "session renewal" noise, session stays alive via passport/
        toast.success("Password changed successfully! 🔐", { duration: 5000 });
        setOldPassword("");
        setNewPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-8 space-y-7 relative overflow-hidden glass">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary-glow)] blur-[80px] rounded-full pointer-events-none -z-0" />

        {/* Title */}
        <div className="relative text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-glow)] border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mt-3">
            Change <span className="text-[var(--primary)] italic">Password</span>
          </h3>
          <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
            Keep your account secure
          </p>
        </div>

        <form className="relative space-y-5" onSubmit={handleSubmit}>
          {/* ── Current Password ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] px-1">
              Current Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Your current password"
                required
                className="w-full h-12 pl-11 pr-11 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-primary)] font-bold text-sm placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/40 hover:border-[var(--border-hover)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOld(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                tabIndex={-1}
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── New Password ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] px-1">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New strong password"
                required
                className="w-full h-12 pl-11 pr-11 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-primary)] font-bold text-sm placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/40 hover:border-[var(--border-hover)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar + rules */}
            {newPassword && (
              <div className="mt-4 p-4 rounded-2xl bg-[var(--bg-base)]/50 border border-[var(--border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${strengthColor}`}
                      style={{ width: `${strengthPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest w-16 text-right ${strengthPct <= 40 ? "text-red-500" : strengthPct < 80 ? "text-yellow-500" : "text-emerald-500"
                    }`}>
                    {strengthLabel}
                  </span>
                </div>

                <ul className="grid grid-cols-1 gap-y-2">
                  {strengthState.map((rule, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {rule.passed
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
                      <span className={`text-[11px] font-bold tracking-tight transition-colors duration-300 ${rule.passed ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 premium-gradient text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Updating Security...</>
            ) : (
              "Apply New Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
