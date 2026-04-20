import React from "react";
import { Link } from "react-router-dom";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { useInstitutions } from "../hooks/useInstitutions";
import { InstitutionSelector, TurnstileWidget } from "../components";
import { GraduationCap, User, Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function StudentLogin() {
    const {
        selectedInstitution,
        setSelectedInstitution,
        identifier,
        setIdentifier,
        password,
        setPassword,
        isLoading,
        handleStudentLogin,
        turnstileToken,
        setTurnstileToken,
        onTurnstileExpire,
        turnstileSiteKey,
        turnstileKey,
    } = useLoginV2VM();

    const { institutions, isLoading: loadingInstitutions } = useInstitutions();

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleStudentLogin();
    };

    const isFormValid = identifier && password && selectedInstitution && turnstileToken;

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen p-4 font-inter transition-colors duration-300"
            style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
        >
            {/* Ambient glows */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ background: "var(--primary-glow)" }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.08)" }} />
            </div>

            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div
                            className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl backdrop-blur-xl border"
                            style={{ background: "var(--glass-bg)", borderColor: "var(--border)" }}
                        >
                            <GraduationCap className="w-10 h-10 text-blue-400" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter">
                            Student{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 italic">
                                Portal
                            </span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black" style={{ color: "var(--text-muted)" }}>
                            Institutional Intelligence Gateway
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div
                    className="p-8 rounded-[3rem] space-y-8 relative overflow-hidden border"
                    style={{ background: "var(--glass-bg)", backdropFilter: "blur(24px)", borderColor: "var(--border)" }}
                >
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <InstitutionSelector
                                institutions={institutions}
                                selected={selectedInstitution}
                                onSelect={setSelectedInstitution}
                                isLoading={loadingInstitutions}
                            />

                            {/* Identifier */}
                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-2" style={{ color: "var(--text-muted)" }}>
                                    <User className="w-3 h-3" /> Roll Number / Email
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl outline-none font-mono transition-all"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border)",
                                        color: "var(--text-primary)",
                                        fontSize: "14px",
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                                    placeholder="e.g. 2024CS001"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-2" style={{ color: "var(--text-muted)" }}>
                                    <Lock className="w-3 h-3" /> Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl outline-none transition-all"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border)",
                                        color: "var(--text-primary)",
                                        fontSize: "14px",
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                                    placeholder="Enter your password"
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

                        <button
                            type="submit"
                            disabled={isLoading || !isFormValid}
                            className="w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest premium-gradient hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-3 shadow-2xl"
                            style={{ boxShadow: "0 8px 32px var(--primary-glow)" }}
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Accessing Data...</>
                            ) : (
                                <>ENTER DASHBOARD <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
                            <ShieldCheck className="w-3 h-3" /> Secured by Nexora Zero-Trust Infrastructure
                        </p>
                    </div>
                </div>

                {/* Footer links */}
                <div className="flex justify-between items-center px-4">
                    <Link
                        to="/activate-request"
                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        First Time? Activate <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                        to="/auth/inst-admin/login"
                        className="text-[10px] font-black uppercase tracking-widest transition-all hover:text-blue-400"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Faculty / Admin →
                    </Link>
                </div>
            </div>
        </div>
    );
}

