import { useCallback, useState } from "react";
import { getTeacher, updateTeacher, ProfilePayload } from "../api/userApi";
import { toast } from "react-hot-toast";

export function useTeacherDetail(id: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacher(id);
      setData(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to fetch teacher");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const save = useCallback(
    async (payload: ProfilePayload) => {
      setLoading(true);
      try {
        const res = await updateTeacher(id, payload);
        setData(res);
        toast.success("Updated ✅");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to save");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { data, load, save, loading };
}
