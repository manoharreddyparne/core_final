import { Dialog, DialogContent } from "../../../../components/ui/dialog";
import { AlertCircle, Trash2, XCircle, Loader2, ShieldAlert } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    institutionName: string;
    isActionLoading: boolean;
}

export const DeleteConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    institutionName,
    isActionLoading
}: DeleteConfirmModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isActionLoading) onClose(); }}>
            <DialogContent className="sm:max-w-md w-[95vw] bg-[#0d1117] border border-red-500/20 rounded-[2rem] p-0 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="p-8 space-y-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
                            <ShieldAlert className="w-8 h-8 animate-pulse" />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tight">Confirm <span className="text-red-500 italic">Deletion</span></h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em]">Destructive Action Required</p>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 w-full">
                            <p className="text-sm text-gray-300 leading-relaxed">
                                You are about to permanently delete <span className="text-white font-black">{institutionName}</span>. 
                                This will erase all database schemas, domains, and student records. This cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isActionLoading}
                            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Everything
                        </button>
                        
                        <button
                            onClick={onClose}
                            disabled={isActionLoading}
                            className="w-full h-12 bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)] hover:text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl border border-white/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                </div>
                
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-30" />
            </DialogContent>
        </Dialog>
    );
};
