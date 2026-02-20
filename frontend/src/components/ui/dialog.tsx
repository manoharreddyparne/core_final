import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
    const [mounted, setMounted] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onOpenChange(false);
        };
        if (open) {
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", handleEscape);
        } else {
            document.body.style.overflow = "unset";
            document.removeEventListener("keydown", handleEscape);
        }
        return () => {
            document.body.style.overflow = "unset";
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open, onOpenChange]);

    if (!open || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Blurred backdrop — click to close */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={() => onOpenChange(false)}
            />
            {/* Modal content sits on top — centered */}
            <div
                ref={dialogRef}
                className="relative z-10 w-full flex items-center justify-center animate-in zoom-in-90 fade-in duration-300"
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

export const DialogContent = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("relative", className)}>{children}</div>
);

export const DialogHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("", className)}>{children}</div>
);

export const DialogFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-3", className)}>{children}</div>
);

export const DialogTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h3>
);

export const DialogDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
    <p className={cn("text-sm text-gray-400", className)}>{children}</p>
);
