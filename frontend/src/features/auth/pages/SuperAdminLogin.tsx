import React, { useState, useEffect, useCallback } from "react";
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
        otp,
        setOtp,
        otpRequired,
        handleVerifyAdminMFA,
        isLoading,
        handleAdminLogin,
        turnstileToken,
        setTurnstileToken,
        rememberDevice,
        setRememberDevice,
        lockoutTimer,
        resendCooldown,
        handleResendAdminOTP
    } = useLoginV2VM();

    const [searchParams] = useSearchParams();
    // 🛡️ SECURITY FAILSAFE: Combined URL extraction to bypass potential React Router sync delays
    const ticket = searchParams.get("ticket") || new URLSearchParams(window.location.search).get("ticket");

    const [isVerifyingTicket, setIsVerifyingTicket] = useState(true);
    const [isTicketValid, setIsTicketValid] = useState(false);
    const [siteKey, setSiteKey] = useState<string>("");

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, [setTurnstileToken]);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, [setTurnstileToken]);

    useEffect(() => {
        const init = async () => {
            console.debug("[SEC-GATE] Initializing Infrastructure Protocol...");

            // Fetch public config (site keys)
            try {
                const config = await v2AuthApi.getPublicConfig();
                console.debug("[SEC-GATE] Remote configuration loaded:", config.app_name);
                setSiteKey(config.turnstile_site_key);
            } catch (err) {
                console.error("[SEC-GATE] ❌ Critical failure loading security config", err);
            }


            if (!ticket) {
                console.debug("[SEC-GATE] ⚠️ No JIT ticket detected in handshake.");
                setIsVerifyingTicket(false);
                return;
            }

            try {
                console.debug("[SEC-GATE] Validating JIT Certificate:", ticket.substring(0, 10) + "...");

                // 🔐 Robust Identity Extraction (URL-safe Base64 + Padding Restoration)
                try {
                    const base64 = ticket.replace(/-/g, '+').replace(/_/g, '/');
                    const pad = base64.length % 4;
                    const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64;
                    const decoded = atob(paddedBase64);
                    const parts = decoded.split(':');

                    if (parts.length === 3) {
                        const encodedEmail = parts[0];
                        console.debug("[SEC-GATE] 🛡️ Identity Bound:", encodedEmail);
                        setIdentifier(encodedEmail);
                    }
                } catch (decodeErr) {
                    console.error("[SEC-GATE] ❌ Certificate identity extraction failed:", decodeErr);
                }

                setIsVerifyingTicket(true);
                const res = await v2AuthApi.verifyAdminTicket(ticket);
                console.debug("[SEC-GATE] Validation Result:", res.valid ? "✅ APPROVED" : "❌ REVOKED");
                setIsTicketValid(res.valid);

                if (!res.valid) {
                    toast.error("Security Certificate Revoked or Expired.");
                }
            } catch (err) {
                console.error("[SEC-GATE] ❌ Certificate verification failed:", err);
                setIsTicketValid(false);
            } finally {
                setIsVerifyingTicket(false);
            }
        };
        init();
    }, [ticket]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otpRequired) {
            handleVerifyAdminMFA(ticket);
            return;
        }

        if (!turnstileToken || !isTicketValid) {
            if (!turnstileToken) toast.error("Please complete human verification.");
            return;
        }
        handleAdminLogin(ticket, { forceGlobal: true });
    };

    if (isVerifyingTicket) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white font-mono">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Authenticating Sec-Link...</p>
            </div>
        );
    }

    // 🕵️ INVISIBLE GATEWAY: Show 404 if no ticket exists or if it's invalid
    if (!ticket || (!isTicketValid && !isVerifyingTicket)) {
        return <PageNotFound />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-4 text-white font-mono">
            {/* 🚨 SYSTEM LOCKOUT OVERLAY */}
            {lockoutTimer > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="max-w-md w-full p-12 text-center space-y-8">
                        <div className="flex justify-center">
                            <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/50 flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                                <ShieldX className="w-12 h-12 text-red-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500">Access Neutralized</h2>
                            <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold">Multiple Security Breaches Detected</p>
                        </div>
                        <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Your IP address has been globally blacklisted due to repeated authentication failures.
                                Secure gateway protocols prohibit further attempts until the neutralization window expires.
                            </p>
                            <div className="text-4xl font-black text-red-500 font-mono tracking-widest">
                                {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                        <div className="text-[9px] text-gray-700 uppercase tracking-widest font-black">
                            Security ID: {Math.random().toString(16).substring(2, 10).toUpperCase()} // NODE-VIOLATION
                        </div>
                    </div>
                </div>
            )}
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
                        {otpRequired ? (
                            <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2 animate-pulse">
                                        Enter 2FA Security Token
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 bg-red-500/5 border border-red-500/20 focus:border-red-500/50 rounded-xl text-white outline-none transition-all placeholder:text-red-500/30 text-center tracking-[0.5em] font-bold text-xl"
                                            placeholder="000000"
                                            maxLength={6}
                                            autoFocus
                                            required
                                            aria-label="2FA Security Token"
                                        />
                                    </div>
                                    <p className="text-[10px] text-center text-gray-500">
                                        Check your verified email for the security code.
                                    </p>

                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={handleResendAdminOTP}
                                            disabled={isLoading || resendCooldown > 0}
                                            className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest font-black transition-colors disabled:opacity-30 flex items-center gap-2"
                                        >
                                            {resendCooldown > 0 ? (
                                                <>
                                                    <Activity className="w-3 h-3 animate-pulse" />
                                                    Resend Protocol in {Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, '0')}
                                                </>
                                            ) : (
                                                "Request New Security Token"
                                            )}
                                        </button>
                                    </div>

                                    {/* Remember Device Checkbox */}
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="rememberDevice"
                                            checked={rememberDevice}
                                            onChange={(e) => setRememberDevice(e.target.checked)}
                                            className="w-4 h-4 accent-red-500 rounded border-gray-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <label htmlFor="rememberDevice" className="text-xs text-white/70 select-none cursor-pointer hover:text-white transition-colors">
                                            Remember this device for 30 days
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="identifier"
                                        className={`text-[10px] font-black uppercase tracking-widest px-2 ${ticket ? 'text-green-500' : 'text-gray-500'}`}
                                    >
                                        {ticket ? 'Authorized Identity' : 'Admin Identifier'}
                                    </label>
                                    <div className="relative">
                                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${ticket ? 'text-green-500' : 'text-gray-600'}`} />
                                        <input
                                            id="identifier"
                                            name="identifier"
                                            type="email"
                                            value={identifier}
                                            onChange={(e) => !ticket && setIdentifier(e.target.value)}
                                            readOnly={!!ticket}
                                            className={`w-full pl-12 pr-6 py-4 bg-white/[0.03] border rounded-xl text-white outline-none transition-all placeholder:text-gray-800 ${ticket ? 'border-green-500/20 text-white/50 cursor-not-allowed bg-green-500/5' : 'border-white/5 focus:border-red-500/30'}`}
                                            placeholder="root@identity.system"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                                        Security Certificate
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 bg-white/[0.03] border border-white/5 focus:border-red-500/30 rounded-xl text-white outline-none transition-all placeholder:text-gray-800"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <TurnstileWidget
                                        siteKey={siteKey}
                                        onSuccess={handleTurnstileSuccess}
                                        onExpire={handleTurnstileExpire}
                                        theme="dark"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || (!otpRequired && !turnstileToken)}
                            className="w-full py-5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-2xl shadow-red-900/40 hover:bg-red-500 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {otpRequired ? "Verifying Token..." : "Bypassing Layers..."}
                                </>
                            ) : (
                                <>
                                    {otpRequired ? "CONFIRM ACCESS" : "INITIALIZE SESSION"}
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
