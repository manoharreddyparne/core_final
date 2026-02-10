// ✅ FINAL, ROBUST
// src/features/auth/hooks/useCooldown.ts

import { useState, useCallback, useMemo } from "react";

type CooldownsMap = Record<string, number>; // key → timestamp(ms)

/**
 * useCooldown
 * -----------------------------------------------------
 * Manages cooldown windows, per-user or per-field.
 *
 * ✅ setCooldown("john", futureTimestamp)
 * ✅ isUnderCooldown("john")  → boolean
 * ✅ isAnyCooldownActive       → boolean
 * ✅ Expired keys auto-ignored
 */
const useCooldown = () => {
  const [cooldowns, setCooldowns] = useState<CooldownsMap>({});

  /**
   * Set cooldown until specific timestamp(ms)
   */
  const setCooldown = useCallback((key: string, untilTimestamp: number) => {
    setCooldowns((prev) => ({
      ...prev,
      [key]: untilTimestamp,
    }));
  }, []);

  /**
   * Per-key check
   */
  const isUnderCooldown = useCallback(
    (key: string): boolean => {
      const until = cooldowns[key];
      if (!until) return false;
      return until > Date.now();
    },
    [cooldowns]
  );

  /**
   * Any key under cooldown?
   */
  const isAnyCooldownActive = useMemo(
    () => Object.values(cooldowns).some((end) => end > Date.now()),
    [cooldowns]
  );

  return {
    cooldowns,
    setCooldown,
    isUnderCooldown,
    isAnyCooldownActive,
  };
};

export default useCooldown;
