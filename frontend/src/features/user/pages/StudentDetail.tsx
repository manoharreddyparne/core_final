// ✅ FINAL
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useStudentDetail } from "../hooks/useStudentDetail";

export default function StudentDetail() {
  const { id } = useParams();
  const studentId = Number(id);

  const { data, load, save, loading } = useStudentDetail(studentId);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    roll_number: "",
    admission_year: "",
    batch: "",
  });

  /** -------------------------------------------
      Load when component mounts
  -------------------------------------------- */
  useEffect(() => {
    if (!Number.isFinite(studentId)) {
      toast.error("Invalid student ID");
      return;
    }
    load();
  }, [load, studentId]);

  /** -------------------------------------------
      Hydrate form on fresh data
  -------------------------------------------- */
  useEffect(() => {
    if (!data?.user) return;

    setForm({
      first_name: data.user.first_name ?? "",
      last_name: data.user.last_name ?? "",
      email: data.user.email ?? "",
      roll_number: data.roll_number ?? "",
      admission_year: data.admission_year ?? "",
      batch: data.batch ?? "",
    });
  }, [data]);

  /** -------------------------------------------
      Updating fields
  -------------------------------------------- */
  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** -------------------------------------------
      Submit
  -------------------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await save(form);
      toast.success("Updated successfully ✅");
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    }
  };

  /** -------------------------------------------
      LOADING
  -------------------------------------------- */
  if (loading && !data)
    return (
      <div className="py-10 text-center text-gray-600">
        Loading…
      </div>
    );

  if (!data)
    return (
      <div className="py-10 text-center text-red-600">
        Student not found
      </div>
    );

  /** -------------------------------------------
      UI
  -------------------------------------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto space-y-4 p-4"
    >
      <h1 className="text-xl font-bold mb-4">
        Student Detail
      </h1>

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
        value={form.roll_number}
        onChange={(e) => updateField("roll_number", e.target.value)}
        placeholder="Roll Number"
        className="border p-2 rounded w-full"
      />

      <input
        value={form.admission_year}
        onChange={(e) => updateField("admission_year", e.target.value)}
        placeholder="Admission Year"
        className="border p-2 rounded w-full"
      />

      <input
        value={form.batch}
        onChange={(e) => updateField("batch", e.target.value)}
        placeholder="Batch"
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
