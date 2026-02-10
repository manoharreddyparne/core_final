// ✅ FINAL
import { useEffect } from "react";
import { useSecurity } from "../hooks/useSecurity";

export default function SecurityOverview() {
  const { overview, load, loading } = useSecurity();

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !overview)
    return <div className="py-10 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Security Overview</h2>

      <div className="border rounded p-4">
        <p>
          <strong>Last Login:</strong>{" "}
          {overview.last_login ?? "No record"}
        </p>
      </div>

      <div>
        <h3 className="font-semibold">Recent Devices</h3>
        <div className="space-y-2 mt-2">
          {overview.recent_devices?.length ? (
            overview.recent_devices.map((dev, idx) => (
              <div key={idx} className="border p-2 rounded">
                <p>IP: {dev.ip_address}</p>
                <p>UA: {dev.user_agent}</p>
                <p>Last Active: {dev.last_active}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}
