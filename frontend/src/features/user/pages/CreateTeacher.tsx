// ✅ FINAL — Cleaner, truth-in-data implementation
// src/features/user/pages/CreateTeacher.tsx

import { useState } from "react";
import { toast } from "react-hot-toast";
import { createTeacher } from "../api/userApi";

export const CreateTeacher = () => {
  const [form, setForm] = useState({
    email: "",
    department: "",
  });

  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createTeacher({
        email: form.email.trim(),
        department: form.department ? form.department.trim() : "",
      });

      const first = res?.created?.[0];

      if (first?.email) {
        toast.success(`✅ Teacher Created: ${first.email}`);
      } else {
        toast.success("✅ Teacher processed.");
      }

      // 🔄 reset form
      setForm({
        email: "",
        department: "",
      });
    } catch (err: any) {
      console.error("Create teacher error:", err);
      toast.error(err?.message || "Failed to create teacher.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4">
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        required
        className="border p-2 rounded w-full"
      />

      <input
        type="text"
        placeholder="Department"
        value={form.department}
        onChange={(e) => update("department", e.target.value)}
        className="border p-2 rounded w-full"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700 transition disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Teacher"}
      </button>
    </form>
  );
};
