// ✅ FINAL
// src/features/user/components/CreateStudentForm.tsx

import { useState } from "react";
import { toast } from "react-hot-toast";

import {
  type StudentInput,
  type CreateStudentResponse,
  createStudents,
} from "../api/userApi";

export const CreateStudentForm = () => {
  const [students, setStudents] = useState<StudentInput[]>([
    { roll_number: "", email: "", admission_year: "", batch: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const update = (i: number, field: keyof StudentInput, value: string) => {
    setStudents((prev) =>
      prev.map((s, index) =>
        index === i ? { ...s, [field]: value } : s
      )
    );
  };

  const addRow = () =>
    setStudents((s) => [
      ...s,
      { roll_number: "", email: "", admission_year: "", batch: "" },
    ]);

  const removeRow = (i: number) =>
    setStudents((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response: CreateStudentResponse = await createStudents(students);

      if (response.created?.length) {
        toast.success(
          `✅ Created ${response.created.length} student${
            response.created.length > 1 ? "s" : ""
          }`
        );
        console.table(response.created);
      }

      if (response.skipped?.length) {
        toast.error(
          `⚠️ Skipped ${response.skipped.length} student${
            response.skipped.length > 1 ? "s" : ""
          }`
        );
        console.warn("Skipped:", response.skipped);
      }

      // 🔄 reset
      setStudents([
        {
          roll_number: "",
          email: "",
          admission_year: "",
          batch: "",
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message ?? "Creating students failed.");
      console.error("❌ createStudents:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 max-w-4xl mx-auto p-4 bg-white rounded-xl shadow"
    >
      {students.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            placeholder="Roll Number"
            value={s.roll_number}
            onChange={(e) => update(i, "roll_number", e.target.value)}
            required
            className="border p-2 rounded flex-1"
          />

          <input
            type="email"
            placeholder="Email"
            value={s.email}
            onChange={(e) => update(i, "email", e.target.value)}
            required
            className="border p-2 rounded flex-1"
          />

          <input
            type="text"
            placeholder="Admission Year"
            value={s.admission_year}
            onChange={(e) => update(i, "admission_year", e.target.value)}
            className="border p-2 rounded flex-1"
          />

          <input
            type="text"
            placeholder="Batch"
            value={s.batch}
            onChange={(e) => update(i, "batch", e.target.value)}
            className="border p-2 rounded flex-1"
          />

          <button
            type="button"
            onClick={() => removeRow(i)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 rounded"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addRow}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          + Add Row
        </button>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          {loading ? "Creating…" : "Create Students"}
        </button>
      </div>
    </form>
  );
};
