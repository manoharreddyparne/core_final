import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { createPortal } from "react-dom";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    activeTab: string;
    initialData?: any;
    formDataFields: any[];
}

export const AcademicFormModal = ({ isOpen, onClose, onSave, activeTab, initialData, formDataFields }: Props) => {
    const [formData, setFormData] = useState<any>(initialData || {});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData, isOpen]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", h);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", h);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-[#050505]/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative z-10 bg-[#0a0a0c]/80 backdrop-blur-md border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                            {initialData ? 'Update' : 'Initialize'} <span className="text-primary tracking-normal not-italic">{activeTab.slice(0, -1)}</span>
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Institutional Data Core Sync</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Added padding bottom to prevent footer overlap */}
                <form onSubmit={handleSubmit} className="p-10 pb-20 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formDataFields.map((field) => (
                            <div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-2">
                                    {field.label}
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newFormData = { ...formData, [field.name]: val };

                                            // Auto-fill related names for convenience if backend needs them
                                            if (field.name === 'employee_id' && field.options) {
                                                const selectedOpt = field.options.find((opt: any) => opt.value === val);
                                                if (selectedOpt && selectedOpt.original?.full_name) {
                                                    newFormData.faculty_name = selectedOpt.original.full_name;
                                                } else if (selectedOpt) {
                                                    // Fallback to extracting name from label e.g., "Dr. John (EMP1)"
                                                    newFormData.faculty_name = selectedOpt.label.split(' (')[0];
                                                }
                                            } else if (field.name === 'roll_number' && field.options) {
                                                const selectedOpt = field.options.find((opt: any) => opt.value === val);
                                                if (selectedOpt) {
                                                    // Options label is "First Last (Roll)", we split by generic delimiter
                                                    newFormData.student_name = selectedOpt.label.split(' (')[0].trim();
                                                }
                                            }

                                            setFormData(newFormData);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                                        required={field.required}
                                    >
                                        <option value="" className="bg-black text-white">Select {field.label}</option>
                                        {field.options?.map((opt: any) => (
                                            <option key={opt.value} value={opt.value} className="bg-[#0a0a0c] text-white">{opt.label}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all min-h-[100px]"
                                        required={field.required}
                                    />
                                ) : field.type === 'checkbox' ? (
                                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <input
                                            type="checkbox"
                                            checked={formData[field.name] || false}
                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                                            className="w-5 h-5 accent-primary"
                                        />
                                        <span className="text-xs text-white font-bold">{field.checkboxLabel || 'Enabled'}</span>
                                    </div>
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                                        required={field.required}
                                    />
                                )}
                                {field.helpText && <p className="mt-2 text-[9px] text-gray-600 italic px-2">{field.helpText}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-relaxed">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Protocol validation required. Changes will be synchronized across the institutional neural lattice.
                    </div>
                </form>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-white/5 flex gap-4 justify-end bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl text-[10px] font-black text-gray-500 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
                    >
                        Cancel Handshake
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-10 py-3 bg-primary text-white rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-[0_0_40px_rgba(20,110,245,0.3)] hover:scale-105 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" />
                        ) : (
                            <Save className="w-4 h-4 shrink-0" />
                        )}
                        {isSubmitting ? 'Synchronizing...' : 'Synchronize Entry'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
