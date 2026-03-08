// ✅ FINAL — CLEAN, PRODUCTION-GRADE
// src/features/user/hooks/useSecurity.ts

import { useCallback, useState } from "react";
import {
  getSecurityOverview,
  getSessionSettings,
  logoutAllSessions,
  logoutSession,
  type SecurityOverview,
  type SecuritySettings,
} from "../api/userSecurityApi";

export function useSecurity() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------
     ✅ Fully hydrate security + sessions at once
  ------------------------------------------------ */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch independently so one failure doesn't block the other
      const [ovResult, ssResult] = await Promise.allSettled([
        getSecurityOverview(),
        getSessionSettings(),
      ]);

      if (ovResult.status === 'fulfilled') setOverview(ovResult.value);
      if (ssResult.status === 'fulfilled') setSessions(ssResult.value);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------------
     ✅ Logout one → auto-refresh
  ------------------------------------------------ */
  const logoutOne = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        await logoutSession(id);
        await load();
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  /* ------------------------------------------------
     ✅ Logout all → auto-refresh
  ------------------------------------------------ */
  const logoutAll = useCallback(
    async () => {
      setLoading(true);
      try {
        await logoutAllSessions();
        await load();
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  return {
    overview,
    sessions,
    load,
    logoutOne,
    logoutAll,
    loading,
  };
}
