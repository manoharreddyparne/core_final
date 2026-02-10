// ✅ FINAL
import { useEffect } from "react";
import { useSecurity } from "../hooks/useSecurity";
import { toast } from "react-hot-toast";

export default function SecuritySessions() {
  const { sessions, load, logoutOne, logoutAll, loading } = useSecurity();

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !sessions)
    return <div className="py-10 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Active Sessions</h2>

      <button
        onClick={async () => {
          await logoutAll();
          toast.success("Logged out from all devices");
        }}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Logout All
      </button>

      <div className="space-y-2 mt-4">
        {sessions.recent_sessions?.map((s, idx) => (
          <div
            key={s.id ?? idx}
            className="border p-3 rounded flex justify-between items-center"
          >
            <div>
              <p>IP: {s.ip_address}</p>
              <p>OS: {s.os ?? "Unknown"}</p>
              <p>Browser: {s.browser ?? "Unknown"}</p>
              <p>Last Active: {s.last_active}</p>
            </div>

            <button
              onClick={async () => {
                await logoutOne(s.id);
                toast.success("Session terminated");
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
