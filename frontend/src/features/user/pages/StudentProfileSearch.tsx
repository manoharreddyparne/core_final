// ✅ FINAL — UPGRADED
// src/features/user/pages/StudentProfileSearch.tsx

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

import { searchStudents, type Student } from "../api/userApi";

export default function StudentProfileSearch() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const results = await searchStudents({
        roll_number: query,
        batch: query,
      });

      setStudents(results ?? []);

      if (!results?.length) {
        toast.error("No matching students found.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Search failed.");
      console.error("SearchStudents Error:", err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!query.length) {
      setStudents([]);
      return;
    }

    const t = setTimeout(() => {
      if (query.trim().length > 2) handleSearch();
    }, 400);

    return () => clearTimeout(t);
  }, [query, handleSearch]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Student Search</h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by roll / batch"
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

      {!!students.length && (
        <p className="text-gray-500 text-sm">{students.length} results</p>
      )}

      <div className="space-y-2">
        {students.map((s) => (
          <Link
            key={s.id}
            to={`/admin/students/${s.id}`}
            className="block border p-3 rounded hover:bg-gray-50 transition"
          >
            <p className="font-semibold">
              {s.first_name} {s.last_name}
            </p>
            <p className="text-sm text-gray-500">{s.email}</p>

            {s.batch && (
              <p className="text-xs text-gray-400 font-mono mt-1">{s.batch}</p>
            )}
          </Link>
        ))}

        {!students.length && !loading && (
          <p className="text-center text-gray-500">No results</p>
        )}
      </div>
    </div>
  );
}
