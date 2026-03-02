import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

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

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0a0a0c] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden relative">
                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter">
                            {initialData ? 'Update' : 'Initialize'} <span className="text-primary tracking-normal">{activeTab.slice(0, -1)}</span>
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Institutional Data Core Sync</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formDataFields.map((field) => (
                            <div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-2">
                                    {field.label}
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                                        required={field.required}
                                    >
                                        <option value="" className="bg-black">Select {field.label}</option>
                                        {field.options?.map((opt: any) => (
                                            <option key={opt.value} value={opt.value} className="bg-black">{opt.label}</option>
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

                    <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Changes will be synchronized with all connected institutional subsystems.
                    </div>
                </form>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-white/5 flex gap-4 justify-end bg-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl text-xs font-black text-gray-500 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-10 py-3 bg-primary text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-[0_0_40px_rgba(20,110,245,0.3)] hover:scale-105 transition-all uppercase tracking-widest"
                    >
                        <Save className="w-4 h-4" />
                        Synchronize Entry
                    </button>
                </div>
            </div>
        </div>
    );
};
