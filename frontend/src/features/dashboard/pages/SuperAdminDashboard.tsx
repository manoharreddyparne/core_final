import React, { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Building2,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Activity,
    ArrowUpRight,
    Search,
    RefreshCw,
    Download
} from 'lucide-react';
import { apiClient } from "../../auth/api/base";
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";

interface InstitutionStat {
    id: number;
    name: string;
    domain: string;
    status: string;
    certificate_id?: string;
    certificate_url?: string;
}

const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        certificates: 0
    });
    const [recent, setRecent] = useState<InstitutionStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('superadmin/institutions/');
            // DRF normally returns results or data. Adjust based on real API response
            const institutions: InstitutionStat[] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.results || []);

            const derived = {
                total: institutions.length,
                approved: institutions.filter((i: InstitutionStat) => i.status === 'APPROVED').length,
                pending: institutions.filter((i: InstitutionStat) => i.status === 'PENDING').length,
                certificates: institutions.filter((i: InstitutionStat) => !!i.certificate_url).length
            };

            setStats(derived);
            setRecent(institutions.slice(0, 5));
        } catch (err) {
            console.error("Dashboard Sync Failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const statCards = [
        { label: "Total Institutions", value: stats.total, icon: Building2, color: "text-blue-400" },
        { label: "Governance Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-400" },
        { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-400" },
        { label: "Trusted Certificates", value: stats.certificates, icon: ShieldCheck, color: "text-purple-400" },
    ];

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-indigo-400" />
                        Global Governance Hub
                    </h1>
                    <p className="text-slate-400 mt-1">Real-time status of the AUIP Distributed Academic Network</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-all font-mono text-sm uppercase"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync Data
                    </button>
                    <div className="h-10 w-[1px] bg-slate-800" />
                    <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                        <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="p-6 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-slate-700 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon className="w-16 h-16" />
                        </div>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">{stat.label}</p>
                                <h2 className="text-4xl font-black text-white">{stat.value}</h2>
                            </div>
                            <div className={`p-2 rounded-lg bg-slate-800 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activities */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-semibold text-slate-200">System Activity Journal</h3>
                        <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            Full Registry <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950/40 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Institution Network</th>
                                    <th className="px-6 py-4 text-center">Protocol Status</th>
                                    <th className="px-6 py-4">Digital Identity</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40 font-mono text-xs">
                                {recent.length > 0 ? recent.map((inst, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-100 font-bold">{inst.name}</span>
                                                <span className="text-slate-500 text-[10px]">{inst.domain}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${inst.status === 'APPROVED'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {inst.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {inst.certificate_id ? (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                                                    {inst.certificate_id.slice(0, 8)}...
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">UNINITIALIZED</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inst.certificate_url && (
                                                <a href={inst.certificate_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-700 rounded-md transition-colors block">
                                                    <Download className="w-4 h-4 text-slate-400 hover:text-white" />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-600">
                                            No active nodes found in the network.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel: Governance Stats */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-semibold text-slate-200">Security Health</h3>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>

                    <div className="bg-indigo-600 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl shadow-indigo-600/10">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <ShieldCheck className="w-32 h-32" />
                        </div>
                        <p className="text-indigo-200 text-xs font-mono uppercase tracking-widest">Digital CA Status</p>
                        <h4 className="text-2xl font-bold mt-2">Active PKI Protocol</h4>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2">
                                <span className="text-indigo-100">Algorithm</span>
                                <span className="font-bold">RSA-4096 / SHA-256</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2">
                                <span className="text-indigo-100">Validity</span>
                                <span className="font-bold">2026-02-28 (100%)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-indigo-100">Encryption</span>
                                <span className="font-bold text-emerald-300">UPGRADED</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                        <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Network Search</h5>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by domain or RID..."
                                className="w-full bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500/50 text-slate-200"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
