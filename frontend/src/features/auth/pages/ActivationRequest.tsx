import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { v2AuthApi } from "../api/v2AuthApi";
import { useInstitutions } from "../hooks/useInstitutions";
import { InstitutionSelector } from "../components/InstitutionSelector";
import { toast } from "react-hot-toast";
import { TurnstileWidget } from "../components/TurnstileWidget";
import {
    ShieldCheck,
    User,
    Mail,
    ArrowRight,
    Loader2,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

export default function ActivationRequest() {
    const [identifier, setIdentifier] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [siteKey, setSiteKey] = useState("");
    const [turnstileKey, setTurnstileKey] = useState(0);

    const { institutions, selectedInstitution, setSelectedInstitution, isLoading: loadingInstitutions } = useInstitutions();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await v2AuthApi.getPublicConfig();
                setSiteKey(config.turnstile_site_key);
            } catch (err) {
                console.error("Failed to load Turnstile config", err);
            }
        };
        fetchConfig();
    }, []);

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstitution) {
            toast.error("Please select an institution.");
            return;
        }
        if (!turnstileToken) {
            toast.error("Please complete the human verification.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await v2AuthApi.checkIdentity({
                institution_id: selectedInstitution.id,
                identifier,
                email,
                // @ts-ignore - Backend expects role
                role,
                turnstile_token: turnstileToken
            });

            if (res.success) {
                setIsSuccess(true);
                toast.success("Identity verified! Link sent.");
            } else {
                toast.error(res.detail || "Identity verification failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Something went wrong.");
        } finally {
            setIsSubmitting(false);
            setTurnstileToken(null);
            setTurnstileKey(prev => prev + 1);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white">
                <div className="w-full max-w-md glass p-10 text-center rounded-[3rem] space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="flex justify-center">
                        <div className="w-24 h-24 rounded-[2.5rem] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/40 animate-bounce">
                            <Mail className="w-12 h-12" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black mb-2">Check Your <span className="text-primary italic">Email</span></h1>
                        <p className="text-gray-400 text-sm">
                            An activation link has been sent to <span className="font-bold text-white">{email}</span>. Please click the link to set your password and access the platform.
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 w-full py-4 glass border-white/5 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Return to Login
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b] p-4 text-white font-inter">
            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary backdrop-blur-xl">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight">
                            Institutional <span className="text-primary italic">Activation</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                            Verify Identity & Claim Account
                        </p>
                    </div>
                </div>

                <div className="glass p-8 rounded-[3rem] space-y-8 border border-white/5 shadow-2xl">
                    {/* Role Toggle */}
                    <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setRole('STUDENT')}
                            className={`flex-1 py-3 rounded-xl transition-all duration-500 text-[10px] font-black uppercase tracking-widest ${role === 'STUDENT' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-500 hover:text-white'}`}
                        >
                            Student
                        </button>
                        <button
                            onClick={() => setRole('FACULTY')}
                            className={`flex-1 py-3 rounded-xl transition-all duration-500 text-[10px] font-black uppercase tracking-widest ${role === 'FACULTY' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-500 hover:text-white'}`}
                        >
                            Faculty / Staff
                        </button>
                    </div>

                    <form onSubmit={handleRequest} className="space-y-6">
                        <div className="space-y-4">
                            <InstitutionSelector
                                institutions={institutions}
                                selected={selectedInstitution}
                                onSelect={setSelectedInstitution}
                                isLoading={loadingInstitutions}
                            />

                            <div className="space-y-1 px-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    {role === 'STUDENT' ? "Roll Number" : "Employee ID / Email"}
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-gray-700"
                                    placeholder={role === 'STUDENT' ? "e.g. 2024CS101" : "e.g. EMP0045"}
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
                                    placeholder="The email registered with institution"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <TurnstileWidget
                                key={turnstileKey}
                                siteKey={siteKey}
                                onSuccess={handleTurnstileSuccess}
                                onExpire={handleTurnstileExpire}
                                theme="dark"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedInstitution || !turnstileToken}
                            className="w-full py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    VERIFYING...
                                </>
                            ) : (
                                <>
                                    GENERATE ACTIVATION LINK
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] text-center px-4 leading-relaxed">
                        Identity verification is mandatory for <br /> multi-tenant schema assignment.
                    </p>
                </div>

                <div className="flex justify-center px-4">
                    <Link
                        to="/login"
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-colors"
                    >
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
