import { Search } from "lucide-react";

interface InstitutionControlsProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
}

export const InstitutionControls = ({ 
    searchTerm, 
    setSearchTerm, 
    activeFilter, 
    setActiveFilter 
}: InstitutionControlsProps) => {
    const filters = ["ALL", "PENDING", "REVIEW", "APPROVED", "REJECTED"];

    return (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative group w-full lg:max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search by name, domain, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-white/10 rounded-[1.5rem] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto font-bold no-scrollbar">
                {filters.map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-5 py-2.5 rounded-xl text-xs transition-all border whitespace-nowrap ${activeFilter === f
                            ? "bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10"
                            : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                            }`}
                    >
                        {f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
                    </button>
                ))}
            </div>
        </div>
    );
};
