// src/features/intelligence/pages/TPOAnalyticsDashboard.tsx
// Sprint 7+ — Real-Data Analytics & Reporting: TPO Dashboard with live stats, filters, export
import React, { useEffect, useState, useMemo } from 'react';
import {
    BarChart3, TrendingUp, Users, Briefcase, Building2, Award,
    Download, Filter, RefreshCw, Target, DollarSign, Calendar,
    PieChart, Globe, Zap, ChevronRight, Activity, AlertTriangle,
    Share2, UserCheck, Clock, ArrowUpRight
} from 'lucide-react';
import { placementApi } from '../../placement/api';
import toast from 'react-hot-toast';

interface DriveStats {
    company_name: string;
    role: string;
    status: string;
    applied_count: number;
    placed_count: number;
    package_details: string;
    deadline: string;
}

interface PlacementStats {
    total_students: number;
    placed_students: number;
    placement_percentage: number;
    avg_package: string;
    total_drives: number;
    active_drives: number;
    companies_visited: number;
    drives: DriveStats[];
    branch_stats: Record<string, { placed: number; total: number }>;
    batch_stats: Record<string, { placed: number; total: number }>;
}

const StatCard = ({ label, value, icon: Icon, color, bg, trend, subtitle }: any) => (
    <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4 hover:border-primary/30 transition-all group">
        <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend !== undefined && (
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
            <p className="text-3xl font-black text-white mt-1">{value}</p>
            {subtitle && <p className="text-[9px] text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    </div>
);

const PlacementBar = ({ value, max, label }: { value: number; max: number; label: string }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black">
                <span className="text-white">{label}</span>
                <span className="text-primary">{value} placed ({pct}%)</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000 shadow-sm shadow-primary/30"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

const TPOAnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<PlacementStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterBatch, setFilterBatch] = useState<string>('ALL');
    const [filterBranch, setFilterBranch] = useState<string>('ALL');
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        try {
            setError(null);
            const data = await placementApi.getAnalyticsSummary();
            setStats(data);
        } catch (err: any) {
            console.error('Analytics fetch failed', err);
            setError('Failed to load analytics. Make sure placement drives exist.');
            setStats(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };

    // Derived filter data
    const batchOptions = useMemo(() => {
        if (!stats) return [];
        return ['ALL', ...Object.keys(stats.batch_stats).sort()];
    }, [stats]);

    const branchOptions = useMemo(() => {
        if (!stats) return [];
        return ['ALL', ...Object.keys(stats.branch_stats).sort()];
    }, [stats]);

    // Filtered branch stats
    const filteredBranchStats = useMemo(() => {
        if (!stats) return {};
        if (filterBranch === 'ALL') return stats.branch_stats;
        return { [filterBranch]: stats.branch_stats[filterBranch] };
    }, [stats, filterBranch]);

    // Filtered batch stats
    const filteredBatchStats = useMemo(() => {
        if (!stats) return {};
        if (filterBatch === 'ALL') return stats.batch_stats;
        return { [filterBatch]: stats.batch_stats[filterBatch] };
    }, [stats, filterBatch]);

    // Filtered drives
    const filteredDrives = useMemo(() => {
        if (!stats) return [];
        return stats.drives;
    }, [stats]);

    const handleExport = () => {
        if (!stats) return;
        const csv = [
            ['Company', 'Role', 'Status', 'Applied', 'Placed', 'Package', 'Deadline'].join(','),
            ...stats.drives.map(d => [
                `"${d.company_name}"`, `"${d.role}"`, d.status,
                d.applied_count, d.placed_count,
                `"${d.package_details || 'N/A'}"`,
                d.deadline || 'N/A'
            ].join(','))
        ].join('\n');

        // Branch stats
        const branchCsv = [
            '\n\nBranch Analytics',
            ['Branch', 'Placed', 'Total', 'Percentage'].join(','),
            ...Object.entries(stats.branch_stats).map(([branch, data]) =>
                [branch, data.placed, data.total, `${data.total > 0 ? Math.round(data.placed / data.total * 100) : 0}%`].join(',')
            )
        ].join('\n');

        // Batch stats
        const batchCsv = [
            '\n\nBatch Analytics',
            ['Batch', 'Placed', 'Total', 'Percentage'].join(','),
            ...Object.entries(stats.batch_stats).map(([batch, data]) =>
                [batch, data.placed, data.total, `${data.total > 0 ? Math.round(data.placed / data.total * 100) : 0}%`].join(',')
            )
        ].join('\n');

        const fullCsv = `AUIP Placement Analytics Report\nGenerated: ${new Date().toLocaleString()}\n\nSummary\nTotal Students,${stats.total_students}\nPlaced Students,${stats.placed_students}\nPlacement %,${stats.placement_percentage}%\nAvg Package,${stats.avg_package}\nTotal Drives,${stats.total_drives}\nActive Drives,${stats.active_drives}\nCompanies,${stats.companies_visited}\n\nDrive-wise Report\n${csv}${branchCsv}${batchCsv}`;

        const blob = new Blob([fullCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AUIP_Placement_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Full analytics report exported');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <BarChart3 className="w-16 h-16 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Loading Real-Time Analytics...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                            TPO <span className="text-primary not-italic">Analytics</span>
                        </h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">
                            Live Placement Intelligence — Real-Time Data Only
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filters */}
                    <select
                        value={filterBranch}
                        onChange={e => setFilterBranch(e.target.value)}
                        className="glass px-3 py-2 rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest text-white bg-transparent focus:outline-none focus:border-primary/50"
                    >
                        {branchOptions.map(b => (
                            <option key={b} value={b} className="bg-[#0a0a0a]">{b === 'ALL' ? 'All Branches' : b}</option>
                        ))}
                    </select>
                    <select
                        value={filterBatch}
                        onChange={e => setFilterBatch(e.target.value)}
                        className="glass px-3 py-2 rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest text-white bg-transparent focus:outline-none focus:border-primary/50"
                    >
                        {batchOptions.map(b => (
                            <option key={b} value={b} className="bg-[#0a0a0a]">{b === 'ALL' ? 'All Batches' : `Batch ${b}`}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="glass px-4 py-2.5 rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={!stats}
                        className="glass px-5 py-2.5 rounded-xl border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 text-primary" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="glass p-6 rounded-[2rem] border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-400">{error}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Create some placement drives first, then analytics will populate automatically.</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <StatCard
                        label="Total Students"
                        value={stats.total_students.toLocaleString()}
                        icon={Users}
                        color="text-blue-400"
                        bg="bg-blue-400/10"
                        subtitle="From academic registry"
                    />
                    <StatCard
                        label="Placed Students"
                        value={stats.placed_students}
                        icon={Award}
                        color="text-green-400"
                        bg="bg-green-400/10"
                        subtitle="Applications with PLACED status"
                    />
                    <StatCard
                        label="Placement %"
                        value={`${stats.placement_percentage}%`}
                        icon={Target}
                        color="text-primary"
                        bg="bg-primary/10"
                        subtitle="Placed / Total students"
                    />
                    <StatCard
                        label="Avg. Package"
                        value={stats.avg_package}
                        icon={DollarSign}
                        color="text-amber-400"
                        bg="bg-amber-400/10"
                        subtitle="Across all drives"
                    />
                    <StatCard
                        label="Total Drives"
                        value={stats.total_drives}
                        icon={Briefcase}
                        color="text-purple-400"
                        bg="bg-purple-400/10"
                    />
                    <StatCard
                        label="Active Drives"
                        value={stats.active_drives}
                        icon={Activity}
                        color="text-cyan-400"
                        bg="bg-cyan-400/10"
                    />
                    <StatCard
                        label="Companies"
                        value={stats.companies_visited}
                        icon={Building2}
                        color="text-indigo-400"
                        bg="bg-indigo-400/10"
                        subtitle="Unique company names"
                    />
                    <StatCard
                        label="Total Applications"
                        value={stats.drives.reduce((acc, d) => acc + d.applied_count, 0)}
                        icon={UserCheck}
                        color="text-rose-400"
                        bg="bg-rose-400/10"
                        subtitle="Across all drives"
                    />
                </div>
            )}

            {/* No drives empty state */}
            {stats && stats.total_drives === 0 && (
                <div className="glass p-16 rounded-[2.5rem] border-white/5 text-center space-y-4">
                    <Briefcase className="w-16 h-16 text-primary/20 mx-auto" />
                    <h3 className="text-xl font-black text-white">No Placement Drives Yet</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Create placement drives in the <b>Placements & JD AI</b> section. Once drives exist with applications, real analytics will appear here automatically.
                    </p>
                </div>
            )}

            {/* Branch + Batch Analytics */}
            {stats && (Object.keys(filteredBranchStats).length > 0 || Object.keys(filteredBatchStats).length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Branch-wise */}
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
                        <div className="flex items-center gap-3">
                            <PieChart className="w-5 h-5 text-primary" />
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Department-wise Placement</h3>
                        </div>
                        {Object.keys(filteredBranchStats).length > 0 ? (
                            <div className="space-y-5">
                                {Object.entries(filteredBranchStats).map(([branch, data]) => (
                                    <PlacementBar
                                        key={branch}
                                        label={branch || 'Unknown'}
                                        value={data.placed}
                                        max={data.total}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No department data available yet</p>
                        )}
                    </div>

                    {/* Batch-wise */}
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-amber-400" />
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Batch-wise Placement</h3>
                        </div>
                        {Object.keys(filteredBatchStats).length > 0 ? (
                            <div className="space-y-5">
                                {Object.entries(filteredBatchStats).map(([batch, data]) => (
                                    <PlacementBar
                                        key={batch}
                                        label={`Batch ${batch}`}
                                        value={data.placed}
                                        max={data.total}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No batch data available yet</p>
                        )}
                    </div>
                </div>
            )}

            {/* Company-wise Drives Table */}
            {stats && filteredDrives.length > 0 && (
                <div className="glass rounded-[2rem] border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-primary" />
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Company-wise Drives</h3>
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{filteredDrives.length} Drives</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    {['Company', 'Role', 'Status', 'Applied', 'Placed', 'Package', 'Deadline'].map(h => (
                                        <th key={h} className="p-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-white/[0.01]">
                                {filteredDrives.map((d, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-all">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-black text-primary">
                                                    {d.company_name?.[0] || '?'}
                                                </div>
                                                <span className="font-bold text-white text-sm">{d.company_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm text-gray-300">{d.role}</td>
                                        <td className="p-5">
                                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${d.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : d.status === 'RESULTS' ? 'bg-blue-500/20 text-blue-400' : d.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-sm font-bold text-blue-400">{d.applied_count}</td>
                                        <td className="p-5 text-sm font-bold text-green-400">{d.placed_count}</td>
                                        <td className="p-5 text-sm font-bold text-amber-400">{d.package_details || '—'}</td>
                                        <td className="p-5 text-[10px] text-muted-foreground">
                                            {d.deadline ? new Date(d.deadline).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Data Source Footer */}
            {stats && (
                <div className="text-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                        ● Live data from AUIP Placement Engine — No estimates or mock data
                    </p>
                </div>
            )}
        </div>
    );
};

export default TPOAnalyticsDashboard;
