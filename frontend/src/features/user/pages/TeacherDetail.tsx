// ✅ FINAL
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useTeacherDetail } from "../hooks/useTeacherDetail";

export default function TeacherDetail() {
  const { id } = useParams();
  const teacherId = Number(id);

  const { data, load, save, loading } = useTeacherDetail(teacherId);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    department: "",
  });

  /* ------------------------------------------------------
     Load teacher on mount
  ------------------------------------------------------ */
  useEffect(() => {
    if (!Number.isFinite(teacherId)) {
      toast.error("Invalid teacher ID");
      return;
    }
    load();
  }, [load, teacherId]);

  /* ------------------------------------------------------
     Hydrate form once data arrives
  ------------------------------------------------------ */
  useEffect(() => {
    if (!data?.user) return;

    setForm({
      first_name: data.user.first_name ?? "",
      last_name: data.user.last_name ?? "",
      email: data.user.email ?? "",
      department: data.department ?? "",
    });
  }, [data]);

  /* ------------------------------------------------------
     Update field
  ------------------------------------------------------ */
  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ------------------------------------------------------
     Submit
  ------------------------------------------------------ */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save(form);
      toast.success("Updated ✅");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    }
  };

  /* ------------------------------------------------------
     Loading / Not found
  ------------------------------------------------------ */
  if (loading && !data)
    return <div className="py-10 text-center text-gray-600">Loading…</div>;

  if (!data)
    return <div className="py-10 text-center text-red-600">Teacher not found</div>;

  /* ------------------------------------------------------
     Render
  ------------------------------------------------------ */
  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto space-y-4 p-4"
    >
      <h1 className="text-xl font-bold mb-4">Teacher Detail</h1>

      <input
        value={form.first_name}
        onChange={(e) => updateField("first_name", e.target.value)}
        placeholder="First Name"
        className="border p-2 rounded w-full"
      />

      <input
        value={form.last_name}
        onChange={(e) => updateField("last_name", e.target.value)}
        placeholder="Last Name"
        className="border p-2 rounded w-full"
      />

      <input
        value={form.email}
        type="email"
        onChange={(e) => updateField("email", e.target.value)}
        placeholder="Email"
        className="border p-2 rounded w-full"
      />

      <input
        value={form.department}
        onChange={(e) => updateField("department", e.target.value)}
        placeholder="Department"
        className="border p-2 rounded w-full"
      />

      <button
        disabled={loading}
        className="bg-green-600 text-white w-full p-2 rounded"
      >
        {loading ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
