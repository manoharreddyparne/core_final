import { Dialog, DialogContent } from "../../../../components/ui/dialog";
import { 
    Building2, XCircle, Clock, Globe, Users, Phone, Mail, MapPin, 
    FileText, CheckCircle2, Loader2, AlertCircle, RefreshCw 
} from "lucide-react";

interface InstitutionDetailModalProps {
    institution: any | null;
    isOpen: boolean;
    onClose: () => void;
    isActionLoading: boolean;
    activeAction: string | null;
    onAction: (slug: string, action: string) => void;
    syncStatus: { 
        is_current: boolean;
        missing_updates: number;
        status_code?: "UP_TO_DATE" | "OUT_OF_DATE" | "INCONSISTENT";
        missing_tables_count?: number;
    } | null;
    isSyncChecking: boolean;
}

export const InstitutionDetailModal = ({
    institution,
    isOpen,
    onClose,
    isActionLoading,
    activeAction,
    onAction,
    syncStatus,
    isSyncChecking
}: InstitutionDetailModalProps) => {
    if (!institution) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open && !isActionLoading) onClose(); }}>
            <DialogContent className="w-full max-w-2xl max-h-[90vh] bg-[#0a0d12] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden p-0">
                {/* Sticky header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] bg-black/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center text-[var(--text-primary)] shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Institution <span className="text-primary italic">Profile</span></h2>
                            <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">{institution?.domain}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isActionLoading}
                        className="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    
                    {/* Identity card */}
                    <div className="glass px-6 py-5 rounded-2xl border-[var(--border)] bg-white/[0.02] flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center text-[var(--text-primary)] shadow-xl shadow-primary/30 shrink-0">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <h3 className="text-2xl font-black text-[var(--text-primary)] leading-tight tracking-tight truncate">{institution.name}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${institution.status === "APPROVED" ? "bg-green-400/10 border-green-400/20 text-green-400" :
                                    institution.status === "PENDING" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                                        institution.status === "PROVISIONING" ? "bg-primary/10 border-primary/20 text-primary" :
                                            institution.status === "REJECTED" ? "bg-red-400/10 border-red-400/20 text-red-400" :
                                                institution.status === "ABORTED" ? "bg-orange-400/10 border-orange-400/20 text-orange-400" :
                                                    "bg-blue-400/10 border-blue-400/20 text-blue-400"
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${["PROVISIONING", "PENDING"].includes(institution.status) ? "animate-pulse" : ""}`} />
                                    {institution.status.replace('_', ' ')}
                                </span>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-xl text-[9px] text-[var(--text-secondary)] font-bold border border-[var(--border)]">
                                    <Clock className="w-3 h-3" />
                                    Registered {new Date(institution.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                {institution.is_manual && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-xl text-[9px] text-primary font-bold border border-primary/10">
                                        Manual Entry
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-5 rounded-2xl border-[var(--border)] space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                                <Globe className="w-3.5 h-3.5" /> Domain
                            </div>
                            <p className="text-[var(--text-primary)] font-black text-lg tracking-tight">{institution.domain}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Authorized Domain</p>
                        </div>
                        <div className="glass p-5 rounded-2xl border-[var(--border)] space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                <Users className="w-3.5 h-3.5" /> Students
                            </div>
                            <p className="text-[var(--text-primary)] font-black text-lg tracking-tight">{institution.student_count_estimate?.toLocaleString() || "—"}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Estimated User Count</p>
                        </div>
                    </div>

                    {/* Contact info */}
                    <div className="glass p-6 rounded-2xl border-[var(--border)] space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                            <Phone className="w-3.5 h-3.5" /> Contact Details
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                    <Mail className="w-3 h-3 text-primary/60" /> Email
                                </div>
                                <p className="text-[var(--text-primary)] font-bold text-sm truncate">{institution.contact_email || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                    <Phone className="w-3 h-3 text-green-500/60" /> Phone
                                </div>
                                <p className="text-[var(--text-primary)] font-bold text-sm">{institution.contact_number || "—"}</p>
                            </div>
                        </div>
                        {institution.address && (
                            <div className="pt-3 border-t border-[var(--border)] space-y-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                                    <MapPin className="w-3 h-3 text-red-500/60" /> Address
                                </div>
                                <p className="text-[var(--text-primary)]/80 font-medium italic text-sm">{institution.address}</p>
                            </div>
                        )}
                    </div>

                    {/* Tech details (kept subtle) */}
                    <div className="glass-dark p-5 rounded-2xl border-[var(--border)] bg-black/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary/40" />
                                <p className="text-xs font-black text-[var(--text-primary)]">Registration Data</p>
                            </div>
                            <span className="text-[9px] font-black text-primary/40 font-mono">ID: {String(institution.id || "").slice(-8)}</span>
                        </div>
                        <div className="bg-[var(--bg-base)]/60 rounded-xl p-4 group relative overflow-hidden">
                            <pre className="relative font-mono text-[10px] leading-relaxed text-primary/60 max-h-[150px] overflow-y-auto">
                                {JSON.stringify(institution.registration_data || institution, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Database Sync Status (Fine Naming) */}
                    {institution.status === "APPROVED" && (
                        <div className="space-y-3">
                            {isSyncChecking ? (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 animate-pulse">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Verifying database structure...</p>
                                </div>
                        ) : (syncStatus?.status_code === "INCONSISTENT" || (syncStatus?.missing_tables_count || 0) > 0) ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between group">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                                        <AlertCircle className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black text-red-500 uppercase tracking-widest leading-none mb-1">STRUCTURAL ERROR</p>
                                        <p className="text-[10px] text-red-500/60 font-black uppercase tracking-wider">{syncStatus?.missing_tables_count || 0} TABLES MISSING</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAction(institution.slug, "sync_schema")}
                                    disabled={isActionLoading}
                                    className="h-9 px-4 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    {activeAction === "sync_schema" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    REPAIR DATABASE
                                </button>
                            </div>
                        ) : (syncStatus?.missing_updates || 0) > 0 ? (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <RefreshCw className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest leading-none mb-1">UPDATE AVAILABLE</p>
                                        <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-wider">{syncStatus?.missing_updates} PENDING CHANGES</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAction(institution.slug, "sync_schema")}
                                    disabled={isActionLoading}
                                    className="h-9 px-4 bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {activeAction === "sync_schema" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    APPLY UPDATES
                                </button>
                            </div>
                        ) : syncStatus ? (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="text-left py-0.5">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">DATABASE HEALTHY</p>
                                    <p className="text-[9px] text-emerald-400/60 font-black uppercase tracking-wider">SYSTEM UP TO DATE</p>
                                </div>
                            </div>
                        ) : null}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t border-[var(--border)] bg-[var(--bg-base)]/60 px-6 py-4 shrink-0">
                    {institution?.status === "APPROVED" ? (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-black text-sm">INSTITUTION ACTIVE</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onAction(institution?.slug, "delete_institution")}
                                    disabled={isActionLoading}
                                    className="h-10 px-5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 group disabled:opacity-40"
                                >
                                    {activeAction === "delete_institution" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 group-hover:rotate-90 transition-transform" />}
                                    Delete Institution
                                </button>
                                <button
                                    onClick={() => onAction(institution?.slug, "reject")}
                                    disabled={isActionLoading}
                                    className="h-10 px-5 rounded-xl text-red-500/10 hover:bg-red-500/20 text-red-400 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40"
                                >
                                    {activeAction === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 w-full">
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={() => onAction(institution?.slug, "approve")}
                                    disabled={isActionLoading}
                                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-[var(--text-primary)] font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {activeAction === "approve" ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            {institution?.status === "REJECTED" ? "Restore Access" : "Approve & Setup"}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => onAction(institution?.slug, "delete_institution")}
                                    disabled={isActionLoading}
                                    className="h-11 px-5 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold text-xs rounded-2xl border border-red-600/30 flex items-center gap-2 group transition-all"
                                >
                                    {activeAction === "delete_institution" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />}
                                    Delete Institution
                                </button>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={() => onAction(institution?.slug, "mark_review")}
                                    disabled={isActionLoading}
                                    className="flex-1 h-11 bg-[var(--bg-card)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-xs rounded-2xl border border-white/10 flex items-center justify-center gap-2"
                                >
                                    {activeAction === "mark_review" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4 text-blue-400" />}
                                    Mark for Review
                                </button>
                                <button
                                    onClick={() => onAction(institution?.slug, "reject")}
                                    disabled={isActionLoading}
                                    className="flex-1 h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-2xl border border-red-500/20 flex items-center justify-center gap-2"
                                >
                                    {activeAction === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
