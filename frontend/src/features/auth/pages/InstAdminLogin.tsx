import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { useInstitutions } from "../hooks/useInstitutions";
import { TurnstileWidget, InstitutionSelector, PremiumOTPModal } from "../components";
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
    Users,
    ChevronRight,
    History
} from "lucide-react";

type AuthType = "inst_admin" | "educator";

export default function InstAdminLogin() {
    const navigate = useNavigate();
    const {
        selectedInstitution,
        setSelectedInstitution,
        identifier,
        setIdentifier,
        password,
        setPassword,
        otp,
        setOtp,
        otpRequired,
        isLoading,
        handleAdminLogin,
        handleFacultyLogin,
        handleVerifyMFA,
        turnstileToken,
        setTurnstileToken,
        onTurnstileExpire,
        turnstileSiteKey,
        turnstileKey,
        emailHint,
        setOtpRequired,
        rememberDevice,
        setRememberDevice,
        handleResendAdminOTP,
        resendCooldown
    } = useLoginV2VM();

    const { institutions, isLoading: loadingInstitutions } = useInstitutions();
    const [authType, setAuthType] = useState<AuthType>("inst_admin");
    const [showPassword, setShowPassword] = useState(false);

    // Reset fields on toggle
    const handleToggle = (type: AuthType) => {
        setAuthType(type);
        setOtpRequired(false);
        setOtp("");
        setIdentifier("");
        setPassword("");
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // The button's disabled state already handles !selectedInstitution and !turnstileToken
        // If the form is submitted, these conditions must be met.

        if (otpRequired) {
            handleVerifyMFA(authType === "inst_admin" ? "INSTITUTION_ADMIN" : "FACULTY");
            return;
        }

        if (authType === "inst_admin") {
            // Institutional Admin login (v2 admin path + institution_id)
            handleAdminLogin();
        } else {
            // Educator / SPOC login (v2 faculty path)
            handleFacultyLogin();
        }
    };

    const isFormValid = !!(identifier && password && selectedInstitution && turnstileToken);

    return (
        <div
            className="flex items-center justify-center min-h-screen p-4 font-inter transition-colors duration-300"
            style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
        >
            {/* Background Accent */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]" style={{ background: "var(--primary-glow)" }} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.08)" }} />
            </div>

            <div className="w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xl">
                            <Building2 className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                        Institutional <span className="text-primary not-italic">Portal</span>
                    </h1>
                    <p className="text-slate-500 dark:text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black">
                        Centralized Administration & Faculty Gateway
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-white/[0.02] border border-black/5 dark:border-white/10 rounded-[3rem] p-4 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] backdrop-blur-3xl overflow-hidden relative">

                    {/* Role Toggle — Hidden during MFA for focused flow */}
                    {!otpRequired && (
                        <div className="flex p-2 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] mb-8 relative">
                            <button
                                type="button"
                                onClick={() => handleToggle("inst_admin")}
                                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all z-10 ${authType === "inst_admin" ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-lg" : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Admin
                            </button>
                            <button
                                type="button"
                                onClick={() => handleToggle("educator")}
                                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all z-10 ${authType === "educator" ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-lg" : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"}`}
                            >
                                <Users className="w-4 h-4" />
                                Educator / SPOC
                            </button>
                        </div>
                    )}

                    <div className="px-6 pb-8 space-y-8">
                        {!otpRequired ? (
                            <form onSubmit={onSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <InstitutionSelector
                                        institutions={institutions}
                                        selected={selectedInstitution}
                                        onSelect={setSelectedInstitution}
                                        isLoading={loadingInstitutions}
                                    />

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                            <Mail className="w-3 h-3" />
                                            Professional Email
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-gray-700"
                                                placeholder="e.g. administrator@university.edu"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                            <Lock className="w-3 h-3" />
                                            Access Key
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium pr-14 placeholder:text-slate-400 dark:placeholder:text-gray-700"
                                                placeholder="Enter credentials"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <TurnstileWidget
                                            key={turnstileKey}
                                            siteKey={turnstileSiteKey}
                                            onSuccess={setTurnstileToken}
                                            onExpire={onTurnstileExpire}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !isFormValid}
                                    className="w-full py-5 premium-gradient text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Authenticating Identity...
                                        </>
                                    ) : (
                                        <>
                                            Access Dashboard
                                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <ShieldCheck className="w-8 h-8 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">MFA Challenge Active</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Please complete verification in the secure overlay</p>
                                </div>
                                <button
                                    onClick={() => setOtpRequired(false)}
                                    className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors flex items-center gap-2 mt-4"
                                >
                                    <History className="w-3 h-3" />
                                    Return to Login
                                </button>
                            </div>
                        )}

                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-slate-400 dark:text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                                Professional Access Protocol // Secure Identity Vault
                            </p>
                        </div>
                    </div>
                </div>

                {/* Secondary Actions — Hidden during MFA for high-security focused flow */}
                {!otpRequired && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6">
                        <Link
                            to="/auth/student/login"
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all flex items-center gap-2"
                        >
                            ← User / Student Portal
                        </Link>
                        <Link
                            to="/register-university"
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:scale-105 transition-all flex items-center gap-2 group"
                        >
                            Register Institution
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                )}

                <p className="text-center text-[9px] text-slate-300 dark:text-gray-800 uppercase tracking-[0.3em] font-black">
                    Institutional Governance // Corporate Infrastructure
                </p>
            </div>

            {/* Premium MFA Overlay */}
            <PremiumOTPModal
                open={otpRequired}
                onOpenChange={setOtpRequired}
                otp={otp}
                setOtp={setOtp}
                onVerify={() => handleVerifyMFA(authType === "inst_admin" ? "INSTITUTION_ADMIN" : "FACULTY")}
                isLoading={isLoading}
                emailHint={emailHint || identifier}
                onResend={handleResendAdminOTP}
                resendCooldown={resendCooldown}
                rememberDevice={rememberDevice}
                setRememberDevice={setRememberDevice}
            />
        </div>
    );

    // Helpers for specific role verification
    function onVerifyMFA(e: React.FormEvent) {
        e.preventDefault();
        handleVerifyMFA(authType === "inst_admin" ? "INSTITUTION_ADMIN" : "FACULTY");
    }
}
