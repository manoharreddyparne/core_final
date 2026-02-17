import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import { TurnstileWidget } from "../components";
import { toast } from "react-hot-toast";
import {
    Building2,
    Lock,
    User,
    ArrowRight,
    Loader2,
    ShieldCheck,
    KeyRound,
    Mail,
    Eye,
    EyeOff,
} from "lucide-react";

type Phase = "credentials" | "otp";

export default function InstAdminLogin() {
    const navigate = useNavigate();
    const { adminLogin, user } = useAuth();
    const { login, verifyOTP } = adminLogin;

    // Redirect if already logged in
    useEffect(() => {
        if (user) navigate("/dashboard", { replace: true });
    }, [user, navigate]);

    const [phase, setPhase] = useState<Phase>("credentials");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [rememberDevice, setRememberDevice] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    // Store user_id for OTP phase
    const otpMeta = useRef<{ userId: number; password: string }>({
        userId: 0,
        password: "",
    });

    /* ─── Phase 1: Email + Password ─── */
    const handleLogin = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!email.trim() || !password) {
                toast.error("Email and password are required.");
                return;
            }

            setSubmitting(true);
            try {
                const res = await login(email.trim(), password, turnstileToken ?? undefined);

                if (res.require_otp && res.user_id) {
                    // OTP required (untrusted device)
                    otpMeta.current = { userId: res.user_id, password };
                    setPhase("otp");
                    toast("OTP sent to your registered email.", { icon: "📧" });
                } else if (res.success) {
                    // Trusted device — direct login
                    toast.success("Welcome back, Admin!");
                    navigate("/dashboard");
                } else {
                    toast.error(res.message || "Login failed.");
                }
            } catch (err: any) {
                toast.error(err.response?.data?.message || "Authentication failed.");
            } finally {
                setSubmitting(false);
            }
        },
        [email, password, turnstileToken, login, navigate]
    );

    /* ─── Phase 2: OTP Verification ─── */
    const handleOTP = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (otp.length < 6) {
                toast.error("Enter the 6-digit OTP.");
                return;
            }

            setSubmitting(true);
            try {
                const res = await verifyOTP(
                    otpMeta.current.userId,
                    otp,
                    otpMeta.current.password,
                    rememberDevice
                );

                if (res.success) {
                    toast.success("Login successful!");
                    navigate("/dashboard");
                } else {
                    toast.error(res.message || "OTP verification failed.");
                }
            } catch (err: any) {
                toast.error(err.response?.data?.message || "OTP verification failed.");
            } finally {
                setSubmitting(false);
            }
        },
        [otp, rememberDevice, verifyOTP, navigate]
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4 font-inter text-white">
            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Building2 className="w-10 h-10" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                        Admin <span className="text-primary italic">Login</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                        Institutional Administrator Portal
                    </p>
                </div>

                {/* Form Card */}
                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden">
                    {phase === "credentials" ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email */}
                                <div className="space-y-1 px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        <Mail className="w-3 h-3" />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                        placeholder="admin@institution.edu"
                                        autoFocus
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-1 px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        <Lock className="w-3 h-3" />
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium pr-12"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Turnstile */}
                            <TurnstileWidget onSuccess={setTurnstileToken} />

                            <button
                                type="submit"
                                disabled={submitting || !turnstileToken}
                                className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        SIGN IN
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* OTP Phase */
                        <form onSubmit={handleOTP} className="space-y-6">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold uppercase tracking-widest">
                                    <KeyRound className="w-3 h-3" />
                                    Two-Factor Authentication
                                </div>
                                <p className="text-gray-500 text-xs mt-3">
                                    A verification code was sent to your email.
                                </p>
                            </div>

                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <KeyRound className="w-3 h-3" />
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-center text-2xl tracking-[0.5em]"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                    required
                                />
                            </div>

                            {/* Remember device checkbox */}
                            <label className="flex items-center gap-3 px-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberDevice}
                                    onChange={(e) => setRememberDevice(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                />
                                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                                    Trust this device (skip OTP next time)
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={submitting || otp.length < 6}
                                className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="w-5 h-5" />
                                        VERIFY & SIGN IN
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPhase("credentials");
                                    setOtp("");
                                }}
                                className="w-full py-3 text-gray-500 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                                ← Back to Login
                            </button>
                        </form>
                    )}

                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed text-center">
                        Your session is protected by Quantum Shield <br /> &amp; adaptive multi-factor authentication.
                    </p>
                </div>

                {/* Footer link */}
                <div className="text-center">
                    <Link
                        to="/login"
                        className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors"
                    >
                        Student / Faculty Login →
                    </Link>
                </div>
            </div>
        </div>
    );
}
