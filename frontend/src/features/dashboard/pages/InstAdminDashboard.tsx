// ✅ src/features/dashboard/pages/InstAdminDashboard.tsx

import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import {
    Users,
    GraduationCap,
    ShieldCheck,
    Zap,
    CheckCircle2,
    BarChart3,
    Brain,
    ExternalLink,
    ArrowRight,
    BookOpen,
    MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { instApiClient } from "../../auth/api/base"; // Use institutional client

export const InstAdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Pointing to the new institutional stats endpoint
                const res = await instApiClient.get("dashboard/stats/");
                if (res.data.success) {
                    setStatsData(res.data.data);
                }
            } catch (err) {
                console.error("Dashboard stats sync failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const stats = [
        {
            label: "Total Students",
            value: statsData?.total_students?.toLocaleString() || (loading ? "..." : "0"),
            icon: GraduationCap,
            color: "text-primary",
            bg: "bg-primary/10"
        },
        {
            label: "Active Students",
            value: statsData?.active_students?.toLocaleString() || (loading ? "..." : "0"),
            icon: ShieldCheck,
            color: "text-green-400",
            bg: "bg-green-400/10"
        },
        {
            label: "Total Faculty",
            value: statsData?.total_faculty?.toLocaleString() || (loading ? "..." : "0"),
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-400/10"
        },
        {
            label: "Verified Faculty",
            value: statsData?.verified_faculty?.toLocaleString() || (loading ? "..." : "0"),
            icon: ShieldCheck,
            color: "text-cyan-400",
            bg: "bg-cyan-400/10"
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Institutional <span className="text-primary italic">Hub</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Managing <span className="text-white font-bold">{user?.username}'s</span> Academic Ecosystem.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="glass px-4 py-2 rounded-2xl border-white/5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Quantum Link: Secure</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass p-8 rounded-[2.5rem] border-white/5 space-y-4 hover:border-primary/50 transition-all group">
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                            <stat.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                            <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions & Feature Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Student Management Card */}
                <div className="glass p-10 rounded-[3rem] premium-gradient border-none relative overflow-hidden group flex flex-col justify-between h-[320px]">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-48 h-48 text-white" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Student Identity Management</h2>
                        <p className="text-blue-100/70 text-sm font-medium max-w-sm leading-relaxed">
                            Pre-seed student records, manage roll numbers, and audit institutional academic data in bulk.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/institution/students")}
                            className="px-8 py-3 bg-white text-blue-900 font-bold rounded-2xl shadow-xl hover:bg-white/90 transition-all flex items-center gap-2"
                        >
                            Open Registry <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Faculty Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-white/5 relative overflow-hidden group flex flex-col justify-between h-[320px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <Users className="w-48 h-48 text-white" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Faculty & Staff Hub</h2>
                        <p className="text-gray-500 text-sm font-medium max-w-sm leading-relaxed">
                            Provision educator accounts, assign institutional roles, and monitor academic governance activity.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/institution/faculty")}
                            className="px-8 py-3 glass bg-white/5 border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            Manage Faculty <ExternalLink className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                </div>

                {/* Academic Hub Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-cyan-500/10 relative overflow-hidden group flex flex-col justify-between h-[320px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-48 h-48 text-cyan-400" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Academic Ecosystem</h2>
                        <p className="text-gray-500 text-sm font-medium max-w-sm leading-relaxed">
                            Manage departments, programs, subject allocations, and track academic health seamlessly.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/institution/academic")}
                            className="px-8 py-3 glass bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-bold rounded-2xl hover:bg-cyan-500/20 transition-all flex items-center gap-2"
                        >
                            Open Academics <ArrowRight className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                </div>

                {/* Governance Brain Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-purple-500/10 relative overflow-hidden group flex flex-col justify-between h-[260px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <Brain className="w-48 h-48 text-purple-400" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <Brain className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight">Governance Brain</h2>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">
                            AI-powered student readiness scoring, at-risk detection, and intervention management.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/institution/brain")}
                            className="px-6 py-2.5 glass bg-purple-500/10 border-purple-500/20 text-purple-300 font-bold rounded-2xl hover:bg-purple-500/20 transition-all flex items-center gap-2 text-sm"
                        >
                            Open Brain <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* TPO Analytics Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-primary/10 relative overflow-hidden group flex flex-col justify-between h-[260px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-48 h-48 text-primary" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight">TPO Analytics</h2>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed">
                            Placement reports, company-wise analytics, branch breakdowns, and exportable insights.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/institution/analytics")}
                            className="px-6 py-2.5 glass bg-primary/10 border-primary/20 text-primary font-bold rounded-2xl hover:bg-primary/20 transition-all flex items-center gap-2 text-sm"
                        >
                            View Analytics <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Exams & Mock Tests Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-amber-500/10 relative overflow-hidden group flex flex-col justify-between h-[320px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-48 h-48 text-amber-400" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Exams & Mock Tests</h2>
                        <p className="text-gray-500 text-sm font-medium max-w-sm leading-relaxed">
                            Oversee institutional assessments, manage question banks, and audit real-time proctoring violations.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/mock-tests")}
                            className="px-8 py-3 glass bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold rounded-2xl hover:bg-amber-500/20 transition-all flex items-center gap-2"
                        >
                            Manage Exams <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Research Repository Card */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-indigo-500/10 relative overflow-hidden group flex flex-col justify-between h-[320px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-48 h-48 text-indigo-400" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Research Repository</h2>
                        <p className="text-gray-500 text-sm font-medium max-w-sm leading-relaxed">
                            Global hub for institutional peer-reviewed papers. Certify student manuscripts and publish academic work.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate("/research")}
                            className="px-8 py-3 glass bg-indigo-500/10 border-indigo-500/20 text-indigo-300 font-bold rounded-2xl hover:bg-indigo-500/20 transition-all flex items-center gap-2"
                        >
                            Open Repository <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* HQ Support Card - DIRECT CONNECT TO SUPER ADMIN */}
                <div className="glass p-10 rounded-[3rem] bg-primary/5 border-primary/20 relative overflow-hidden group flex flex-col justify-between h-[320px] lg:col-span-2">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-64 h-64 text-primary" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-2xl">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white leading-tight tracking-tighter italic">CONNECT WITH <span className="text-primary not-italic">Nexora HQ</span></h2>
                            <p className="text-gray-400 text-base font-medium max-w-2xl leading-relaxed mt-2">
                                Direct encrypted line to the Platform Governors. Use this to report infrastructure anomalies,
                                requested scale increments, or tenant-level governance assistance.
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-4">
                        <button
                            onClick={() => navigate("/chat-hub")}
                            className="px-10 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-[2rem] shadow-[0_0_30px_rgba(235,108,34,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Open Secure Channel
                        </button>
                        <div className="hidden sm:flex items-center gap-2 px-6 py-4 glass bg-white/5 rounded-[2rem] border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">HQ Availability: Online</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Recent Activity Mini-Feed */}
            <div className="glass p-8 rounded-[3rem] border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white px-2">Governance Activity</h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline px-2">Audit Full Logs</button>
                </div>
                <div className="space-y-4">
                    {[
                        { msg: "Student registry sync completed", time: "2m ago", icon: CheckCircle2, color: "text-green-400" },
                        { msg: "Bulk invitation sent to 120 students", time: "1h ago", icon: Zap, color: "text-amber-400" },
                        { msg: "New security policy enforced on domain", time: "3h ago", icon: ShieldCheck, color: "text-blue-400" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                <span className="text-sm font-medium text-gray-300">{item.msg}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InstAdminDashboard;

