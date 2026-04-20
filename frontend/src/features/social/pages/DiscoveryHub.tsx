import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, ArrowRight, ShieldCheck, Zap, Globe, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { socialApi } from '../api';
import { toast } from 'react-hot-toast';

export const DiscoveryHub = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [connectingIds, setConnectingIds] = useState<string[]>([]);

    const fetchDiscovery = (query = "") => {
        setLoading(true);
        socialApi.getDiscovery(query)
            .then(res => setResults(Array.isArray(res) ? res : []))
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDiscovery();
    }, []);

    const handleConnect = async (userId: number, role: string) => {
        const identifier = `${role}-${userId}`;
        if (connectingIds.includes(identifier)) return;

        setConnectingIds(prev => [...prev, identifier]);
        try {
            await socialApi.connectToUser(userId, role);
            toast.success("Connection request dispatched!");
            fetchDiscovery(search);
        } catch (err) {
            toast.error("Failed to connect.");
        } finally {
            setConnectingIds(prev => prev.filter(id => id !== identifier));
        }
    };

    const handleMessage = async (userId: number, role: string) => {
        try {
            const session = await socialApi.startChat(userId, role);
            if (session?.session_id) {
                navigate(`/chat-hub?session=${session.session_id}`);
            }
        } catch (err) {
            toast.error("Unable to initiate secure channel.");
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'STUDENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'FACULTY': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'INST_ADMIN':
            case 'ADMIN':
            case 'INSTITUTION_ADMIN': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden glass rounded-[3rem] p-12 border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] rounded-full -mr-48 -mt-48 animate-pulse-slow"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            <Zap className="w-3 h-3 fill-primary" />
                            Unified Discovery Engine
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic">
                            CONNECT <span className="text-primary not-italic">&</span> SCALE
                        </h1>
                        <p className="text-gray-400 text-lg max-w-xl font-medium">
                            The institutional bridge for the next generation. Find peers, collaborate with faculty, and sync with administrators in a premium, high-integrity environment.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
                            <div className="flex items-center gap-3 glass-dark px-6 py-3 rounded-2xl border-white/5 shadow-2xl">
                                <Users className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Active Peers</p>
                                    <p className="text-white font-black">2.4k+</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 glass-dark px-6 py-3 rounded-2xl border-white/5 shadow-2xl">
                                <ShieldCheck className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Verified Accounts</p>
                                    <p className="text-white font-black">100%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Plate */}
                    <div className="w-full md:w-96 glass-dark p-8 rounded-[2.5rem] border-white/10 shadow-3xl">
                        <div className="space-y-6">
                            <h3 className="text-white font-bold text-xl flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                Search Network
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Name, Role, or Department..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        fetchDiscovery(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all border border-white/5">Students</button>
                                <button className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase py-2.5 rounded-xl transition-all border border-white/5">Faculty</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter">Recommended <span className="text-primary not-italic">Syncs</span></h2>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Network Feed</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="glass h-64 rounded-[2.5rem] animate-pulse"></div>
                        ))
                    ) : results.length > 0 ? (
                        results.map((person) => (
                            <div key={`${person.role}-${person.id}`} className="group relative glass rounded-[2.5rem] p-8 border-white/5 hover:border-primary/30 transition-all duration-500 hover:translate-y-[-4px] overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-16 h-16 rounded-[1.8rem] ${person.is_ai_support || person.role === 'SUPER_ADMIN' ? 'bg-black' : 'premium-gradient-soft'} flex items-center justify-center text-white text-2xl font-black shadow-2xl relative overflow-hidden`}>
                                        {person.is_ai_support || person.role === 'SUPER_ADMIN' ? (
                                            <img 
                                                src="/auip_ai_core.png" 
                                                alt="AI Support" 
                                                className="w-full h-full object-contain mix-blend-screen "
                                            />
                                        ) : (
                                            <span className="relative z-10">{person.avatar}</span>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-[#121826] z-20"></div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${getRoleBadgeColor(person.role)}`}>
                                        {person.role}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{person.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Verified Active Peer • {person.role === 'STUDENT' ? 'Student Registry' : 'Faculty Registry'}</p>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        onClick={() => handleConnect(person.id, person.role)}
                                        disabled={connectingIds.includes(`${person.role}-${person.id}`)}
                                        className="flex-1 bg-white/10 hover:premium-gradient text-white text-[10px] font-black uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                                    >
                                        {connectingIds.includes(`${person.role}-${person.id}`) ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <UserPlus className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                        )}
                                        {connectingIds.includes(`${person.role}-${person.id}`) ? 'Connecting...' : 'Connect'}
                                    </button>
                                    <button
                                        onClick={() => handleMessage(person.id, person.role)}
                                        className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-xl"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-white/10">
                            <Globe className="w-16 h-16 text-white/10 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Expanding your horizons...</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">No one found with that search yet. Try a different department or role!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium CTA */}
            <div className="glass rounded-[3rem] p-12 text-center space-y-8 bg-gradient-to-br from-primary/5 via-transparent to-transparent border-white/10">
                <div className="max-w-2xl mx-auto space-y-4">
                    <h2 className="text-4xl font-black text-white italic tracking-tighter line-clamp-2">Want to lead a collaboration?</h2>
                    <p className="text-gray-400 font-medium">Create a public study group or faculty circle today. Open for Students & Faculty.</p>
                </div>
                <button className="px-10 py-5 premium-gradient rounded-full text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 transition-transform flex items-center gap-3 mx-auto">
                    Initiate Hub Spaces
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
