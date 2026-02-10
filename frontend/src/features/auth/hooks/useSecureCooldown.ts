// ✅ FINAL — Zero-trust UX cooldown helper
// src/features/auth/hooks/useSecureCooldown.ts

import { useState, useEffect, useCallback, useRef } from "react";

const COOLDOWN_MS = 45 * 60 * 1000; // 45 minutes
const STORAGE_KEY = "secure_cooldown_until";

export const useSecureCooldown = () => {
  const [canSecure, setCanSecure] = useState(true);
  const [remaining, setRemaining] = useState(0);

  // ✅ Browser-safe interval reference
  const intervalRef = useRef<number | null>(null);

  /** 🧠 read cooldown deadline (ms ts) */
  const readUntil = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const ts = Number(raw);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  }, []);

  /** 🧮 compute cooldown + set flags */
  const compute = useCallback(() => {
    const until = readUntil();
    if (!until) {
      setCanSecure(true);
      setRemaining(0);
      return;
    }

    const now = Date.now();
    const diff = until - now;

    if (diff > 0) {
      setCanSecure(false);
      setRemaining(diff);
      return;
    }

    // ✅ expired → cleanup
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setCanSecure(true);
    setRemaining(0);
  }, [readUntil]);

  /** 🚀 start cooldown after successful secureNow() */
  const startCooldown = useCallback(() => {
    try {
      const until = Date.now() + COOLDOWN_MS;
      localStorage.setItem(STORAGE_KEY, String(until));
    } catch {}
    compute();
  }, [compute]);

  /** 🔄 force-reset (logout, etc.) */
  const clearCooldown = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setCanSecure(true);
    setRemaining(0);
  }, []);

  /** 🔁 poll every second */
  useEffect(() => {
    compute();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(compute, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [compute]);

  /** 🧁 helper — seconds */
  const remainingSeconds = Math.ceil(remaining / 1000);

  return {
    /** state */
    canSecure,
    remaining,
    remainingSeconds,

    /** actions */
    startCooldown,
    clearCooldown,
  };
};
