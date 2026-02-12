import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { useInstitutions } from "../hooks/useInstitutions";
import { InstitutionSelector, TurnstileWidget } from "../components";
import {
    ShieldCheck,
    Mail,
    Lock,
    KeyRound,
    ArrowRight,
    Loader2,
    ShieldAlert
} from "lucide-react";

export default function FacultyLogin() {
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
        emailHint,
        handleFacultyLogin,
        handleVerifyMFA
    } = useLoginV2VM();

    const { institutions, isLoading: loadingInstitutions } = useInstitutions();
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const onInitLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!turnstileToken) return;
        handleFacultyLogin();
    };

    const onVerifyMFA = (e: React.FormEvent) => {
        e.preventDefault();
        handleVerifyMFA();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white font-inter">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl">
                            <ShieldCheck className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter">
                            Faculty <span className="text-primary italic">Gateway</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black">
                            Institutional Administration System
                        </p>
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden backdrop-blur-3xl border border-white/5 shadow-2xl">
                    {!otpRequired ? (
                        <form onSubmit={onInitLogin} className="space-y-6">
                            <div className="space-y-4">
                                <InstitutionSelector
                                    institutions={institutions}
                                    selected={selectedInstitution}
                                    onSelect={setSelectedInstitution}
                                    isLoading={loadingInstitutions}
                                />

                                <div className="space-y-1 px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        <Mail className="w-3 h-3" />
                                        Institutional Email
                                    </label>
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-gray-700"
                                        placeholder="e.g. name@univ.edu"
                                        required
                                    />
                                </div>

                                <div className="space-y-1 px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        <Lock className="w-3 h-3" />
                                        Security Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-gray-700"
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>

                                <TurnstileWidget
                                    onSuccess={(token: string) => setTurnstileToken(token)}
                                    onExpire={() => setTurnstileToken(null)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !selectedInstitution || !turnstileToken}
                                className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Validating Credentials...
                                    </>
                                ) : (
                                    <>
                                        INITIATE MFA
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={onVerifyMFA} className="space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="text-center space-y-2">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                        <KeyRound className="w-8 h-8" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Security <span className="text-primary italic">Challenge</span></h2>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                    OTP sent to <span className="text-white font-mono">{emailHint}</span>
                                </p>
                            </div>

                            <div className="space-y-1 px-1 text-center">
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full bg-transparent border-b-4 border-white/10 focus:border-primary px-4 py-4 text-4xl text-center font-black tracking-[0.5em] outline-none transition-all placeholder:text-gray-800"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.length < 6}
                                className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verifying Identity...
                                    </>
                                ) : (
                                    <>
                                        VERIFY & ENTER
                                        <ShieldCheck className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="text-center pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                            Multi-Factor Authentication Required
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4">
                    <Link
                        to="/auth/student/login"
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                    >
                        ← Student Portal
                    </Link>
                    <Link
                        to="/register-university"
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:scale-105 transition-all flex items-center gap-2"
                    >
                        Institution Hub
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
