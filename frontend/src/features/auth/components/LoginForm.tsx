// ✅ PRODUCTION — LoginForm
// src/features/auth/components/LoginForm.tsx

import { useEffect, useRef, type FC, FormEvent } from "react";

type Props = {
  role: "student" | "admin";
  setRole: (v: "student" | "admin") => void;

  username: string;
  setUsername: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  isLoading: boolean;
  isUnderCooldown: boolean;

  doLogin: () => void;
  setTurnstileToken: (token: string) => void;
};

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const LoginForm: FC<Props> = ({
  role,
  setRole,
  username,
  setUsername,
  password,
  setPassword,
  isLoading,
  isUnderCooldown,
  doLogin,
  setTurnstileToken,
}) => {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Global callback for Turnstile
    (window as any).onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
      window.dispatchEvent(new CustomEvent("turnstile-token", { detail: token }));
    };

    const renderWidget = () => {
      if (turnstileRef.current && (window as any).turnstile && !widgetIdRef.current) {
        widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: "onTurnstileSuccess",
          theme: "dark",
        });
      }
    };

    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    );

    if (existingScript) {
      // Script already loaded, just render the widget
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup the widget on unmount
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      delete (window as any).onTurnstileSuccess;
    };
  }, [setTurnstileToken]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading && !isUnderCooldown) doLogin();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          AUIP <span className="text-primary italic">Platform</span>
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold font-mono">
          Entrance Portal
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass p-8 rounded-3xl space-y-6 flex flex-col items-center w-full"
      >
        <div className="w-full space-y-4">
          {/* role selector */}
          {/* role selector */}
          <div className="relative group">
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "admin")}
              disabled={isUnderCooldown || isLoading}
              className="w-full p-4 bg-[#1a1a2e] border border-white/10 rounded-2xl text-white appearance-none focus:ring-2 focus:ring-primary/50 transition-all outline-none cursor-pointer pr-10"
              style={{ backgroundColor: "#1a1a2e", colorScheme: "dark" }}
            >
              <option value="student" className="bg-[#1a1a2e] text-white" style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}>
                🎓 Student Portal
              </option>
              <option value="admin" className="bg-[#1a1a2e] text-white" style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}>
                🔐 Administrator / Educator
              </option>
            </select>
            {/* Dropdown chevron */}
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* username */}
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isUnderCooldown || isLoading}
            required
            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
          />

          {/* password - only for admins */}
          {role !== "student" && (
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Security Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isUnderCooldown || isLoading}
              required
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
            />
          )}

          {role === "student" && (
            <p className="text-[10px] text-gray-500 text-center px-4 font-bold uppercase tracking-widest leading-relaxed">
              Password-less Access: An OTP will be sent to your institutional email.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || isUnderCooldown}
          className="w-full p-4 premium-gradient text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
        >
          {isUnderCooldown
            ? "COOLDOWN ACTIVE"
            : isLoading
              ? "AUTHENTICATING..."
              : role === "student" ? "REQUEST LOGIN OTP" : "ENTER PLATFORM"}
        </button>

        {/* Cloudflare Turnstile — explicit rendering */}
        <div className="flex flex-col items-center space-y-3 w-full">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Human Verification Identity
          </p>
          <div ref={turnstileRef} className="scale-90"></div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
