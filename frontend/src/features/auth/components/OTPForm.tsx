// ✅ src/features/auth/components/OTPForm.tsx

import type { FC, FormEvent } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

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
    <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl shadow-primary/20 animate-pulse">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Identity <span className="text-primary italic">Verification</span>
        </h1>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-black font-mono">
          Final Security Perimeter
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass p-8 rounded-[3rem] space-y-8 flex flex-col items-center w-full relative overflow-hidden"
      >
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">
            A secure one-time code has been sent to your
            <span className="text-white font-bold ml-1">institutional email</span>.
          </p>
        </div>

        <div className="w-full space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4">
            Access Token (OTP)
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0 0 0 0 0 0"
            value={otp}
            onChange={(e) => setOTP(e.target.value)}
            maxLength={6}
            required
            disabled={isLoading || isUnderCooldown}
            className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] text-white text-center text-4xl font-black tracking-[0.5em] placeholder-gray-800 focus:ring-4 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || isUnderCooldown || otp.length < 4}
          className="w-full p-6 premium-gradient text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
        >
          {isUnderCooldown ? (
            "LOCKDOWN ACTIVE"
          ) : isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              VERIFYING...
            </>
          ) : (
            "BRIDGE CONNECTION"
          )}
        </button>

        <div className="w-full pt-4 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
            Tokens expire in 10 minutes. <br /> Check spam folders if not received.
          </p>
        </div>
      </form>
    </div>
  );
};

export default OTPForm;
