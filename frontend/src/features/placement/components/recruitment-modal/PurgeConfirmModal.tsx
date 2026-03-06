import React from "react";
import { X, AlertTriangle, Radiation, Trash2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const PurgeConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative bg-[#1a1c23] border border-red-500/20 rounded-[2.5rem] w-full max-w-md shadow-[0_0_80px_rgba(239,68,68,0.15)] overflow-hidden flex flex-col p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <Radiation className="w-6 h-6 text-red-500 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] text-red-400/60 uppercase font-black tracking-widest mt-0.5">Tactical Purge Sequence</p>
                    </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-8">
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-[2] py-3.5 bg-red-500 hover:bg-red-400 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Permanently
                    </button>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default PurgeConfirmModal;
