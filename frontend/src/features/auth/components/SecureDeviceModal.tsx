import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, CheckCircle, Smartphone } from "lucide-react";
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
            setStep(1); // Analyzing
            const t1 = setTimeout(() => setStep(2), 1500); // Verifying
            const t2 = setTimeout(() => setStep(3), 3000); // Securing
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        if (status === "success") {
            setStep(4); // Done
        }
    }, [status]);

    const alreadySecured = data?.already_secured === true;

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            // Don't allow closing if showing "already secured" message
            if (!newOpen && alreadySecured) {
                return; // Prevent closing
            }
            onOpenChange(newOpen);
        }}>
            <DialogContent className="sm:max-w-md bg-white">
                <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">

                    {/* Icon Animation */}
                    <div className="relative">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${status === "success" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                            {status === "loading" ? (
                                <Loader2 className="w-10 h-10 animate-spin" />
                            ) : status === "success" ? (
                                <CheckCircle className="w-10 h-10 animate-in zoom-in" />
                            ) : (
                                <ShieldCheck className="w-10 h-10" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {status === "success"
                                ? (data?.already_secured ? "Device Already Secured" : "Device Secured!")
                                : "Securing Device..."}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {status === "success"
                                ? (data?.already_secured
                                    ? `This device was last secured at ${new Date(data.secured_at).toLocaleString()}`
                                    : `Secured on ${new Date().toLocaleTimeString()}`)
                                : "We are verifying your device identity and rotating your security tokens."}
                        </p>
                    </div>

                    {/* Steps - Hide if already secured */}
                    {!data?.already_secured && (
                        <div className="w-full space-y-3">
                            <StepItem label="Analyzing Device Fingerprint" active={step >= 1} done={step > 1} />
                            <StepItem label="Verifying IP Location" active={step >= 2} done={step > 2} />
                            <StepItem label="Rotating Access Tokens" active={step >= 3} done={step > 3} />
                        </div>
                    )}

                    {status === "success" && (
                        <div className="w-full p-4 bg-gray-50 rounded-lg text-left text-sm space-y-1 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Device:</span>
                                <span className="font-medium text-gray-900">{data?.device?.device_type || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Location:</span>
                                <span className="font-medium text-gray-900">{data?.location?.city || "Unknown"}</span>
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
};

const StepItem = ({ label, active, done }: { label: string, active: boolean, done: boolean }) => (
    <div className={`flex items-center gap-3 transition-all duration-300 ${active ? "opacity-100" : "opacity-30"}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${done ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-400"}`}>
            {done ? "✓" : ""}
        </div>
        <span className={`text-sm ${done ? "text-gray-900 font-medium" : "text-gray-500"}`}>{label}</span>
    </div>
)
