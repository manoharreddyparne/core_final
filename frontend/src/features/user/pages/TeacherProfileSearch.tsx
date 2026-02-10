// ✅ FINAL — UPGRADED
// src/features/user/pages/TeacherProfileSearch.tsx

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

import { searchTeachers, type Teacher } from "../api/userApi";

export default function TeacherProfileSearch() {
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const results = await searchTeachers({
        email: query,
        department: query,
      });

      setTeachers(results ?? []);

      if (!results?.length) {
        toast.error("No matching teachers found.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Search failed.");
      console.error("SearchTeachers Error:", err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!query.length) {
      setTeachers([]);
      return;
    }

    const t = setTimeout(() => {
      if (query.trim().length > 2) handleSearch();
    }, 400);

    return () => clearTimeout(t);
  }, [query, handleSearch]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Teacher Search</h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by email / dept"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 rounded flex-1"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {!!teachers.length && (
        <p className="text-gray-500 text-sm">{teachers.length} results</p>
      )}

      <div className="space-y-2">
        {teachers.map((t) => (
          <Link
            key={t.id}
            to={`/admin/teachers/${t.id}`}
            className="block border p-3 rounded hover:bg-gray-50 transition"
          >
            <p className="font-semibold">
              {t.first_name} {t.last_name}
            </p>
            <p className="text-sm text-gray-500">{t.email}</p>

            {t.department && (
              <p className="text-xs text-gray-400 font-mono mt-1">
                {t.department}
              </p>
            )}
          </Link>
        ))}

        {!teachers.length && !loading && (
          <p className="text-center text-gray-500">No results</p>
        )}
      </div>
    </div>
  );
}
