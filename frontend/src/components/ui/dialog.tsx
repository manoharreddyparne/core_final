import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
    const dialogRef = useRef<HTMLDivElement>(null);

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

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 animate-in zoom-in-95 duration-200"
                ref={dialogRef}
            >
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
                {children}
            </div>
        </div>
    );
};

export const DialogContent = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("space-y-4", className)}>{children}</div>
);

export const DialogHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("space-y-1.5 text-center sm:text-left", className)}>{children}</div>
);

export const DialogFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-4", className)}>{children}</div>
);

export const DialogTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h3>
);

export const DialogDescription = ({ children, className }: { children: ReactNode; className?: string }) => (
    <p className={cn("text-sm text-gray-500", className)}>{children}</p>
);
