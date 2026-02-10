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
}

export const ForcedLogoutModal = ({ open, countdown }: ForcedLogoutModalProps) => {
    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Session Terminated</DialogTitle>
                            <DialogDescription className="mt-1">
                                Your session was ended from another device
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                        You will be logged out in <span className="font-bold text-red-600">{countdown}</span> seconds
                    </p>
                </div>

                <div className="mt-2 text-xs text-gray-500 text-center">
                    This action was triggered by logging out from another device.
                </div>
            </DialogContent>
        </Dialog>
    );
};
