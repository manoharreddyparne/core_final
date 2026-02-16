// ✅ src/features/auth/components/ResetPasswordRequestForm.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthProvider/AuthProvider";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "countdown";
  leaving?: boolean;
  endTime?: number;
  baseMessage?: string;
}

const COOLDOWN_KEY = "reset_password_cooldowns";

export const ResetPasswordRequestForm = () => {
  const { resetPasswordRequest } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const toastId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  /* ------------------------------------------------
   * utils
   * ------------------------------------------------ */
  const now = () => Date.now();
  const secondsLeft = (ms: number) => Math.max(Math.ceil((ms - now()) / 1000), 0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /* ------------------------------------------------
   * toast handling
   * ------------------------------------------------ */
  const addToast = useCallback(
    (message: string, type: Toast["type"], endTime?: number) => {
      const id = toastId.current++;
      const toast: Toast = {
        id,
        message,
        type,
        endTime,
        baseMessage: type === "countdown" ? message : undefined,
      };

      setToasts((prev) => [...prev, toast]);

      if (type !== "countdown") {
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
          );
          setTimeout(
            () => setToasts((prev) => prev.filter((t) => t.id !== id)),
            350
          );
        }, 4500);
      }
    },
    []
  );

  /* ------------------------------------------------
   * load saved cooldowns
   * ------------------------------------------------ */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOLDOWN_KEY);
      if (stored) {
        setCooldowns(JSON.parse(stored));
      }
    } catch {
      /** ignore */
    }
  }, []);

  /* ------------------------------------------------
   * global ticker
   * ------------------------------------------------ */
  useEffect(() => {
    const tick = setInterval(() => {
      const t = now();

      // 1) prune expired cooldowns
      setCooldowns((prev) => {
        let changed = false;
        const updated: Record<string, number> = {};

        Object.entries(prev).forEach(([key, endsAt]) => {
          if (endsAt > t) updated[key] = endsAt;
          else changed = true;
        });

        if (changed) {
          localStorage.setItem(COOLDOWN_KEY, JSON.stringify(updated));
        }

        return updated;
      });

      // 2) countdown toast updates
      setToasts((prev) =>
        prev
          .map((toast) => {
            if (toast.type === "countdown" && toast.endTime && toast.baseMessage) {
              const left = secondsLeft(toast.endTime);
              if (left <= 0) return { ...toast, leaving: true };
              return {
                ...toast,
                message: `${toast.baseMessage} (timer: ${formatTime(left)})`,
              };
            }
            return toast;
          })
          .filter((t) => !t.leaving)
      );
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  /* ------------------------------------------------
   * submit
   * ------------------------------------------------ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Block if any cooldown active
    if (Object.values(cooldowns).some((expires) => expires > now())) return;

    setLoading(true);
    try {
      const res = await resetPasswordRequest(trimmed, "student");

      const ip = res.ip ?? trimmed;
      const cooldownSeconds = res.cooldown ?? 0;
      const lockedUntilMs =
        (res.locked_until ? res.locked_until * 1000 : null) ??
        (cooldownSeconds ? now() + cooldownSeconds * 1000 : null);

      // ✅ store cooldown
      if (lockedUntilMs) {
        setCooldowns((prev) => {
          const updated = { ...prev, [ip]: lockedUntilMs };
          localStorage.setItem(COOLDOWN_KEY, JSON.stringify(updated));
          return updated;
        });

        addToast(res.message ?? "Try later", "countdown", lockedUntilMs);
      } else {
        addToast(res.message ?? "Success", res.success ? "success" : "error");
      }

      if (res.dev_token) {
        console.warn("dev_token:", res.dev_token);
      }

      setEmail("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Something went wrong";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------
   * derived
   * ------------------------------------------------ */
  const activeCooldown = Object.values(cooldowns).find((t) => t > now());
  const cooldownRemaining = activeCooldown ? secondsLeft(activeCooldown) : 0;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto bg-gray-900 rounded-3xl p-8 space-y-6 shadow-2xl text-white"
      >
        <h2 className="text-3xl font-extrabold text-cyan-400 text-center mb-6 tracking-wide">
          Reset Password
        </h2>

        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            required
            className="peer w-full p-4 rounded-2xl bg-gray-800 border border-gray-700 
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 
              focus:ring-offset-gray-900 transition-all text-white text-lg"
          />
          <label
            className="absolute left-4 top-4 text-gray-400 text-sm transition-all duration-300 pointer-events-none
              peer-placeholder-shown:top-4 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-sm
              peer-focus:-top-2 peer-focus:text-purple-400 peer-focus:text-xs"
          >
            Email
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !!activeCooldown}
          className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl 
            font-extrabold hover:from-purple-600 hover:to-pink-600 
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all duration-300 text-lg"
        >
          {loading
            ? "Sending..."
            : activeCooldown
              ? `Wait: ${formatTime(cooldownRemaining)}`
              : "Send Reset Link"}
        </button>
      </form>

      {/* ✅ toasts */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 flex flex-col gap-4 z-50 w-[95%] max-w-3xl">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative px-8 py-6 rounded-3xl shadow-2xl text-white font-extrabold text-center text-lg transition-all duration-200
              ${t.leaving ? "opacity-0 -translate-y-6 scale-95" : "opacity-100"}
              ${t.type === "error"
                ? "bg-gradient-to-r from-red-500 via-pink-500 to-purple-500"
                : "bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400"
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
};
