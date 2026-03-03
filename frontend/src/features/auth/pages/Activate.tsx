import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { v2AuthApi } from "../api/v2AuthApi";
import { toast } from "react-hot-toast";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    Lock,
    KeyRound,
    ArrowRight,
    UserCheck
} from "lucide-react";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import { setAccessToken } from "../utils/tokenStorage";
import { hydratePassport } from "../api/passportApi";

interface TokenInfo {
    email: string;
    identifier: string;
    role: string;
    already_activated: boolean;
}

export default function Activate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Token validation state
    const [validating, setValidating] = useState(true);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setValidating(false);
            return;
        }

        const validateToken = async () => {
            try {
                const res = await v2AuthApi.validateActivationToken(token);
                if (res.success && res.data) {
                    setTokenInfo(res.data);
                } else {
                    setTokenError(res.message || "Invalid activation link.");
                }
            } catch (err: any) {
                const msg = err.response?.data?.message || err.response?.data?.detail || "Invalid or expired activation link.";
                setTokenError(msg);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error("Invalid activation link.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await v2AuthApi.activateAccount({
                token,
                password
            });
            if (res.success && res.data) {
                setSuccess(true);
                toast.success("Account activated successfully!");

                // 🚀 Perform Auto-Login
                if (res.data.access) {
                    setAccessToken(res.data.access);
                    const boot = await hydratePassport();
                    if (boot.success && boot.user) {
                        setUser(boot.user);
                    }
                }

                // Redirect to dashboard after a short delay
                const role = (res.data.user?.role || "").toUpperCase();
                let target = "/student-dashboard";
                if (role === "FACULTY") target = "/faculty-dashboard";
                else if (role === "INSTITUTION_ADMIN" || role === "INST_ADMIN") target = "/institution/dashboard";
                else if (role === "SUPER_ADMIN") target = "/superadmin/dashboard";

                setTimeout(() => navigate(target), 2000);
            } else {
                toast.error(res.message || "Activation failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Something went wrong during activation.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── SUCCESS STATE ──
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-center">
                        <div className="w-24 h-24 rounded-[2.5rem] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/40 animate-bounce">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black mb-2">Activation <span className="text-primary italic">Complete</span></h1>
                        <p className="text-gray-400 text-sm">
                            Your account has been successfully verified. You can now use your new password to log in.
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 w-full py-4 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 transition-all"
                    >
                        Go to Login
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    // ── NO TOKEN ──
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Invalid <span className="text-red-500 italic">Link</span></h1>
                        <p className="text-gray-500 text-sm mt-2">The activation link is missing or malformed.</p>
                    </div>
                    <Link
                        to="/login"
                        className="inline-block w-full py-4 glass border-white/5 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                    >
                        Return to Portal
                    </Link>
                </div>
            </div>
        );
    }

    // ── VALIDATING TOKEN ──
    if (validating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in fade-in duration-500">
                    <div className="flex justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Verifying <span className="text-primary italic">Link</span></h1>
                        <p className="text-gray-500 text-sm mt-2">Validating your activation credentials...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── TOKEN ERROR ──
    if (tokenError) {
        const isReplaced = tokenError.toLowerCase().includes("replaced") || tokenError.toLowerCase().includes("invalidated");
        const isExpired = tokenError.toLowerCase().includes("expired");
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-center">
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${isReplaced ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-red-500/10 border border-red-500/20 text-red-500"}`}>
                            <AlertCircle className="w-10 h-10" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                            {isReplaced
                                ? <>Link <span className="text-amber-400 italic">Superseded</span></>
                                : isExpired
                                    ? <>Link <span className="text-red-500 italic">Expired</span></>
                                    : <>Invalid <span className="text-red-500 italic">Link</span></>}
                        </h1>
                        <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                            {isReplaced
                                ? "Your administrator issued a new activation link. This old link has been superseded — please check your email for the latest invitation."
                                : isExpired
                                    ? "This activation link has expired (links are valid for 7 days). Contact your administrator to resend a fresh invitation."
                                    : tokenError}
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 w-full py-4 glass border-white/5 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                    >
                        Return to Portal <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    // ── ALREADY ACTIVATED ──
    if (tokenInfo?.already_activated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                            <UserCheck className="w-10 h-10" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Already <span className="text-green-400 italic">Activated</span></h1>
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                            <strong className="text-white">{tokenInfo.email}</strong> is already active.
                            <br />This link has been permanently invalidated — please log in with your existing credentials.
                        </p>
                        {tokenInfo.identifier && tokenInfo.identifier !== tokenInfo.email && (
                            <p className="mt-2 text-xs text-gray-600">ID: {tokenInfo.identifier}</p>
                        )}
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 w-full py-4 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 transition-all"
                    >
                        Go to Login <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    // ── ACTIVATION FORM ──
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4 font-inter text-white">
            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                        Account <span className="text-primary italic">Initialization</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                        Set your secure access credentials
                    </p>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden">
                    {/* User info banner */}
                    {tokenInfo && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-1">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{tokenInfo.role}</p>
                            <p className="text-sm text-white font-semibold">{tokenInfo.email}</p>
                            {tokenInfo.identifier !== tokenInfo.email && (
                                <p className="text-xs text-gray-400">ID: {tokenInfo.identifier}</p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleActivate} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <Lock className="w-3 h-3" />
                                    New Security Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="Min. 8 characters"
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <KeyRound className="w-3 h-3" />
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="Repeat password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Finalizing Setup...
                                </>
                            ) : (
                                "ACTIVATE ACCOUNT"
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed text-center">
                        By activating, you agree to the institutional <br /> data governance policies.
                    </p>
                </div>
            </div>
        </div>
    );
}
