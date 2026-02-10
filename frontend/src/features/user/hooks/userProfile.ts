// ✅ FINAL
// src/features/user/hooks/useProfile.ts

import { useState, useCallback } from "react";
import {
  getProfile,
  updateProfile,
  type ProfilePayload,
} from "../api/userApi";

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProfile();
      setProfile(res);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (payload: ProfilePayload) => {
    setLoading(true);
    try {
      const updated = await updateProfile(payload);
      setProfile((prev: any) => ({ ...prev, ...updated }));
      return updated;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    load,
    save,
    loading,
  };
}
