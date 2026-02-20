import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { useInstitutions } from "../hooks/useInstitutions";
import { InstitutionSelector, TurnstileWidget } from "../components";
import {
    ShieldCheck,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    KeyRound,
    AlertCircle
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
        isLoading,
        otpRequired,
        emailHint,
        handleFacultyLogin,
        handleVerifyMFA,
        turnstileToken,
        setTurnstileToken,
        onTurnstileExpire,
        turnstileSiteKey,
        turnstileKey,
        rememberDevice,
        setRememberDevice
    } = useLoginV2VM();

    const { institutions, isLoading: loadingInstitutions } = useInstitutions();

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otpRequired) {
            handleVerifyMFA();
        } else {
            handleFacultyLogin();
        }
    };

    const isLoginValid = identifier && password && selectedInstitution && turnstileToken;
    const isMFAValid = otp.length === 6;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white font-inter">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl group">
                            <ShieldCheck className="w-10 h-10 text-blue-400 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter">
                            Faculty <span className="text-blue-400 italic">Access</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black">
                            Academic Governance Protocol
                        </p>
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden backdrop-blur-3xl border border-white/5 shadow-2xl">
                    <form onSubmit={onSubmit} className="space-y-6">
                        {!otpRequired ? (
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
                                        Official Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder:text-gray-700"
                                        placeholder="name@university.edu"
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
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder:text-gray-700"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <TurnstileWidget
                                    key={turnstileKey}
                                    siteKey={turnstileSiteKey}
                                    onSuccess={setTurnstileToken}
                                    onExpire={onTurnstileExpire}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center space-y-2">
                                    <div className="flex justify-center">
                                        <KeyRound className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Two-Factor Authentication</h3>
                                    <p className="text-xs text-gray-400">
                                        A verification code has been dispatched to:<br />
                                        <strong className="text-blue-300">{emailHint}</strong>
                                    </p>
                                </div>

                                <div className="space-y-1 px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                        Verification Code (6-Digits)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-5 py-5 bg-white/5 border border-white/20 rounded-2xl text-white text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-800"
                                        placeholder="000000"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center gap-3 px-2">
                                    <label className="relative flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={rememberDevice}
                                            onChange={(e) => setRememberDevice(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 bg-white/5 border border-white/10 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                                            <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 mb-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="ml-3 text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">
                                            Trust this device for 30 days
                                        </span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-2 px-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    <AlertCircle className="w-3 h-3" />
                                    Checking institutional secure relay...
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || (!otpRequired ? !isLoginValid : !isMFAValid)}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {otpRequired ? "Verifying..." : "Authenticating..."}
                                </>
                            ) : (
                                <>
                                    {otpRequired ? "VERIFY & ENTER" : "PROCEED TO MFA"}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                            Secured by AUIP Faculty Security Framework
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4">
                    <Link
                        to="/auth/student/login"
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                    >
                        ← Student Entrance
                    </Link>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                    >
                        Trouble Accessing?
                    </button>
                </div>
            </div>
        </div>
    );
}
