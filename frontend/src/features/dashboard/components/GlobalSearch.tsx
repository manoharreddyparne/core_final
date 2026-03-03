import React, { useState, useEffect, useCallback } from 'react';
import { Search, Globe, Users, Building2, LayoutGrid, ChevronRight, X, User, Command, Shield, Settings, Link as LinkIcon, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../auth/api/base';

interface SearchResult {
    institutions: any[];
    users: any[];
}

export const GlobalSearch = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const renderNavIcon = (type?: string) => {
        switch (type) {
            case "security": return <Shield className="w-4 h-4" />;
            case "admin": return <LayoutGrid className="w-4 h-4" />;
            case "config": return <Settings className="w-4 h-4" />;
            default: return <LinkIcon className="w-4 h-4" />;
        }
    };

    const PAGES = [
        { title: "Student Dashboard", path: "/student-dashboard", type: "admin" },
        { title: "Intelligence Hub", path: "/student-intelligence", type: "config" },
        { title: "Resume Studio", path: "/resume-studio", type: "config" },
        { title: "Career Placement", path: "/placement-hub", type: "admin" },
        { title: "Professional Hub", path: "/professional-hub", type: "admin" },
        { title: "Nexus Bulletins", path: "/newsletters", type: "admin" },
        { title: "Support & Healing", path: "/support-hub", type: "security" },
        { title: "My Profile", path: "/profile", type: "admin" },
        { title: "Security Hub", path: "/security", type: "security" },
    ];

    const handleSearch = async (val: string) => {
        if (val.length < 2) {
            setResults(null);
            return;
        }
        setLoading(true);
        try {
            // Local Page Navigation check
            const localNav = PAGES.filter(p =>
                p.title.toLowerCase().includes(val.toLowerCase())
            );

            const res = await apiClient.get(`superadmin/global-search/?q=${val}`);
            const data = res.data?.data || { institutions: [], users: [], navigation: [] };

            // Merge local and remote navigation
            const combinedNav = [...localNav, ...(data.navigation || [])];
            // Remove duplicates by path
            const uniqueNav = combinedNav.filter((v, i, a) => a.findIndex(t => t.path === v.path) === i);

            setResults({
                ...data,
                navigation: uniqueNav
            });
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) handleSearch(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]); // Removed handleSearch from dependency array as it's no longer useCallback wrapped

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-300">
            {/* Ultra-light translucent backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-md rounded-[32px] shadow-[0_0_120px_rgba(0,0,0,0.1)] border border-white/20 overflow-hidden animate-in slide-in-from-top-4 duration-300">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for everything (Cmd+K)..."
                        className="w-full pl-16 pr-16 py-7 text-xl outline-none bg-transparent text-gray-900 placeholder:text-gray-400 font-bold selection:bg-primary/20"
                    />
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    {loading && (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        </div>
                    )}
                </div>

                {(results || loading) && (
                    <div className="max-h-[60vh] overflow-y-auto border-t border-gray-50 bg-gray-50/30 p-4 space-y-6">
                        {/* Navigation Section */}
                        {(results as any)?.navigation?.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-3">
                                    Navigation & Tools
                                </h3>
                                <div className="grid gap-1">
                                    {(results as any).navigation.map((item: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                navigate(item.path);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between p-4 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-gray-100 text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                            {renderNavIcon(item.type)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">{item.title}</div>
                                                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">System Quick Action</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Institutions */}
                        {(results?.institutions?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">
                                    Identified Institutions
                                </h3>
                                <div className="grid gap-1">
                                    {results?.institutions.map(inst => (
                                        <button
                                            key={inst.id}
                                            onClick={() => {
                                                navigate(`/superadmin/institutions?slug=${inst.slug}`);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between p-4 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Globe className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-900">{inst.name}</div>
                                                    <div className="text-xs text-gray-500">{inst.domain}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${inst.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                    {inst.status}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Users */}
                        {(results?.users?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">
                                    Registered Personnel
                                </h3>
                                <div className="grid gap-1">
                                    {results?.users.map(u => (
                                        <button
                                            key={u.id}
                                            className="w-full flex items-center justify-between p-4 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-900">{u.first_name} {u.last_name}</div>
                                                    <div className="text-xs text-gray-500">{u.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black px-2 py-1 rounded-full bg-purple-100 text-purple-700 uppercase tracking-tighter">
                                                    {u.role}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {query.length >= 2 && !loading &&
                            (results?.institutions?.length === 0 &&
                                results?.users?.length === 0 &&
                                (results as any)?.navigation?.length === 0) && (
                                <div className="py-12 text-center space-y-2">
                                    <Search className="w-10 h-10 text-gray-200 mx-auto" />
                                    <div className="text-gray-400 font-medium">No results found for "{query}"</div>
                                </div>
                            )}
                    </div>
                )}

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>Press ESC to exit</span>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white shadow-sm">Enter</kbd> to select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white shadow-sm">↑↓</kbd> to navigate
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
