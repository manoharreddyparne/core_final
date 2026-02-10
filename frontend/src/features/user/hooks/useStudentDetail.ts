import { useCallback, useState } from "react";
import { getStudent, updateStudent, ProfilePayload } from "../api/userApi";
import { toast } from "react-hot-toast";

export function useStudentDetail(id: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudent(id);
      setData(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to fetch student");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const save = useCallback(
    async (payload: ProfilePayload) => {
      setLoading(true);
      try {
        const res = await updateStudent(id, payload);
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
