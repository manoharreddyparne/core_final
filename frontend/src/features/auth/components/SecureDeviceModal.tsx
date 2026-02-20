import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SecureDeviceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status: "idle" | "loading" | "success" | "error";
    data?: any;
}

export const SecureDeviceModal = ({ open, onOpenChange, status, data }: SecureDeviceModalProps) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (status === "loading") {
            setStep(1);
            const t1 = setTimeout(() => setStep(2), 1500);
            const t2 = setTimeout(() => setStep(3), 3000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        if (status === "success") {
            setStep(4);
        }
    }, [status]);

    const alreadySecured = data?.already_secured === true;
    const canClose = status !== "loading";

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (canClose) onOpenChange(newOpen);
        }}>
            <DialogContent className="w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="relative flex flex-col items-center p-8 space-y-6 text-center">

                    {/* X Close button — top-right, only when not loading */}
                    {canClose && (
                        <button
                            onClick={() => onOpenChange(false)}
                            aria-label="Close"
                            className="absolute top-0 right-0 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all group"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16" height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="group-hover:rotate-90 transition-transform duration-200"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}

                    {/* Status icon */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${status === "success"
                            ? "bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/20"
                            : "bg-primary/10 text-primary ring-2 ring-primary/20"
                        }`}>
                        {status === "loading" ? (
                            <Loader2 className="w-9 h-9 animate-spin" />
                        ) : status === "success" ? (
                            <CheckCircle className="w-9 h-9 animate-in zoom-in duration-300" />
                        ) : (
                            <ShieldCheck className="w-9 h-9" />
                        )}
                    </div>

                    {/* Title & description */}
                    <div className="space-y-1.5">
                        <h3 className="text-lg font-black text-white tracking-tight">
                            {status === "success"
                                ? (alreadySecured ? "Already Secured" : "Device Secured!")
                                : "Securing Device..."}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs">
                            {status === "success"
                                ? (alreadySecured
                                    ? `Last secured at ${new Date(data.secured_at).toLocaleString()}`
                                    : `Secured successfully at ${new Date().toLocaleTimeString()}`)
                                : "Verifying your device identity and rotating security tokens."}
                        </p>
                    </div>

                    {/* Step tracker */}
                    {!alreadySecured && (
                        <div className="w-full space-y-2.5">
                            <StepItem label="Analyzing Device Fingerprint" active={step >= 1} done={step > 1} />
                            <StepItem label="Verifying IP Location" active={step >= 2} done={step > 2} />
                            <StepItem label="Rotating Access Tokens" active={step >= 3} done={step > 3} />
                        </div>
                    )}

                    {/* Success detail card */}
                    {status === "success" && (
                        <div className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl text-left text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-bold uppercase tracking-widest" style={{ fontSize: "10px" }}>Device</span>
                                <span className="font-bold text-white">{data?.device?.device_type || "Unknown"}</span>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-bold uppercase tracking-widest" style={{ fontSize: "10px" }}>Location</span>
                                <span className="font-bold text-white">{data?.location?.city || "Unknown"}</span>
                            </div>
                        </div>
                    )}

                    {/* Done button — always visible when complete */}
                    {status === "success" && (
                        <button
                            onClick={() => onOpenChange(false)}
                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                        >
                            Done
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const StepItem = ({ label, active, done }: { label: string; active: boolean; done: boolean }) => (
    <div className={`flex items-center gap-3 transition-all duration-300 ${active ? "opacity-100" : "opacity-20"}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black border shrink-0 transition-all duration-300 ${done ? "bg-primary border-primary text-white" : "border-white/20 text-gray-600"
            }`} style={{ fontSize: "10px" }}>
            {done ? "✓" : ""}
        </div>
        <span className={`text-xs font-medium ${done ? "text-white" : "text-gray-500"}`}>{label}</span>
    </div>
);
