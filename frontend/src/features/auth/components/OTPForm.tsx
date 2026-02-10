// ✅ FINAL — OTPForm
// src/features/auth/components/OTPForm.tsx

import type { FC, FormEvent } from "react";

type Props = {
  otp: string;
  setOTP: (v: string) => void;

  isLoading: boolean;
  isUnderCooldown: boolean;

  doVerifyOTP: () => void;
};

const OTPForm: FC<Props> = ({
  otp,
  setOTP,
  doVerifyOTP,
  isLoading,
  isUnderCooldown,
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading && !isUnderCooldown) doVerifyOTP();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-gray-900 rounded-2xl shadow-xl text-white space-y-6"
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOTP(e.target.value)}
        required
        disabled={isLoading || isUnderCooldown}
        className="p-3 w-full bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={isLoading || isUnderCooldown}
        className="p-3 w-full bg-purple-600 rounded hover:bg-purple-700 transition disabled:opacity-50"
      >
        {isUnderCooldown
          ? "Wait…"
          : isLoading
          ? "Verifying…"
          : "Verify OTP"}
      </button>
    </form>
  );
};

export default OTPForm;
