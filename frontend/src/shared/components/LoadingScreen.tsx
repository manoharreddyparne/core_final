// ✅ src/shared/components/LoadingScreen.tsx
import { Shield, Activity, Terminal } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

export const LoadingScreen = ({ 
  message = "Verifying your connection...", 
  subtitle = "Please wait a moment while we secure your session" 
}: LoadingScreenProps) => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] text-white font-mono overflow-hidden relative">
      {/* 🌌 Neural Matrix Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/10 to-transparent" />
      </div>

      {/* 🚀 Advanced Handshake Animation */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-32 h-32 mb-12">
          {/* Orbital Rings */}
          <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-[spin_3s_linear_infinite]" />
          <div className="absolute inset-2 border border-blue-400/10 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-4 border-t-2 border-blue-500 rounded-full animate-spin" />
          
          {/* Scanning Pulse */}
          <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse blur-xl" />
          
          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-10 h-10 text-blue-500 animate-[pulse_2s_ease-in-out_infinite]" />
          </div>

          {/* Data Points */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-1 h-3 bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-1 h-3 bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-3 bg-blue-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* 📟 Terminal Messaging */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-3 text-blue-400/80">
            <Terminal className="w-4 h-4" />
            <p className="text-[12px] font-black uppercase tracking-[0.2em] animate-pulse">
              {message}
            </p>
          </div>
          
          <div className="h-0.5 w-64 bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent w-1/2 animate-[shimmer_1.5s_infinite]" />
          </div>

          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
            {subtitle}
          </p>
        </div>

        {/* Status Feed */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-30 whitespace-nowrap">
           <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-[8px] font-black uppercase">Secure</span>
           </div>
           <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-green-500" />
              <span className="text-[8px] font-black uppercase">Verified</span>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
