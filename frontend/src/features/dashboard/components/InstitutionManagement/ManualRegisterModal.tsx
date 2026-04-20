import { Dialog, DialogContent } from "../../../../components/ui/dialog";
import { XCircle, Building2, Globe, Users, Mail, Phone, MapPin, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

interface ManualRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    newInst: any;
    setNewInst: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isActionLoading: boolean;
}

export const ManualRegisterModal = ({
    isOpen,
    onClose,
    newInst,
    setNewInst,
    onSubmit,
    isActionLoading
}: ManualRegisterModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => {
            if (!open && isActionLoading) return;
            onClose();
        }}>
            <DialogContent className="w-full max-w-2xl max-h-[90vh] bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 blur-[60px] rounded-full pointer-events-none -z-10" />

                <div className="flex items-start justify-between p-7 pb-5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                                Register <span className="text-primary italic">Institution</span>
                            </h2>
                            <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-0.5">Add a new partner manually</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all group shrink-0 ml-4"
                    >
                        <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>

                <div className="h-px bg-[var(--bg-card)] mx-7 shrink-0" />

                <form
                    id="manual-reg-form"
                    onSubmit={onSubmit}
                    className="flex-1 overflow-y-auto px-7 py-5 space-y-5 min-h-0"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Institution Name *</label>
                            <div className="relative group">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. University Name"
                                    className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                        setNewInst({ ...newInst, name, slug });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Unique Identifier *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. unique-id"
                                className="w-full h-11 px-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-mono text-xs font-bold placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={newInst.slug}
                                onChange={(e) => setNewInst({ ...newInst, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Official Domain *</label>
                            <div className="relative group">
                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. university.edu"
                                    className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.domain}
                                    onChange={(e) => setNewInst({ ...newInst, domain: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Estimated Students</label>
                            <div className="relative group">
                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="number"
                                    placeholder="e.g. 5000"
                                    className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.student_count_estimate}
                                    onChange={(e) => setNewInst({ ...newInst, student_count_estimate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Contact Email *</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    placeholder="contact@university.edu"
                                    className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.contact_email}
                                    onChange={(e) => setNewInst({ ...newInst, contact_email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Phone Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                    value={newInst.contact_number}
                                    onChange={(e) => setNewInst({ ...newInst, contact_number: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-1">Address</label>
                        <div className="relative group">
                            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600 group-focus-within:text-primary transition-colors" />
                            <textarea
                                placeholder="City, State, Country"
                                rows={2}
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-white/10 rounded-xl text-[var(--text-primary)] font-bold text-sm placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                                value={newInst.address}
                                onChange={(e) => setNewInst({ ...newInst, address: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                <div className="h-px bg-[var(--bg-card)] mx-7 shrink-0" />
                <div className="flex items-center justify-between p-6 shrink-0 gap-4">
                    <p className="text-[9px] text-gray-600 font-black flex items-center gap-1.5 uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                        Admin Register
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] font-black text-xs uppercase tracking-widest transition-all"
                            disabled={isActionLoading}
                        >
                            Cancel
                        </button>
                        <button
                            form="manual-reg-form"
                            type="submit"
                            disabled={isActionLoading}
                            className="h-10 px-6 bg-primary hover:bg-primary/90 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isActionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><ArrowRight className="w-4 h-4" /> Finish Registration</>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
