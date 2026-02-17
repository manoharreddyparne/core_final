// ✅ src/features/auth/hooks/useSilentRefresh.ts
import { useEffect, useCallback } from "react";
import { useTokenDecode } from "./useTokenDecode";
import { useSecureRotation } from "./useSecureRotation";
import {
    isHydrating,
    startHydrating,
    stopHydrating,
    getAccessToken
} from "../utils/tokenStorage";

/**
 * 🔄 useSilentRefresh
 * ---------------------------------------------------
 * Purpose:
 *   Proactively rotates the access token before it expires.
 *   Ensures "Zero Latency" UX where the user never sees a 401.
 *
 * Logic:
 *   - Monitors token remaining time.
 *   - If < 45s, triggers secure rotation.
 *   - Tab coordination: Uses hydration lock to prevent race conditions.
 *   - Visibility aware: Pauses checks when tab is inactive.
 */
export const useSilentRefresh = () => {
    const { remaining, isValid, refresh: forceDecode } = useTokenDecode();
    const { secureNow } = useSecureRotation();

    const REFRESH_THRESHOLD = 45; // seconds

    const performRefresh = useCallback(async () => {
        if (isHydrating()) return;

        console.debug(`[Auth] Silent refresh triggered (${remaining}s remaining)`);
        startHydrating();
        try {
            await secureNow();
        } finally {
            stopHydrating();
        }
    }, [remaining, secureNow]);

    useEffect(() => {
        // 1. Skip if no token or already expired
        if (!isValid || !getAccessToken()) return;

        // 2. Check if we are in the "Danger Zone"
        if (remaining > 0 && remaining < REFRESH_THRESHOLD) {
            performRefresh();
        }

        // 3. Schedule next check
        // Check 10s before we actually expected to hit THRESHOLD to be safe, 
        // but never more frequent than every 30s for silent checks.
        const secondsUntilDanger = remaining - REFRESH_THRESHOLD;
        if (secondsUntilDanger > 0) {
            const nextCheckSeconds = Math.max(secondsUntilDanger - 10, 30);
            console.debug(`[Auth] Scheduling next silent check in ${nextCheckSeconds}s`);
            const timer = setTimeout(() => {
                forceDecode();
            }, nextCheckSeconds * 1000);
            return () => clearTimeout(timer);
        }
    }, [remaining, isValid, performRefresh, forceDecode]);

    // 4. Foreground Wakeup Logic
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                console.debug("[Auth] Tab foregrounded. Checking session sync...");
                forceDecode();
            }
        };

        window.addEventListener("visibilitychange", handleVisibilityChange);
        return () => window.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [forceDecode]);
};
