// ✅ src/features/auth/components/ChangePassword.tsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import { useNavigate } from "react-router-dom";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
  leaving?: boolean;
}

interface StrengthRule {
  label: string;
  passed: boolean;
  check: () => boolean;
}

const ChangePassword = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  /** redirect logic */
  useEffect(() => {
    if (!user) return;
    // if this is a forced‐password scenario → hide old pwd input
    if (!user.first_time_login && !user.need_password_reset) return;
  }, [user]);

  /* ---------------- TOAST ---------------- */
  const addToast = (message: string, type: "success" | "error" = "success") => {
    const id = toastCounter.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  };

  /* ---------------- PASSWORD RULES ---------------- */
  const strengthRules: StrengthRule[] = [
    { label: "At least 8 characters", check: () => newPassword.length >= 8, passed: false },
    { label: "1 lowercase letter", check: () => /[a-z]/.test(newPassword), passed: false },
    { label: "1 uppercase letter", check: () => /[A-Z]/.test(newPassword), passed: false },
    { label: "1 number", check: () => /\d/.test(newPassword), passed: false },
    { label: "1 special character", check: () => /[\W_]/.test(newPassword), passed: false },
    { label: "No spaces", check: () => !/\s/.test(newPassword), passed: false },
    { label: "Max 16 characters", check: () => newPassword.length <= 16, passed: false },
  ];

  const [strengthState, setStrengthState] = useState(strengthRules);

  useEffect(() => {
    setStrengthState(
      strengthRules.map((rule) => ({ ...rule, passed: rule.check() }))
    );
  }, [newPassword]);

  const strengthScore = strengthState.filter((r) => r.passed).length;
  const strengthPercentage =
    (strengthScore / strengthState.length) * 100;

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!user?.first_time_login && !user?.need_password_reset) {
        if (oldPassword === newPassword) {
          addToast("New password cannot be the same as old.", "error");
          setLoading(false);
          return;
        }
      }

      // changePassword now returns { success: boolean, message: string } or similar if updated
      // but current hook returns msg: string. Let's update usePasswordHandler next.
      // For now, let's fix the catch block and useToast correctly.
      const result: any = await changePassword(oldPassword, newPassword);

      if (result === false || (typeof result === 'object' && result?.success === false)) {
        addToast(result?.message || "Failed to change password ❌", "error");
      } else {
        addToast(typeof result === 'string' ? result : (result?.message || "Password changed successfully ✅"), "success");
        setOldPassword("");
        setNewPassword("");
      }
    } catch (err: any) {
      const data = err?.response?.data || err;
      const errorMsg = data?.message || data?.detail || "Something went wrong ❌";
      addToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative max-w-lg mx-auto my-6 p-8 bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl text-white">
        <h3 className="text-3xl font-extrabold mb-6 tracking-wider text-cyan-400 text-center">
          Change Password
        </h3>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Always show old password for authenticated password changes */}
          <div className="relative">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder=" "
              required
              className="peer w-full p-4 rounded-2xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white text-lg"
            />
            <label className="absolute left-4 top-4 text-gray-400 pointer-events-none transition-all text-sm peer-focus:-top-2 peer-focus:text-cyan-400 peer-focus:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400">
              Old Password
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder=" "
              required
              className="peer w-full p-4 rounded-2xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-lg"
            />
            <label className="absolute left-4 top-4 text-gray-400 pointer-events-none transition-all text-sm peer-focus:-top-2 peer-focus:text-purple-400 peer-focus:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400">
              New Password
            </label>

            {newPassword && (
              <div className="mt-4 space-y-2">
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 transition-all duration-500 ${strengthPercentage <= 40
                      ? "bg-red-500"
                      : strengthPercentage < 80
                        ? "bg-yellow-400"
                        : "bg-green-500"
                      }`}
                    style={{ width: `${strengthPercentage}%` }}
                  />
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {strengthState.map((rule, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${rule.passed ? "bg-green-400" : "bg-gray-600"
                          }`}
                      />
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-extrabold hover:from-purple-600 hover:to-pink-600 text-lg transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* TOASTS */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 flex flex-col gap-4 z-50 w-[95%] max-w-3xl">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative px-8 py-6 rounded-3xl shadow-2xl text-white font-extrabold text-center text-lg transition-all duration-200
              ${t.leaving
                ? "opacity-0 -translate-y-6 rotate-[10deg] scale-95"
                : "opacity-100 animate-toast-flick"
              }
              ${t.type === "error"
                ? "bg-gradient-to-r from-red-500 via-pink-500 to-purple-500"
                : "bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400"
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toast-flick {
          0% { transform: rotate(-12deg) translateX(0); }
          10% { transform: rotate(12deg) translateX(-8px); }
          20% { transform: rotate(-12deg) translateX(8px); }
          30% { transform: rotate(12deg) translateX(-8px); }
          40% { transform: rotate(-12deg) translateX(8px); }
          50% { transform: rotate(0deg) translateX(0); }
          100% { transform: rotate(0deg) translateX(0); }
        }
        .animate-toast-flick {
          animation: toast-flick 0.6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default ChangePassword;
