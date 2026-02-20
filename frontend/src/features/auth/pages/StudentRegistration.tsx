import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { useInstitutions } from "../hooks/useInstitutions";
import { InstitutionSelector, TurnstileWidget } from "../components";
import {
    UserCheck,
    Mail,
    Hash,
    ArrowRight,
    Loader2,
    ShieldCheck,
    Building2
} from "lucide-react";

export default function StudentRegistration() {
    const {
        selectedInstitution,
        setSelectedInstitution,
        identifier,
        setIdentifier,
        email,
        setEmail,
        isLoading,
        handleCheckIdentity,
        turnstileToken,
        setTurnstileToken,
        onTurnstileExpire,
        turnstileSiteKey,
        turnstileKey
    } = useLoginV2VM();

    const { institutions, isLoading: loadingInstitutions } = useInstitutions();

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleCheckIdentity();
    };

    const isFormValid = identifier && email && selectedInstitution && turnstileToken;

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-[#0a0a0b] py-8 px-4 text-white font-inter overflow-y-auto">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl">
                            <UserCheck className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase">
                            Student <span className="text-primary italic">Registration</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black">
                            Verify Identity & Claim Account
                        </p>
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 relative overflow-hidden backdrop-blur-3xl border border-white/5 shadow-2xl">
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <InstitutionSelector
                                institutions={institutions}
                                selected={selectedInstitution}
                                onSelect={setSelectedInstitution}
                                isLoading={loadingInstitutions}
                            />

                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <Hash className="w-3 h-3" />
                                    Roll Number / ID
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-gray-700 font-mono"
                                    placeholder="e.g. 2024CS101"
                                    required
                                />
                            </div>

                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <Mail className="w-3 h-3" />
                                    Registered Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-gray-700"
                                    placeholder="The email on record"
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
                            className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying Identity...
                                </>
                            ) : (
                                <>
                                    GET ACTIVATION LINK
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                            Identity verification is mandatory for multi-tenant schema assignment
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4">
                    <Link
                        to="/auth/student/login"
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:scale-105 transition-all flex items-center gap-2"
                    >
                        ← Back to Login
                    </Link>
                    <div className="flex items-center gap-2 text-[9px] text-gray-700 font-black uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
                        Identity Protocol V2.1
                    </div>
                </div>
            </div>
        </div>
    );
}
