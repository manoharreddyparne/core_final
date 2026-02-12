import React, { useState } from "react";
import { v2AuthApi } from "../api/v2AuthApi";
import {
    Activity,
    ShieldCheck,
    Server,
    Lock,
    ArrowRight,
    Loader2,
    Terminal,
    AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

export default function AdminRecovery() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await v2AuthApi.requestAdminAccess(email);
            setSubmitted(true);
            toast.success("Security certificate request processed.");
        } catch (err) {
            // Even on error, we show success-like generic message to prevent enumeration
            setSubmitted(true);
            toast.error("System connection interrupted. Try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white font-mono p-4">
            <div className="w-full max-w-lg space-y-8 animate-in fade-in duration-1000">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <Server className="w-10 h-10 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-widest uppercase">
                            Infrastructure <span className="text-gray-500">Gateway</span>
                        </h1>
                        <div className="flex items-center gap-2 justify-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                            System Health: Optimized
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-white/5 p-10 rounded-[2rem] shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden group transition-all">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-500/50 to-transparent" />

                    {!submitted ? (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                    <Terminal className="w-4 h-4" />
                                    <span>Access_Protocol_Initialization</span>
                                </div>
                                <p className="text-[12px] text-gray-400 leading-relaxed">
                                    Administrator access requires a short-lived JIT certificate. Provide your root identifier to initialize a secure session delivery.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                                        Root Identifier
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 bg-white/[0.03] border border-white/5 focus:border-gray-500/30 rounded-xl text-white outline-none transition-all placeholder:text-gray-800"
                                            placeholder="admin@infrastructure.node"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email}
                                    className="w-full py-5 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Encrypting Request...
                                        </>
                                    ) : (
                                        <>
                                            Request JIT Link
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="flex justify-center">
                                <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20">
                                    <ShieldCheck className="w-12 h-12 text-green-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase">Request Dispatched</h3>
                                <p className="text-gray-400 text-[11px] leading-relaxed max-w-xs mx-auto">
                                    If the identifier matches our root hierarchy, a JIT access certificate will be delivered to your secure inbox.
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/"
                                    className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest font-black transition-colors"
                                >
                                    Return to Main Console
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 justify-center pt-4 border-t border-white/5 opacity-30">
                        <AlertCircle className="w-3 h-3 text-gray-500" />
                        <span className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">Encrypted Communication Endpoint</span>
                    </div>
                </div>

                <p className="text-center text-[9px] text-gray-700 uppercase tracking-widest font-black opacity-50">
                    System Node: {Math.random().toString(16).substring(2, 8).toUpperCase()} // AUIP CORE V2
                </p>
            </div>
        </div>
    );
}
