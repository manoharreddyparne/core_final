import React, { useState } from "react";
import { useLoginV2VM } from "../hooks/useLoginV2VM";
import { TurnstileWidget } from "../components";
import {
    ShieldAlert,
    Lock,
    User,
    ArrowRight,
    Loader2,
    Terminal,
    Activity,
    AlertTriangle,
    ShieldX
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { v2AuthApi } from "../api/v2AuthApi";
import { toast } from "react-hot-toast";
import { PageNotFound } from "../../../components/PageNotFound";


export default function SuperAdminLogin() {
    const {
        identifier,
        setIdentifier,
        password,
        setPassword,
        isLoading,
        handleAdminLogin,
        turnstileToken,
        setTurnstileToken
    } = useLoginV2VM();

    const [searchParams] = useSearchParams();
    const ticket = searchParams.get("ticket");

    const [isVerifyingTicket, setIsVerifyingTicket] = useState(true);
    const [isTicketValid, setIsTicketValid] = useState(false);
    const [siteKey, setSiteKey] = useState<string>("");

    React.useEffect(() => {
        const init = async () => {
            // Fetch public config (site keys)
            try {
                const config = await v2AuthApi.getPublicConfig();
                setSiteKey(config.turnstile_site_key);
            } catch (err) {
                console.error("Failed to load public config", err);
            }

            if (!ticket) {
                setIsVerifyingTicket(false);
                return;
            }
            try {
                const res = await v2AuthApi.verifyAdminTicket(ticket);
                setIsTicketValid(res.valid);
            } catch (err) {
                setIsTicketValid(false);
            } finally {
                setIsVerifyingTicket(false);
            }
        };
        init();
    }, [ticket]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!turnstileToken || !isTicketValid) {
            if (!turnstileToken) toast.error("Please complete human verification.");
            return;
        }
        handleAdminLogin(ticket);
    };

    if (isVerifyingTicket) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white font-mono">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Authenticating Sec-Link...</p>
            </div>
        );
    }

    if (!isTicketValid) {
        return <PageNotFound />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-4 text-white font-mono">
            {/* Matrix-like subtle background */}
            <div className="absolute inset-0 overflow-hidden -z-10 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:20px_20px]" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-red-500/5 to-transparent animate-pulse" />
            </div>

            <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-red-500/5 border border-red-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                            <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-red-500 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-lg">
                            RESTRICTED
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase">
                            Zero-Trust <span className="text-red-500">Gateway</span>
                        </h1>
                        <div className="flex items-center gap-2 justify-center text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                            <Activity className="w-3 h-3" />
                            Global Infrastructure Access
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-white/5 p-10 rounded-[2rem] shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden group hover:border-red-500/20 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                    <div className="flex items-center gap-2 mb-6 text-red-500/50 text-[10px] font-bold">
                        <Terminal className="w-4 h-4" />
                        <span>ROOT_ACCESS_PROTOCOL_V2</span>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                                    Admin Identifier
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-white/[0.03] border border-white/5 focus:border-red-500/30 rounded-xl text-white outline-none transition-all placeholder:text-gray-800"
                                        placeholder="root@identity.system"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                                    Security Certificate
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-white/[0.03] border border-white/5 focus:border-red-500/30 rounded-xl text-white outline-none transition-all placeholder:text-gray-800"
                                        placeholder="••••••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <TurnstileWidget
                                    siteKey={siteKey}
                                    onSuccess={(token: string) => setTurnstileToken(token)}
                                    onExpire={() => setTurnstileToken(null)}
                                    theme="dark"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="w-full py-5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-2xl shadow-red-900/40 hover:bg-red-500 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Bypassing Layers...
                                </>
                            ) : (
                                <>
                                    INITIALIZE SESSION
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-2 justify-center pt-4 border-t border-white/5 opacity-50">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Authorized Personnel Only</span>
                    </div>
                </div>

                <p className="text-center text-[9px] text-gray-700 uppercase tracking-widest font-black">
                    Unauthorized access attempts are logged and reported.
                </p>
            </div>
        </div>
    );
}
