import React, { useState, useEffect, useMemo } from "react";
import { Upload, X, Download, Loader2, Search, Edit3, Trash2, ArrowRight, Activity, Filter, Database, Check, Eraser, ChevronLeft, ChevronRight, LayoutGrid, AlertTriangle, FileText, ArrowUp, ArrowDown, Info } from "lucide-react";
import { createPortal } from "react-dom";

interface UploadConsoleProps {
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

export const UploadConsole: React.FC<UploadConsoleProps> = ({
    isOpen, onClose, onFileSelect, onDownloadTemplate, onCommit, onDiscard,
    isValidating, valProgress, valMessage,
    isCommitting, commitPhase, commitProgress,
    previewData
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isEditing, setIsEditing] = useState(false);
    const [localData, setLocalData] = useState<any[]>([]);

    // Spreadsheet Sorting
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Spreadsheet Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Merge valid and invalid records
    useEffect(() => {
        if (previewData) {
            const valid = (previewData.valid_records || []).map((r: any) => {
                const updateInfo = (previewData.updates || []).find((u: any) =>
                    (u.roll_number || '').toLowerCase() === (r.roll_number || '').toLowerCase()
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

                // Numeric sorting check
                const aNum = Number(aValue);
                const bNum = Number(bValue);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }

                // String comparison fallback
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [localData, searchTerm, statusFilter, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sortConfig]);

    const displayData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const CellInput = ({ value, onChange, type = "text", step }: any) => (
        <input
            type={type}
            step={step}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent border border-transparent hover:border-white/20 focus:bg-[#1A1A1A] focus:border-primary/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.2)] rounded-sm px-2 py-1.5 w-full text-[10px] font-bold text-white outline-none transition-all placeholder:text-white/20 uppercase appearance-none"
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
        if (isNew) {
            return <span className={`block px-2 text-primary font-bold ${className || ''}`}>{value || "-"}</span>;
        }
        return <span className={`block px-2 ${className || ''}`}>{value || "-"}</span>;
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-primary" />;
    };

    const thClass = "p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground border-r border-white/5 cursor-pointer hover:bg-white/5 hover:text-white transition-all select-none group whitespace-nowrap";

    const content = (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-[#050505] text-white animate-in fade-in duration-300">
            {/* Ultra-Slim Command Header */}
            <div className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-black italic uppercase tracking-tighter">Institution <span className="text-primary not-italic">Data Room</span></h1>
                            <div className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[7px] font-black text-primary tracking-widest uppercase">Spreadsheet Control</div>
                        </div>
                    </div>
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
                            <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest leading-none">Modified</span>
                            <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._diff && Object.keys(r._diff).length > 0).length}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-none">Unchanged</span>
                            <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._isUnchanged).length}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[7px] font-black text-red-500 uppercase tracking-widest leading-none">Errors</span>
                            <span className="text-[10px] font-black text-white italic mt-0.5">{localData.filter(r => r._status === 'INVALID').length}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Advanced Filtering & Tools Bar */}
                <div className="px-6 py-2 bg-[#0a0a0a] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2 flex-1 max-w-3xl">
                        {/* Search Bar */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search Records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#121212] border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-[10px] font-bold text-white outline-none focus:border-primary/50 transition-all uppercase"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                    <Eraser className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Advanced Filters */}
                        <div className="flex border border-white/10 rounded-md overflow-hidden bg-[#121212]">
                            <button
                                onClick={() => setStatusFilter("ALL")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "ALL" ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`}
                            >All Data</button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={() => setStatusFilter("INVALID")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${statusFilter === "INVALID" ? 'bg-red-500/10 text-red-500' : 'text-red-500/40 hover:text-red-500/80'}`}
                            >
                                <AlertTriangle className="w-3 h-3" /> Conflicts
                            </button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={() => setStatusFilter("VALID")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "VALID" ? 'bg-green-500/10 text-green-500' : 'text-green-500/40 hover:text-green-500/80'}`}
                            >Verified</button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={() => setStatusFilter("UPDATES")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "UPDATES" ? 'bg-orange-500/10 text-orange-400' : 'text-orange-500/40 hover:text-orange-500/80'}`}
                            >Modified</button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={() => setStatusFilter("NEW")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "NEW" ? 'bg-blue-500/10 text-blue-400' : 'text-blue-500/40 hover:text-blue-500/80'}`}
                            >New</button>
                            <div className="w-px bg-white/10" />
                            <button
                                onClick={() => setStatusFilter("UNCHANGED")}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${statusFilter === "UNCHANGED" ? 'bg-white/5 text-white/70' : 'text-white/30 hover:text-white/60'}`}
                            >Unchanged</button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest tabular-nums">
                            {filteredData.length} records found
                        </span>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-1.5 rounded-md border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${isEditing ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5 hover:text-white'}`}
                        >
                            {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                            {isEditing ? 'Lock Changes' : 'Edit Data'}
                        </button>
                    </div>
                </div>

                {/* The Spreadsheet Surface */}
                <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
                    <div className="absolute inset-0 overflow-auto custom-scrollbar">
                        {!isValidating && previewData ? (
                            filteredData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                                    <Info className="w-12 h-12 text-white/10" />
                                    <h3 className="text-lg font-black uppercase tracking-tighter text-white/50 italic">
                                        {statusFilter === 'UPDATES' ? 'No modifications detected' :
                                            statusFilter === 'NEW' ? 'All records already exist in the registry' :
                                                statusFilter === 'UNCHANGED' ? 'All records have changes' :
                                                    statusFilter === 'INVALID' ? 'No conflicts found — all records are valid' :
                                                        'No records match your search'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                        {statusFilter !== 'ALL' ? 'Try switching to "All Data" to see all records' : 'Adjust your search query'}
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse table-fixed min-w-[1700px]">
                                    <thead className="sticky top-0 z-20 bg-[#111111] shadow-md border-b border-white/10">
                                        <tr>
                                            <th className="w-12 p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center border-r border-white/5">#</th>
                                            <th className={`w-36 ${thClass}`} onClick={() => requestSort('roll_number')}>
                                                Identity Ref <SortIcon columnKey="roll_number" />
                                            </th>
                                            <th className={`w-64 ${thClass}`} onClick={() => requestSort('full_name')}>
                                                Legal Name <SortIcon columnKey="full_name" />
                                            </th>
                                            <th className={`w-28 text-center ${thClass}`} onClick={() => requestSort('program')}>
                                                Program <SortIcon columnKey="program" />
                                            </th>
                                            <th className={`w-32 text-center ${thClass}`} onClick={() => requestSort('branch')}>
                                                Dept <SortIcon columnKey="branch" />
                                            </th>
                                            <th className={`w-24 text-center ${thClass}`} onClick={() => requestSort('batch_year')}>
                                                Cohort <SortIcon columnKey="batch_year" />
                                            </th>
                                            <th className={`w-20 text-center ${thClass}`} onClick={() => requestSort('current_semester')}>
                                                Sem <SortIcon columnKey="current_semester" />
                                            </th>
                                            <th className={`w-24 text-center ${thClass}`} onClick={() => requestSort('cgpa')}>
                                                CGPA <SortIcon columnKey="cgpa" />
                                            </th>
                                            <th className={`w-24 text-center ${thClass}`} onClick={() => requestSort('category')}>
                                                Category <SortIcon columnKey="category" />
                                            </th>
                                            <th className={`w-64 ${thClass}`} onClick={() => requestSort('official_email')}>
                                                Institutional Email <SortIcon columnKey="official_email" />
                                            </th>
                                            {isEditing && <th className="w-16 p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Row Ops</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {displayData.map((u, i) => {
                                            const globalIndex = (currentPage - 1) * itemsPerPage + i;
                                            const originalIndex = localData.indexOf(u);
                                            const isErr = u._status === 'INVALID';

                                            return (
                                                <tr key={i} className={`group hover:bg-[#1a1a1a] transition-colors ${isErr ? 'bg-red-500/[0.04]' : 'bg-[#0f0f0f]'}`}>
                                                    <td className={`p-1.5 text-center border-r border-white/5 text-[9px] font-mono tracking-tighter ${isErr ? 'text-red-500 font-bold' : 'text-white/20'}`}>
                                                        {globalIndex + 1}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput value={u.roll_number} onChange={(v: string) => handleUpdateField(originalIndex, 'roll_number', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.roll_number} diffInfo={u._diff?.roll_number} isNew={u._isNew} className="text-[10px] font-black tracking-tighter text-white/90 uppercase" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput value={u.full_name} onChange={(v: string) => handleUpdateField(originalIndex, 'full_name', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.full_name} diffInfo={u._diff?.full_name} isNew={u._isNew} className="text-[10px] font-bold text-white/70 group-hover:text-white transition-colors capitalize" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput value={u.program} onChange={(v: string) => handleUpdateField(originalIndex, 'program', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.program} diffInfo={u._diff?.program} isNew={u._isNew} className="text-[9px] font-black text-white/60 text-center block uppercase" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput value={u.branch} onChange={(v: string) => handleUpdateField(originalIndex, 'branch', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.branch} diffInfo={u._diff?.branch} isNew={u._isNew} className="text-[9px] font-black text-white/60 text-center block uppercase" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput type="number" value={u.batch_year} onChange={(v: string) => handleUpdateField(originalIndex, 'batch_year', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.batch_year} diffInfo={u._diff?.batch_year} isNew={u._isNew} className="text-[10px] font-black text-white/50 text-center block" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput type="number" value={u.current_semester} onChange={(v: string) => handleUpdateField(originalIndex, 'current_semester', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.current_semester} diffInfo={u._diff?.current_semester} isNew={u._isNew} className="text-[10px] font-black text-white/50 text-center block" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput type="number" step="0.01" value={u.cgpa} onChange={(v: string) => handleUpdateField(originalIndex, 'cgpa', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.cgpa} diffInfo={u._diff?.cgpa} isNew={u._isNew} className="text-[10px] font-black text-primary italic text-center block font-mono" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <select
                                                                value={u.category || ""}
                                                                onChange={(e) => handleUpdateField(originalIndex, 'category', e.target.value)}
                                                                className="bg-transparent border border-transparent hover:border-white/20 focus:bg-[#1A1A1A] focus:border-primary/50 rounded-sm px-2 py-1 w-full text-[10px] font-bold text-white outline-none appearance-none"
                                                            >
                                                                <option value="" className="bg-[#111]">Select...</option>
                                                                <option value="GEN" className="bg-[#111]">GEN</option>
                                                                <option value="OBC" className="bg-[#111]">OBC</option>
                                                                <option value="SC" className="bg-[#111]">SC</option>
                                                                <option value="ST" className="bg-[#111]">ST</option>
                                                                <option value="EWS" className="bg-[#111]">EWS</option>
                                                            </select>
                                                        ) : (
                                                            <CellDisplay value={u.category} diffInfo={u._diff?.category} isNew={u._isNew} className="text-[9px] font-black text-white/40 text-center block uppercase" />
                                                        )}
                                                    </td>
                                                    <td className="p-1 px-2 border-r border-white/5">
                                                        {isEditing ? (
                                                            <CellInput value={u.official_email} onChange={(v: string) => handleUpdateField(originalIndex, 'official_email', v)} />
                                                        ) : (
                                                            <CellDisplay value={u.official_email} diffInfo={u._diff?.official_email} isNew={u._isNew} className="text-[10px] font-mono text-white/40 truncate block lowercase group-hover:text-white/80 transition-colors" />
                                                        )}
                                                    </td>
                                                    {isEditing && (
                                                        <td className="p-1 text-center">
                                                            <button onClick={() => handleDeleteRow(originalIndex)} className="p-1.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded transition-all">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )
                        ) : isValidating ? (
                            <div className="flex flex-col items-center justify-center p-20 space-y-10 h-full">
                                <Activity className="w-12 h-12 text-primary animate-pulse" />
                                <div className="text-center space-y-3">
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">{valMessage}</h2>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">{valProgress}% Processing Feed</p>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-20">
                                <div
                                    className="w-full max-w-xl aspect-video border-[1.5px] border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center group hover:border-primary/40 transition-all cursor-pointer bg-[#111]"
                                    onClick={() => document.getElementById('csv-upload')?.click()}
                                >
                                    <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={onFileSelect} />
                                    <FileText className="w-12 h-12 text-white/10 group-hover:text-primary transition-all duration-500 group-hover:scale-110 mb-6" />
                                    <h2 className="text-lg font-black italic uppercase tracking-tighter text-white/80 group-hover:text-white">Import Spreadsheet Feed</h2>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2">CSV format supported</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Spreadsheet Footer: Pagination & Sheets style */}
                {previewData && !isValidating && (
                    <div className="h-10 border-t border-white/5 bg-[#121212] flex items-center justify-between px-4 shrink-0 shadow-inner">
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-2">Sheet View:</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center">
                                {/* Simulated Sheet Tabs */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (currentPage < 3) pageNum = i + 1;
                                    else if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    if (pageNum < 1 || pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === pageNum ? 'bg-[#222] text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/80 hover:bg-[#1a1a1a]'}`}
                                        >
                                            Sheet {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded disabled:opacity-20 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-4">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={onDiscard} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-red-500 transition-all">Discard Upload</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Final Action Bar */}
            <div className="h-16 border-t border-black bg-[#0a0a0a] flex items-center justify-between px-6 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <button onClick={onDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-white/5 rounded-md text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-[#1a1a1a] transition-all">
                    <Download className="w-3.5 h-3.5" /> Template
                </button>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => onCommit(localData)}
                        disabled={isCommitting || !previewData || localData.some(r => r._status === 'INVALID')}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-md text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(59,130,246,0.2)] disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-2 transform active:scale-95"
                    >
                        {isCommitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {commitPhase}</>
                        ) : (
                            <>Finalize & Save Registry <Database className="w-3.5 h-3.5" /></>
                        )}
                    </button>
                </div>
            </div>

            {/* Committing Overlay */}
            {isCommitting && (
                <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-300">
                    <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-8" />
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{commitPhase}</h2>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-8">Securing Block Data. Do not interrupt.</p>
                    <div className="w-full max-w-md h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,1)] transition-all duration-700" style={{ width: `${commitProgress}%` }} />
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
};
