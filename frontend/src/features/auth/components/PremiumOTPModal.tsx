import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    ShieldCheck,
    Loader2,
    ArrowRight,
    History,
    RefreshCw,
    AlertCircle,
    Loader,
    Smartphone,
    Check,
    Cpu
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";

interface PremiumOTPModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    otp: string;
    setOtp: (val: string) => void;
    onVerify: () => void;
    isLoading: boolean;
    emailHint: string;
    onResend?: () => void;
    resendCooldown?: number;
    error?: string;
    rememberDevice?: boolean;
    setRememberDevice?: (val: boolean) => void;
}

export const PremiumOTPModal = ({
    open,
    onOpenChange,
    otp,
    setOtp,
    onVerify,
    isLoading,
    emailHint,
    onResend,
    resendCooldown = 0,
    error,
    rememberDevice,
    setRememberDevice
}: PremiumOTPModalProps) => {
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Sync individual digits with the 'otp' string state
    const digits = otp.split("").slice(0, 6);

    const focusInput = (index: number) => {
        if (inputRefs.current[index]) {
            inputRefs.current[index]?.focus();
            setFocusedIndex(index);
        }
    };

    useEffect(() => {
        if (open) {
            // Focus first input on open
            setTimeout(() => focusInput(0), 100);
        }
    }, [open]);

    const handleInput = (val: string, index: number) => {
        const cleanVal = val.replace(/\D/g, "").slice(-1);
        if (!cleanVal && val !== "") return;

        const newOtpArr = otp.split("");
        // Ensure array is 6 length
        while (newOtpArr.length < 6) newOtpArr.push("");

        newOtpArr[index] = cleanVal;
        const finalOtp = newOtpArr.join("").slice(0, 6);
        setOtp(finalOtp);

        // Auto-advance
        if (cleanVal && index < 5) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === "Backspace") {
            if (!otp[index] && index > 0) {
                // If current is empty, move back and clear previous
                e.preventDefault();
                const newOtpArr = otp.split("");
                newOtpArr[index - 1] = "";
                setOtp(newOtpArr.join(""));
                focusInput(index - 1);
            } else if (otp[index]) {
                // If current has value, clear it but stay
                const newOtpArr = otp.split("");
                newOtpArr[index] = "";
                setOtp(newOtpArr.join(""));
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            focusInput(index - 1);
        } else if (e.key === "ArrowRight" && index < 5) {
            focusInput(index + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

        if (pastedData) {
            setOtp(pastedData);
            // Focus the correct input
            const nextIndex = Math.min(pastedData.length, 5);
            focusInput(nextIndex);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-[#0d1117] border border-white/10 rounded-[3rem] shadow-2xl p-0 overflow-hidden backdrop-blur-3xl animate-in zoom-in-95 duration-300">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -ml-24 -mb-24 pointer-events-none" />

                <div className="relative p-8 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-slow blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />

                                {/* Orbiting particles for Premium feel */}
                                <div className="absolute inset-[-40px] pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary/40 rounded-full animate-orbit" />
                                    <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-cyan-400/40 rounded-full animate-orbit [animation-delay:-3s]" />
                                    <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/40 rounded-full animate-orbit [animation-delay:-7s]" />
                                </div>

                                <div className="w-24 h-24 bg-white/5 dark:bg-white/5 border-2 border-primary/30 rounded-[2.5rem] flex items-center justify-center relative backdrop-blur-3xl overflow-hidden group-hover:border-primary/60 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                                    <ShieldCheck className="w-12 h-12 text-primary animate-float" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tight">
                                Identity <span className="text-primary not-italic">Guardian</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                A secure 6-digit protocol dispatched to <br />
                                <span className="text-primary font-mono bg-primary/5 px-2 py-0.5 rounded border border-primary/10 mt-1 inline-block">
                                    {emailHint}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-6">
                        <div className="flex justify-center gap-3 sm:gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="relative group/otp">
                                    <input
                                        ref={el => inputRefs.current[i] = el}
                                        type="text"
                                        inputMode="numeric"
                                        value={otp[i] || ""}
                                        onChange={(e) => handleInput(e.target.value, i)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        onPaste={handlePaste}
                                        onFocus={() => setFocusedIndex(i)}
                                        className={`w-10 h-16 sm:w-14 sm:h-20 bg-white/5 border-2 rounded-2xl text-center text-3xl font-black text-white outline-none transition-all duration-300 caret-transparent ${focusedIndex === i
                                            ? "border-primary shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-white/10 scale-105"
                                            : "border-white/10 hover:border-white/20"
                                            } ${otp[i] ? "border-primary/50" : ""}`}
                                        maxLength={1}
                                        required
                                    />
                                    {i === 2 && (
                                        <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/10" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 justify-center text-red-400 animate-in fade-in slide-in-from-top-1 duration-300">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="space-y-6">
                        {/* Trust Device Protocol */}
                        {setRememberDevice && (
                            <div className="bg-white/5 border border-white/5 p-4 rounded-3xl shadow-inner relative overflow-hidden group/trust">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 transition-transform group-hover/trust:scale-150 duration-700" />

                                <label className="relative flex items-center cursor-pointer select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={rememberDevice}
                                            onChange={(e) => setRememberDevice(e.target.checked)}
                                        />
                                        <div className="w-10 h-5 bg-white/10 rounded-full peer-checked:bg-primary transition-colors duration-300" />
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-5 shadow-sm" />
                                    </div>
                                    <div className="ml-3">
                                        <span className="block text-[9px] font-black text-white uppercase tracking-widest leading-none mb-1">
                                            Trusted Protocol (30 Days)
                                        </span>
                                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                                            Bypass MFA on this hardware identifier
                                        </span>
                                    </div>
                                    {rememberDevice && (
                                        <ShieldCheck className="ml-auto w-3.5 h-3.5 text-primary animate-in zoom-in-50 duration-300" />
                                    )}
                                </label>
                            </div>
                        )}

                        <button
                            onClick={onVerify}
                            disabled={isLoading || otp.length < 6}
                            className="w-full h-16 premium-gradient text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                                    <span className="relative z-10">Validating...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative z-10">Initialize Session</span>
                                    <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="flex flex-col items-center gap-4">
                            <button
                                type="button"
                                onClick={onResend}
                                disabled={isLoading || resendCooldown > 0}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all disabled:opacity-30"
                            >
                                <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? '' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                                {resendCooldown > 0 ? `Retry Protocol in ${resendCooldown}s` : "Resend Security Code"}
                            </button>

                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Cancel & Revoke Access
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/5 text-center">
                        <p className="text-[8px] text-gray-700 font-black uppercase tracking-[0.4em]">
                            End-to-End Encrypted Handshake
                        </p>
                    </div>
                </div>
                {/* Secure Identity Protocol Info */}
                <div className="px-8 pb-8">
                    <div className="flex items-center gap-4 py-4 px-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white uppercase tracking-widest leading-none mb-1">Identity Guardian v2.4</p>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Encrypted Quad-Shield Protocol // AES-256 Multi-Segment</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
