import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Institution } from '../api/v2AuthApi';
import { Building2, ChevronDown, Check, Loader2, Globe, Search, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { InstitutionInterestModal } from './InstitutionInterestModal';

interface Props {
    institutions: Institution[];
    selected: Institution | null;
    onSelect: (inst: Institution | null) => void;
    isLoading?: boolean;
}

export const InstitutionSelector: React.FC<Props> = ({
    institutions,
    selected,
    onSelect,
    isLoading
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clear search when closing
    useEffect(() => {
        if (!isOpen) setSearchQuery('');
    }, [isOpen]);

    const filteredInstitutions = useMemo(() => {
        if (!searchQuery) return institutions;
        return institutions.filter(inst =>
            inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.domain.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [institutions, searchQuery]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                Select Your Institution
            </label>

            <button
                type="button"
                onClick={() => !isLoading && setIsOpen(!isOpen)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl text-left transition-all outline-none focus:ring-2 focus:ring-primary/50 ${isOpen ? 'ring-2 ring-primary/50' : ''}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Globe className="w-4 h-4" />
                        </div>
                    )}

                    <div className="overflow-hidden">
                        <p className="font-bold text-white truncate max-w-[200px]">
                            {selected ? selected.name : (isLoading ? "Syncing Institutions..." : "Choose University")}
                        </p>
                        {selected && (
                            <p className="text-[10px] text-gray-500 uppercase font-black truncate">
                                {selected.domain}
                            </p>
                        )}
                    </div>
                </div>

                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#0f172a] backdrop-blur-2xl border border-white/20 rounded-3xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 origin-top overflow-hidden">
                    {/* Search Header */}
                    <div className="p-2 border-b border-white/10 mb-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            autoFocus
                            placeholder="Search your university..."
                            className="bg-white/5 border-white/10 h-10 pl-10 rounded-xl text-sm focus:ring-1 focus:ring-primary/50 text-white placeholder:text-gray-500 font-bold"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                    </div>

                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1">
                        {filteredInstitutions.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center gap-3">
                                <div className="p-3 rounded-full bg-white/5">
                                    <Building2 className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-300 text-sm font-bold">No results found for "{searchQuery}"</p>
                            </div>
                        ) : (
                            filteredInstitutions.map((inst) => (
                                <button
                                    key={inst.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(inst);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/10 ${selected?.id === inst.id ? 'bg-primary/30 text-white' : 'text-gray-300'}`}
                                >
                                    <div className="flex flex-col items-start px-1">
                                        <span className="font-bold text-[13px] tracking-tight text-white">{inst.name}</span>
                                        <span className="text-[10px] uppercase font-black tracking-widest text-primary/80">{inst.domain}</span>
                                    </div>
                                    {selected?.id === inst.id && <Check className="w-4 h-4 text-primary" />}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Others Action */}
                    <div className="mt-1 p-1 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setIsInterestModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/20 text-primary transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/10">
                                <PlusCircle className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm text-white group-hover:text-primary transition-colors">University Not Listed?</span>
                                <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Tap to suggest & we'll onboard them</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <InstitutionInterestModal
                isOpen={isInterestModalOpen}
                onClose={() => setIsInterestModalOpen(false)}
                initialData={{ institution_name: searchQuery }}
            />
        </div>
    );
};
