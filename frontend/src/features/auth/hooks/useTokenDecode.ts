// ✅ src/features/auth/hooks/useTokenDecode.ts
import { useState, useEffect, useCallback } from "react";
import {
  decodeToken,
  isTokenExpired,
  getTokenRemainingTime,
  DecodedJWT,
} from "../utils/jwtHelpers";
import { getAccessToken } from "../utils/tokenStorage";

export const useTokenDecode = () => {
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(0); // seconds

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) {
      setDecoded(null);
      setIsValid(false);
      setRemaining(0);
      return;
    }

    const d = decodeToken<DecodedJWT>(token);

    if (!d) {
      setDecoded(null);
      setIsValid(false);
      setRemaining(0);
      return;
    }

    const expired = isTokenExpired(token);
    const secondsLeft = getTokenRemainingTime(token);

    setDecoded(d ?? null);
    setIsValid(!expired);
    setRemaining(secondsLeft);
  }, []);

  useEffect(() => {
    refresh();

    // re-check every 30s
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    decoded,
    isValid,
    remaining, // lifetime in seconds
    refresh,   // expose manual update
  };
};
