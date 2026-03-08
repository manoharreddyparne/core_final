import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmText = "Confirm", type = 'danger' 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass w-full max-w-sm rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-200 bg-[#1a1c23]">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${type === 'danger' ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
                            <AlertTriangle className={`w-4 h-4 ${type === 'danger' ? 'text-red-400' : 'text-indigo-400'}`} />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-400 leading-relaxed text-center px-2">
                        {message}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 py-3 font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest shadow-xl ${
                                type === 'danger' 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
