// src/features/intelligence/pages/IntelligenceDashboard.tsx
import React, { useEffect, useState } from 'react';
import { intelligenceApi } from '../api';
import { IntelligenceDashboard as DashboardData } from '../types';
import { ReadinessMeter } from '../components/ReadinessMeter';
import { AIChat } from '../components/AIChat';
import { GovernanceBrainModal } from '../components/GovernanceBrainModal';

const IntelligenceDashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [brainModalOpen, setBrainModalOpen] = useState(false);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await intelligenceApi.getDashboard();
                setData(res);
            } catch (err) {
                console.error("Dashboard load failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Syncing with Governance Brain...</p>
            </div>
        );
    }

    if (!data) return <div className="text-white">Error loading intelligence data.</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight text-white italic underline decoration-primary/50 decoration-4 underline-offset-8">
                    Intelligence Command Center
                </h1>
                <p className="text-muted-foreground mt-4 font-medium">
                    Status: <span className="text-green-400 font-bold">{data.system_status}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Governance Metrics */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="glass p-8 rounded-[3rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z" /></svg>
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white tracking-tight">Governance Scores</h2>
                            <button
                                onClick={() => setBrainModalOpen(true)}
                                className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                View Brain History
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <ReadinessMeter score={data.governance.readiness} label="Readiness" />
                            <ReadinessMeter score={data.governance.behavior} label="Behavior" color="green-400" />
                        </div>
                    </div>

                    <div className="glass p-8 rounded-[3rem]">
                        <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Core Interests</h2>
                        <div className="space-y-3">
                            {data.governance.top_interests.map(([name, weight]) => (
                                <div key={name} className="flex items-center justify-between group">
                                    <span className="text-muted-foreground font-medium capitalize text-sm">{name}</span>
                                    <div className="flex-1 mx-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/60 group-hover:bg-primary transition-all duration-1000"
                                            style={{ width: `${Math.min(100, weight * 10)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-white font-mono text-xs">{weight} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: AI & Placement */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Placement Quick View */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass p-6 rounded-[2rem] border-l-4 border-primary">
                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Active Apps</p>
                            <p className="text-3xl font-bold text-white mt-1">{data.placement_summary.total}</p>
                        </div>
                        <div className="glass p-6 rounded-[2rem] border-l-4 border-green-400">
                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Shortlists</p>
                            <p className="text-3xl font-bold text-white mt-1">{data.placement_summary.shortlisted}</p>
                        </div>
                        <div className="glass p-6 rounded-[2rem] border-l-4 border-yellow-400">
                            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Pending Rounds</p>
                            <p className="text-3xl font-bold text-white mt-1">{data.placement_summary.active_stages}</p>
                        </div>
                    </div>

                    {/* AI Chat */}
                    <AIChat />

                    {/* Professional Hub Insights */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
                            Hub Insights
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.recent_blogs && data.recent_blogs.map((blog: any) => (
                                <div key={blog.id} className="glass p-6 rounded-[2rem] hover:border-pink-500/30 transition-all group">
                                    <h4 className="font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-2">{blog.title}</h4>
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{blog.author_role}</span>
                                        <button className="text-[10px] text-pink-500 font-black uppercase tracking-widest bg-pink-500/10 px-3 py-1 rounded-full">Read</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <GovernanceBrainModal isOpen={brainModalOpen} onClose={() => setBrainModalOpen(false)} />
        </div>
    );
};

export default IntelligenceDashboard;
