// ✅ FINAL — Secure device enrollment
// src/features/auth/pages/SecureDevice.tsx

import { useState } from "react";
import { useAuth } from "../context/AuthProvider/AuthProvider";

const SecureDevice = () => {
  // secureNow comes from useSecureRotation (auth context auto bundles it)
  const { secureNow } = useAuth();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleSecureDevice = async () => {
    if (!secureNow) {
      console.warn("secureNow() not found");
      setErr("Unavailable. Try re-logging in.");
      return;
    }

    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await secureNow();

      if (res?.access) {
        setMsg("✅ Device trusted + session secured.");
      } else {
        setErr("Something went sideways — try again.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed securing device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-900 rounded-xl shadow text-white space-y-4">
      <h1 className="text-2xl font-bold">Secure This Device</h1>

      {msg && <p className="text-green-400 font-medium">{msg}</p>}
      {err && <p className="text-red-400 font-medium">{err}</p>}

      <button
        onClick={handleSecureDevice}
        disabled={loading}
        className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        {loading ? "Processing…" : "Mark Device as Trusted"}
      </button>
    </div>
  );
};

export default SecureDevice;
