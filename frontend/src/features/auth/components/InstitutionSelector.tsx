import React, { useState, useRef, useEffect } from 'react';
import { Institution } from '../api/v2AuthApi';
import { Building2, ChevronDown, Check, Loader2, Globe } from 'lucide-react';

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
                <div className="absolute z-50 w-full mt-2 glass border border-white/10 rounded-3xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1">
                        {institutions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm italic">
                                No active institutions found.
                            </div>
                        ) : (
                            institutions.map((inst) => (
                                <button
                                    key={inst.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(inst);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/10 ${selected?.id === inst.id ? 'bg-primary/20 text-white' : 'text-gray-400'}`}
                                >
                                    <div className="flex flex-col items-start px-1">
                                        <span className="font-bold text-sm tracking-tight">{inst.name}</span>
                                        <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">{inst.domain}</span>
                                    </div>
                                    {selected?.id === inst.id && <Check className="w-4 h-4 text-primary" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
