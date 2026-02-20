import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, User, Mail, Globe, Briefcase, ShieldCheck, Send, Loader2, Sparkles, X } from 'lucide-react';
import { v2AuthApi } from '../api/v2AuthApi';
import { toast } from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialData?: {
        institution_name?: string;
    };
}

export const InstitutionInterestModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        student_name: '',
        student_email: '',
        institution_name: initialData?.institution_name || '',
        domain: '',
        hod_name: '',
        hod_designation: '',
        hod_email: '',
        additional_notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.student_name || !formData.student_email || !formData.institution_name) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);
        try {
            await v2AuthApi.submitInterest(formData);
            toast.success("Thank you! Your interest has been recorded.", {
                icon: '🚀',
                duration: 5000
            });
            onClose();
            setFormData({
                student_name: '',
                student_email: '',
                institution_name: '',
                domain: '',
                hod_name: '',
                hod_designation: '',
                hod_email: '',
                additional_notes: ''
            });
        } catch (err: any) {
            console.error("Interest submission failed", err);
            toast.error(err.response?.data?.message || "Failed to submit interest. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const field = (label: string, id: string, children: React.ReactNode) => (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">
                {label}
            </label>
            {children}
        </div>
    );

    const inputClass = "w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all";
    const inputWithIconClass = "w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-lg max-h-[90vh] bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 blur-[60px] rounded-full pointer-events-none -z-10" />

                {/* Header — fixed, doesn't scroll */}
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white tracking-tight">
                                    Campus <span className="text-primary italic">Survey</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                                    Help us bring AUIP to your institution
                                </DialogDescription>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all group shrink-0 ml-2"
                            aria-label="Close survey"
                        >
                            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                        </button>
                    </div>
                </DialogHeader>

                <div className="h-px bg-white/5 mx-6 shrink-0" />

                {/* Scrollable form body */}
                <form
                    id="interest-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                >
                    {/* Section: Your Details */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <span style={{ fontSize: '8px' }} className="font-black">01</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {field("Your Name *", "student_name",
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="student_name"
                                    type="text"
                                    placeholder="Full Name"
                                    className={inputWithIconClass}
                                    value={formData.student_name}
                                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                        {field("Your Email *", "student_email",
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="student_email"
                                    type="email"
                                    placeholder="you@campus.edu"
                                    className={inputWithIconClass}
                                    value={formData.student_email}
                                    onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Section: Institution */}
                    <div className="flex items-center gap-2 pt-2">
                        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <span style={{ fontSize: '8px' }} className="font-black">02</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Institution</span>
                    </div>

                    {field("University Name *", "institution_name",
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                            <input
                                id="institution_name"
                                type="text"
                                placeholder="Your University / College"
                                className={inputWithIconClass}
                                value={formData.institution_name}
                                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {field("Official Domain (optional)", "domain",
                        <div className="relative group">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                            <input
                                id="domain"
                                type="text"
                                placeholder="e.g. university.edu"
                                className={inputWithIconClass}
                                value={formData.domain}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Section: Stakeholder */}
                    <div className="flex items-center gap-2 pt-2">
                        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <span style={{ fontSize: '8px' }} className="font-black">03</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stakeholder Info (optional)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {field("HOD / Principal Name", "hod_name",
                            <input
                                id="hod_name"
                                type="text"
                                placeholder="Dr. John Smith"
                                className={inputClass}
                                value={formData.hod_name}
                                onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                            />
                        )}
                        {field("HOD Designation", "hod_designation",
                            <div className="relative group">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    id="hod_designation"
                                    type="text"
                                    placeholder="e.g. Dean of CS Dept."
                                    className={inputWithIconClass}
                                    value={formData.hod_designation}
                                    onChange={(e) => setFormData({ ...formData, hod_designation: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {field("HOD Official Email", "hod_email",
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                            <input
                                id="hod_email"
                                type="email"
                                placeholder="hod@campus.edu"
                                className={inputWithIconClass}
                                value={formData.hod_email}
                                onChange={(e) => setFormData({ ...formData, hod_email: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Section: Notes */}
                    <div className="flex items-center gap-2 pt-2">
                        <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <span style={{ fontSize: '8px' }} className="font-black">04</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Additional Notes</span>
                    </div>

                    <textarea
                        id="additional_notes"
                        placeholder="Tell us why your campus needs AUIP..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                        value={formData.additional_notes}
                        onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    />
                </form>

                {/* Footer — fixed, doesn't scroll */}
                <div className="h-px bg-white/5 mx-6 shrink-0" />
                <DialogFooter className="p-6 pt-4 shrink-0">
                    <div className="flex items-center justify-between w-full gap-4">
                        <p className="text-[9px] text-gray-600 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                            AES-256 Secured
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-10 px-5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                form="interest-form"
                                type="submit"
                                className="h-10 px-6 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 group transition-all hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Submit
                                        <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
