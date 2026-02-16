import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

interface ForcedLogoutModalProps {
    open: boolean;
    countdown: number;
    reason?: string;
}

export const ForcedLogoutModal = ({ open, countdown, reason }: ForcedLogoutModalProps) => {
    const getMessage = () => {
        if (reason === "terminated_by_other_device") {
            return "Logout was performed by another device. This session is being terminated.";
        }
        if (reason === "terminated_by_admin") {
            return "Your session was terminated by an administrator.";
        }
        return "Your session has been terminated.";
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md bg-white border-2 border-red-500 shadow-2xl rounded-[32px]">
                <DialogHeader>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-red-600 uppercase tracking-tighter">
                                Access Terminated
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-gray-600 font-medium">
                                {getMessage()}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-6 p-6 bg-red-50 rounded-3xl border border-red-100">
                    <p className="text-lg font-bold text-red-700 text-center">
                        Logging you out in <span className="text-3xl font-black">{countdown}</span> seconds
                    </p>
                </div>

                <div className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                    Security Protocol Active • Real-time Session Sync
                </div>
            </DialogContent>
        </Dialog>
    );
};
