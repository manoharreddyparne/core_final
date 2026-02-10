// ✅ src/features/auth/components/ResetPasswordConfirmForm.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthProvider/AuthProvider";

interface Props {
  token: string;
}

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

export const ResetPasswordConfirmForm = ({ token }: Props) => {
  const { resetPasswordConfirm, resetPasswordValidate } = useAuth();

  const [validToken, setValidToken] = useState<boolean | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [strengthState, setStrengthState] = useState<StrengthRule[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  /* ------------------------ ✅ Toast infra ------------------------ */
  const addToast = (message: string, type: "success" | "error") => {
    const id = toastCounter.current++;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      setTimeout(
        () =>
          setToasts((prev) => prev.filter((t) => t.id !== id)),
        300
      );
    }, 4000);
  };

  /* ------------------------ ✅ token validation ------------------------ */
  useEffect(() => {
    const validate = async () => {
      try {
        await resetPasswordValidate(token);
        setValidToken(true);
      } catch (err: any) {
        const msg =
          err?.message ||
          err?.response?.data?.message ||
          "Invalid or expired password reset link.";
        addToast(msg, "error");
        setValidToken(false);
      }
    };
    validate();
  }, [token, resetPasswordValidate]);

  /* ------------------------ ✅ strength rules ------------------------ */
  const rules: StrengthRule[] = [
    { label: "At least 8 characters", check: () => newPassword.length >= 8, passed: false },
    { label: "One lowercase letter", check: () => /[a-z]/.test(newPassword), passed: false },
    { label: "One uppercase letter", check: () => /[A-Z]/.test(newPassword), passed: false },
    { label: "One number", check: () => /\d/.test(newPassword), passed: false },
    { label: "One special character", check: () => /[\W_]/.test(newPassword), passed: false },
    { label: "No spaces", check: () => !/\s/.test(newPassword), passed: false },
    { label: "Max 16 characters", check: () => newPassword.length <= 16, passed: false },
  ];

  useEffect(() => {
    setStrengthState(rules.map((r) => ({ ...r, passed: r.check() })));
  }, [newPassword]);

  const strengthScore = strengthState.filter((r) => r.passed).length;
  const strengthPercent = (strengthScore / strengthState.length) * 100;

  /* ------------------------ ✅ submit ------------------------ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    if (!validToken) {
      addToast("Token invalid — grab a new reset email.", "error");
      setSubmitting(false);
      return;
    }

    if (!newPassword || !confirmPassword) {
      addToast("Fill both password fields.", "error");
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match.", "error");
      setSubmitting(false);
      return;
    }

    try {
      const res = await resetPasswordConfirm(token, newPassword, confirmPassword);
      addToast(res?.message || "Password updated!", "success");

      if (res?.reset_success) {
        setResetDone(true);
      }

      setNewPassword("");
      setConfirmPassword("");
      setStrengthState([]);
    } catch (err: any) {
      const data = err?.response?.data || err;
      const msg =
        data?.message ||
        "Something went sideways. Try again.";
      addToast(msg, "error");

      ["new_password", "confirm_password"].forEach((key) => {
        if (Array.isArray(data[key])) {
          data[key].forEach((m: string) => addToast(m, "error"));
        }
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------ ✅ UI ------------------------ */
  if (validToken === false)
    return (
      <div className="max-w-lg mx-auto p-8 mt-10 bg-gray-900 border border-gray-700 rounded-2xl text-center text-white">
        <h2 className="text-2xl font-bold text-red-400 mb-2">
          Invalid or Expired Token
        </h2>
        <p className="text-gray-300 text-sm">
          Request a new link to stay secure.
        </p>
      </div>
    );

  return (
    <>
      <div className="relative max-w-lg mx-auto">
        {resetDone && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex flex-col items-center justify-center rounded-3xl text-white z-30 text-center p-8 space-y-4">
            <h2 className="text-3xl font-bold text-green-400 animate-pulse">
              ✅ Password Reset!
            </h2>
            <p className="text-gray-300">
              You’re clear — go
              <a href="/login" className="text-cyan-400 underline ml-1">
                log in
              </a>
              .
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`bg-gray-900 p-8 rounded-3xl shadow-xl space-y-6 text-white transition ${
            resetDone ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <h2 className="text-3xl font-bold text-cyan-400 text-center mb-4">
            Set New Password
          </h2>

          {/* new password */}
          <div className="relative">
            <input
              type="password"
              placeholder=" "
              className="peer w-full p-4 rounded-2xl bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <label className="absolute left-4 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-400">
              New Password
            </label>
          </div>

          {/* meter */}
          {newPassword && (
            <div className="space-y-3">
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${strengthPercent}%` }}
                  className={`h-2 transition-all ${
                    strengthPercent <= 40
                      ? "bg-red-500"
                      : strengthPercent < 80
                      ? "bg-yellow-400"
                      : "bg-green-500"
                  }`}
                ></div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {strengthState.map((r, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.passed ? "bg-green-400" : "bg-gray-600"
                      }`}
                    ></span>
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* confirm */}
          <div className="relative">
            <input
              type="password"
              placeholder=" "
              className="peer w-full p-4 rounded-2xl bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <label className="absolute left-4 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:text-xs peer-focus:text-purple-400">
              Confirm Password
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full p-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 transition ${
              submitting ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? "Updating…" : "Reset Password"}
          </button>
        </form>
      </div>

      {/* toasts */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-6 py-4 rounded-2xl text-white shadow-xl font-semibold text-sm transition-all ${
              t.leaving ? "opacity-0 -translate-y-2" : "opacity-100"
            } ${
              t.type === "error"
                ? "bg-red-500/90"
                : "bg-green-500/90"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
};

export default ResetPasswordConfirmForm;
