import React from "react";
import { Users, Plus, CheckSquare, Square, ShieldCheck, Mail, Trash2, Loader2 } from "lucide-react";

interface MatchCheckPreviewProps {
    show: boolean;
    eligibleStudents: any[];
    excludedRolls: Set<string>;
    toggleExclusion: (roll: string) => void;
    handleBulkExclusion: (exclude: boolean) => void;
    extraRollNumber: string;
    setExtraRollNumber: (roll: string) => void;
    handleAddManualStudent: (student: any) => void;
    onRemoveManualStudent?: (roll: string) => void;
    // Manifest Pagination & Search
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onManifestSearch: (q: string) => void;
    manifestSearchQuery: string;
}

const MatchCheckPreview: React.FC<MatchCheckPreviewProps> = ({
    show,
    eligibleStudents,
    excludedRolls,
    toggleExclusion,
    handleBulkExclusion,
    extraRollNumber,
    setExtraRollNumber,
    handleAddManualStudent,
    onRemoveManualStudent,
    currentPage,
    totalCount,
    pageSize,
    onPageChange,
    onManifestSearch,
    manifestSearchQuery
}) => {
    const [searchResults, setSearchResults] = React.useState<any[]>([]);
    const [searching, setSearching] = React.useState(false);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchInput = (val: string) => {
        setExtraRollNumber(val);
        setSearchResults([]);
        
        if (val.length < 2) return;

        // Debounce: wait 400ms after user stops typing
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                setSearching(true);
                const { placementApi } = await import("../../../placement/api");
                const res = await placementApi.searchStudents(val);
                setSearchResults(res.data || []);
            } catch (e) {
                console.error("Student search failed", e);
            } finally {
                setSearching(false);
            }
        }, 400);
    };

    if (!show) return null;

    return (
        <div className="mt-8 animate-in fade-in zoom-in duration-500">
            {/* Header and Input ... */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users className="w-4 h-4" /> Manifest Verification — Matched Students ({eligibleStudents.length})
                    </p>
                    <div className="flex gap-3 mt-1">
                        <button 
                            onClick={() => handleBulkExclusion(false)}
                            className="text-[9px] font-black text-indigo-500/60 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                        >
                            [ Select All ]
                        </button>
                        <button 
                            onClick={() => handleBulkExclusion(true)}
                            className="text-[9px] font-black text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                        >
                            [ Deselect All ]
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Activated
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> Pending Activation
                    </div>
                </div>
            </div>

            <div className="relative mb-4">
                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex-1 relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input 
                            type="text"
                            placeholder="Add student manually (Not in the Matched list)..."
                            value={extraRollNumber}
                            onChange={e => handleSearchInput(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-10 pr-8 text-[11px] text-white font-bold outline-none focus:border-indigo-500/50 transition-all"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        )}
                    </div>
                    
                    <div className="w-px h-8 bg-white/5 mx-2" />
                    
                    <div className="flex-1 relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400/50" />
                        <input 
                            type="text"
                            placeholder="Filter Matched list (Searches all pages)..."
                            value={manifestSearchQuery}
                            onChange={e => onManifestSearch(e.target.value)}
                            className="w-full bg-indigo-500/5 border border-indigo-500/10 rounded-xl py-2 pl-10 pr-8 text-[11px] text-white font-bold outline-none focus:border-indigo-500/30 transition-all placeholder:text-indigo-400/30"
                        />
                    </div>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl z-[110] max-h-60 overflow-y-auto overflow-hidden divide-y divide-white/5 animate-in slide-in-from-top-2 duration-300">
                        {searchResults.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => {
                                    handleAddManualStudent(s);
                                    setSearchResults([]);
                                    setExtraRollNumber("");
                                }}
                                className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase">{s.full_name}</span>
                                    <span className="text-[9px] font-bold text-gray-500">{s.roll_number} • {s.branch}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-indigo-400">{s.cgpa} CGPA</div>
                                        <div className={`text-[8px] font-bold ${s.is_activated ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {s.is_activated ? 'Activated' : 'Pre-Seeded'}
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-indigo-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-4 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">
                                    <button 
                                        onClick={() => handleBulkExclusion(excludedRolls.size === 0)}
                                        className="p-1 hover:text-indigo-400 transition-colors"
                                    >
                                        {excludedRolls.size === 0 ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Student Identity</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Branch</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">GPA</th>
                                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Verification Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {eligibleStudents.length > 0 ? (
                                eligibleStudents.map((s) => {
                                    const isExcluded = excludedRolls.has(s.roll_number);
                                    return (
                                    <tr key={s.id} className={`hover:bg-white/[0.02] transition-colors group/row ${isExcluded ? 'opacity-40 grayscale' : ''}`}>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    type="button"
                                                    onClick={() => toggleExclusion(s.roll_number)}
                                                    className={`p-1 transition-all ${isExcluded ? 'text-gray-500' : 'text-indigo-500'}`}
                                                >
                                                    {isExcluded ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                                </button>
                                                {s.is_manual && (
                                                    <button 
                                                        onClick={() => onRemoveManualStudent?.(s.roll_number)}
                                                        className="p-1 text-red-500/40 hover:text-red-500 transition-all"
                                                        title="Purge Manual Entry"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[11px] font-black text-white leading-none uppercase">{s.full_name}</span>
                                                    {s.is_manual && <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-md font-black">MANUAL</span>}
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-500">{s.roll_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-indigo-400/80 px-2 py-0.5 bg-indigo-500/10 rounded-lg">{s.branch}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-black text-gray-300">{s.cgpa}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {s.is_activated ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-tighter shadow-lg shadow-emerald-500/10">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Activated
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-400 uppercase tracking-tighter opacity-80 group-hover/row:opacity-100 transition-opacity">
                                                    <Mail className="w-3.5 h-3.5" /> Invite Queued
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-gray-500 uppercase opacity-30">
                                        Registry scan yielded zero matches.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalCount > pageSize && (
                <div className="flex items-center justify-between mt-6 px-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Showing {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} - {Math.min(totalCount, currentPage * pageSize)} of {totalCount} Records
                    </p>
                    <div className="flex items-center gap-4">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(currentPage - 1)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed text-gray-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 uppercase font-black">Page</span>
                            <div className="px-3 py-1 bg-indigo-500/20 rounded-lg text-indigo-400 text-xs font-black">
                                {currentPage}
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase font-black">of</span>
                            <span className="text-xs font-black text-gray-400">{Math.ceil(totalCount / pageSize)}</span>
                        </div>
                        <button 
                            disabled={currentPage * pageSize >= totalCount}
                            onClick={() => onPageChange(currentPage + 1)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage * pageSize >= totalCount ? 'opacity-30 cursor-not-allowed text-gray-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchCheckPreview;
