import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { v2AuthApi } from "../api/v2AuthApi";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import { setAccessToken } from "../utils/tokenStorage";
import { toast } from "react-hot-toast";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    Lock,
    KeyRound,
    ArrowRight,
    Building2
} from "lucide-react";

export default function InstAdminActivate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

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
            const res = await v2AuthApi.instAdminActivate({ token, password });
            if (res.success && res.data) {
                // Auto-login: store JWT + set user from backend response
                setAccessToken(res.data.access!);
                setUser(res.data.user);
                setSuccess(true);
                toast.success("Account activated! Redirecting to dashboard...");
                setTimeout(() => navigate("/dashboard"), 2000);
            } else {
                toast.error(res.message || "Activation failed.");
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.detail || "Activation failed. The link may have expired.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

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
                        <h1 className="text-3xl font-black mb-2">Welcome <span className="text-primary italic">Admin</span></h1>
                        <p className="text-gray-400 text-sm">
                            Your administrator account has been activated. Redirecting to your dashboard...
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="flex items-center justify-center gap-2 w-full py-4 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 transition-all"
                    >
                        Go to Dashboard
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

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
                        <p className="text-gray-500 text-sm mt-2">The activation link is missing or malformed. Please check your email for the correct link.</p>
                    </div>
                    <Link
                        to="/auth/inst-admin/login"
                        className="inline-block w-full py-4 glass border-white/5 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                    >
                        Go to Admin Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4 font-inter text-white">
            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Building2 className="w-10 h-10" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                        Admin <span className="text-primary italic">Activation</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black">
                        Set up your institutional administrator credentials
                    </p>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden">
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
                                    Activating Account...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    ACTIVATE ADMIN ACCOUNT
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed text-center">
                        By activating, you accept responsibility <br /> for your institution&apos;s data governance.
                    </p>
                </div>
            </div>
        </div>
    );
}
