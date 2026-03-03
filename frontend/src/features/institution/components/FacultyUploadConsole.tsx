import React, { useState, useEffect, useMemo } from "react";
import { Upload, X, Download, Loader2, Search, Edit3, Trash2, Activity, Check, Eraser, ChevronLeft, ChevronRight, LayoutGrid, AlertTriangle, FileText, ArrowUp, ArrowDown, Info, Database } from "lucide-react";
import { createPortal } from "react-dom";

interface FacultyUploadConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (e: any) => void;
    onDownloadTemplate: () => void;
    onCommit: (data: any[]) => void;
    onDiscard: () => void;
    isValidating: boolean;
    valProgress: number;
    valMessage: string;
    isCommitting: boolean;
    commitPhase: string;
    commitProgress: number;
    previewData: any;
}

export const FacultyUploadConsole: React.FC<FacultyUploadConsoleProps> = ({
    isOpen, onClose, onFileSelect, onDownloadTemplate, onCommit, onDiscard,
    isValidating, valProgress, valMessage,
    isCommitting, commitPhase, commitProgress,
    previewData
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isEditing, setIsEditing] = useState(false);
    const [localData, setLocalData] = useState<any[]>([]);

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        if (previewData) {
            const valid = (previewData.valid_records || []).map((r: any) => {
                const updateInfo = (previewData.updates || []).find((u: any) =>
                    (u.employee_id || '').toLowerCase() === (r.employee_id || '').toLowerCase()
                );
                return {
                    ...r,
                    _status: 'VALID',
                    _diff: updateInfo?.diff,
                    _isNew: updateInfo?.is_new,
                    _isUnchanged: updateInfo?.is_unchanged
                };
            });
            const invalid = (previewData.invalid_records || []).map((r: any) => ({ ...r, _status: 'INVALID' }));
            setLocalData([...valid, ...invalid]);
        }
    }, [previewData]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleUpdateField = (index: number, field: string, value: any) => {
        const updated = [...localData];
        updated[index] = { ...updated[index], [field]: value };
        setLocalData(updated);
    };

    const handleDeleteRow = (index: number) => {
        setLocalData(prev => prev.filter((_, i) => i !== index));
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = useMemo(() => {
        let result = [...localData];
        if (statusFilter === "INVALID") result = result.filter(u => u._status === 'INVALID');
        if (statusFilter === "VALID") result = result.filter(u => u._status === 'VALID');
        if (statusFilter === "UPDATES") result = result.filter(u => u._diff && Object.keys(u._diff).length > 0);
        if (statusFilter === "NEW") result = result.filter(u => u._isNew);
        if (statusFilter === "UNCHANGED") result = result.filter(u => u._isUnchanged);

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                Object.values(u).some(val =>
                    val !== null && val !== undefined && String(val).toLowerCase().includes(term)
                )
            );
        }

        if (sortConfig !== null) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [localData, searchTerm, statusFilter, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const displayData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const CellInput = ({ value, onChange, type = "text" }: any) => (
        <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent border border-transparent hover:border-white/20 focus:bg-[#1A1A1A] focus:border-primary/50 rounded-sm px-2 py-1.5 w-full text-[10px] font-bold text-white outline-none transition-all placeholder:text-white/20 uppercase appearance-none"
            placeholder="..."
        />
    );

    const CellDisplay = ({ value, diffInfo, className, isNew }: any) => {
        if (diffInfo) {
            return (
                <div className="flex flex-col px-2">
                    <span className="text-[8px] text-red-500/70 line-through truncate">{String(diffInfo.old || "-")}</span>
                    <span className={`text-[10px] text-green-400 font-bold truncate ${className || ''}`}>{String(diffInfo.new || "-")}</span>
                </div>
            );
        }
        if (isNew) return <span className={`block px-2 text-primary font-bold ${className || ''}`}>{value || "-"}</span>;
        return <span className={`block px-2 ${className || ''}`}>{value || "-"}</span>;
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-primary" />;
    };

    const thClass = "p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-r border-white/5 cursor-pointer hover:bg-white/5 hover:text-white transition-all select-none group whitespace-nowrap";

    const content = (
        <div className="fixed inset-0 z-[99999] flex flex-col animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#050505]/40 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <LayoutGrid className="w-4 h-4" />
                        </div>
                        <h1 className="text-sm font-black italic uppercase tracking-tighter">Educator <span className="text-primary not-italic">Synchronizer</span></h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-6 px-6 border-x border-white/5 h-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[7px] font-black text-green-500 uppercase tracking-widest leading-none">Valid</span>
                                <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._status === 'VALID').length}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none">New</span>
                                <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._isNew).length}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[7px] font-black text-red-500 uppercase tracking-widest leading-none">Errors</span>
                                <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._status === 'INVALID').length}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-2 bg-[#0a0a0a] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2 flex-1 max-w-3xl">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                            <input type="text" placeholder="Search Faculty..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-[10px] font-bold text-white outline-none focus:border-primary/50 transition-all uppercase" />
                        </div>
                        <div className="flex border border-white/10 rounded-md overflow-hidden bg-[#121212]">
                            <button onClick={() => setStatusFilter("ALL")} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "ALL" ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`}>All</button>
                            <button onClick={() => setStatusFilter("INVALID")} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "INVALID" ? 'bg-red-500/10 text-red-500' : 'text-red-500/40 hover:text-red-500/80'}`}>Errors</button>
                            <button onClick={() => setStatusFilter("UPDATES")} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "UPDATES" ? 'bg-orange-500/10 text-orange-400' : 'text-orange-500/40 hover:text-orange-500/80'}`}>Updates</button>
                            <button onClick={() => setStatusFilter("NEW")} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "NEW" ? 'bg-blue-500/10 text-blue-400' : 'text-blue-500/40 hover:text-blue-500/80'}`}>New</button>
                        </div>
                    </div>
                    <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-1.5 rounded-md border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${isEditing ? 'bg-primary/20 border-primary text-primary shadow-xl' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5 hover:text-white'}`}>
                        {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                        {isEditing ? 'Save Edits' : 'Manual Overrides'}
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
                    <div className="absolute inset-0 overflow-auto custom-scrollbar">
                        {!isValidating && previewData ? (
                            <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                                <thead className="sticky top-0 z-20 bg-[#111111] shadow-md border-b border-white/10">
                                    <tr>
                                        <th className="w-12 p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center border-r border-white/5">#</th>
                                        <th className={`w-48 ${thClass}`} onClick={() => requestSort('employee_id')}>Employee ID <SortIcon columnKey="employee_id" /></th>
                                        <th className={`w-64 ${thClass}`} onClick={() => requestSort('full_name')}>Full Name <SortIcon columnKey="full_name" /></th>
                                        <th className={`w-64 ${thClass}`} onClick={() => requestSort('email')}>Official Email <SortIcon columnKey="email" /></th>
                                        <th className={`w-48 ${thClass}`} onClick={() => requestSort('designation')}>Designation <SortIcon columnKey="designation" /></th>
                                        <th className={`w-48 ${thClass}`} onClick={() => requestSort('department')}>Department <SortIcon columnKey="department" /></th>
                                        <th className={`w-36 ${thClass}`} onClick={() => requestSort('joining_date')}>Joining Date <SortIcon columnKey="joining_date" /></th>
                                        {isEditing && <th className="w-16 p-3 text-center">Ops</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {displayData.map((u, i) => {
                                        const originalIndex = localData.indexOf(u);
                                        const isErr = u._status === 'INVALID';
                                        return (
                                            <tr key={i} className={`group hover:bg-[#1a1a1a] transition-colors ${isErr ? 'bg-red-500/[0.04]' : 'bg-[#0f0f0f]'}`}>
                                                <td className="p-1.5 text-center border-r border-white/5 text-[9px] font-mono whitespace-nowrap text-white/20">{originalIndex + 1}</td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.employee_id} onChange={(v: any) => handleUpdateField(originalIndex, 'employee_id', v)} /> : <CellDisplay value={u.employee_id} isNew={u._isNew} className="text-[10px] font-black uppercase" />}
                                                </td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.full_name} onChange={(v: any) => handleUpdateField(originalIndex, 'full_name', v)} /> : <CellDisplay value={u.full_name} diffInfo={u._diff?.full_name} isNew={u._isNew} className="text-[10px] font-bold text-white/70 capitalize" />}
                                                </td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.email} onChange={(v: any) => handleUpdateField(originalIndex, 'email', v)} /> : <CellDisplay value={u.email} diffInfo={u._diff?.email} isNew={u._isNew} className="text-[10px] font-mono text-white/40 lowercase" />}
                                                </td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.designation} onChange={(v: any) => handleUpdateField(originalIndex, 'designation', v)} /> : <CellDisplay value={u.designation} diffInfo={u._diff?.designation} isNew={u._isNew} className="text-[10px] font-bold text-white/60" />}
                                                </td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.department} onChange={(v: any) => handleUpdateField(originalIndex, 'department', v)} /> : <CellDisplay value={u.department} diffInfo={u._diff?.department} isNew={u._isNew} className="text-[10px] font-black text-white/60 uppercase" />}
                                                </td>
                                                <td className="p-1 px-2 border-r border-white/5">
                                                    {isEditing ? <CellInput value={u.joining_date} type="date" onChange={(v: any) => handleUpdateField(originalIndex, 'joining_date', v)} /> : <CellDisplay value={u.joining_date} diffInfo={u._diff?.joining_date} isNew={u._isNew} className="text-[10px] font-bold text-white/50" />}
                                                </td>
                                                {isEditing && (
                                                    <td className="p-1 text-center">
                                                        <button onClick={() => handleDeleteRow(originalIndex)} className="p-1.5 text-white/20 hover:text-red-500 rounded transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : isValidating ? (
                            <div className="flex flex-col items-center justify-center p-20 space-y-10 h-full">
                                <Activity className="w-12 h-12 text-primary animate-pulse" />
                                <div className="text-center space-y-3">
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">{valMessage}</h2>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">{valProgress}% Registry Scanning</p>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-20">
                                <div className="w-full max-w-xl aspect-video border-[1.5px] border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center group hover:border-primary/40 transition-all cursor-pointer bg-[#111]" onClick={() => document.getElementById('faculty-csv-upload')?.click()}>
                                    <input type="file" id="faculty-csv-upload" className="hidden" accept=".csv" onChange={onFileSelect} />
                                    <FileText className="w-12 h-12 text-white/10 group-hover:text-primary transition-all duration-500 mb-6" />
                                    <h2 className="text-lg font-black italic uppercase tracking-tighter text-white/80 group-hover:text-white">Batch Import Educators</h2>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2">CSV: employee_id, full_name, email, designation, department</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-16 border-t border-black bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-30 shadow-2xl">
                    <button onClick={onDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-white/5 rounded-md text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                        <Download className="w-3.5 h-3.5" /> Template
                    </button>
                    <div className="flex items-center gap-6">
                        <button onClick={() => onCommit(localData)} disabled={isCommitting || !previewData || localData.some(r => r._status === 'INVALID')} className="bg-primary px-8 py-2.5 rounded-md text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl disabled:opacity-30 flex items-center gap-2 transition-all active:scale-95">
                            {isCommitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {commitPhase}</> : <>Commit to Registry <Database className="w-3.5 h-3.5" /></>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Committing Overlay */}
            {isCommitting && (
                <div className="absolute inset-0 bg-[#050505]/60 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-20 text-center animate-in fade-in transition-all">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-8" />
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{commitPhase}</h2>
                    <div className="w-full max-w-md h-1 bg-white/5 rounded-full overflow-hidden mt-8">
                        <div className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,1)] transition-all duration-500" style={{ width: `${commitProgress}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
    return createPortal(content, document.body);
};
