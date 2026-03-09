// ✅ src/features/dashboard/pages/StudentDashboard.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import { useProfile } from "../../user/hooks/userProfile";
import {
    GraduationCap,
    Brain,
    FileText,
    Briefcase,
    Zap,
    ArrowRight,
    Sparkles,
    Target,
    Activity,
    ShieldCheck,
    Cpu,
    BookOpen
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { intelligenceApi } from "../../intelligence/api";
import { notificationApi } from "../../notifications/api";
import toast from "react-hot-toast";

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const { profile, load, loading: profileLoading } = useProfile();
    const [stats, setStats] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, notificationsRes] = await Promise.all([
                    intelligenceApi.getDashboard(),
                    notificationApi.getNotifications()
                ]);
                setStats(statsRes);
                // Notifications might be in .results if paginated, or direct array
                const items = Array.isArray(notificationsRes) ? notificationsRes : (notificationsRes?.results || []);
                setNotifications(items.slice(0, 5)); 
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        load();
        fetchStats();
    }, [load]);

    if (profileLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-t-4 border-b-4 border-primary/20 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-t-4 border-primary rounded-full animate-spin" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Initializing Neural Link...</p>
                    <p className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest">Securing Student Identity Workspace</p>
                </div>
            </div>
        );
    }

    const studentName = profile?.role_info?.full_name?.value || user?.username || "Student";
    const cgpa = profile?.role_info?.cgpa?.value || "N/A";

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Hero Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Active Academic Session</span>
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                        Welcome, <span className="text-primary not-italic">{studentName.split(' ')[0]}</span>
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg">
                        Your personalized <span className="text-white font-bold">Intelligence Command</span> is live.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="glass px-6 py-3 rounded-2xl border-white/5 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
                        <div className="text-left">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Quantum State</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Secure & Synchronized</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/profile')}
                        className="w-14 h-14 glass rounded-2xl border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all hover:scale-105"
                        title="View Identification"
                    >
                        <GraduationCap className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Core Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBox
                    label="Current Merit"
                    value={cgpa}
                    sub="Cumulative GPA"
                    icon={<Target className="text-primary" />}
                    trend="Updated"
                />
                <StatBox
                    label="Readiness Index"
                    value={`${stats?.governance?.readiness || 0}%`}
                    sub="Placement Probability"
                    icon={<Activity className="text-amber-400" />}
                    trend="+2% this month"
                />
                <StatBox
                    label="Active Applications"
                    value={stats?.placement_summary?.total || 0}
                    sub="Current Placements"
                    icon={<Briefcase className="text-green-400" />}
                />
                <StatBox
                    label="System Auth"
                    value="Verified"
                    sub="Institutional ID"
                    icon={<ShieldCheck className="text-blue-400" />}
                />
            </div>

            {/* Navigation Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Intelligence Hub Card */}
                <div
                    onClick={() => navigate('/student-intelligence')}
                    className="lg:col-span-2 glass p-10 rounded-[3rem] premium-gradient border-none relative overflow-hidden group cursor-pointer h-[340px] flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Brain className="w-64 h-64 text-white" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xl">
                            <Zap className="w-7 h-7" />
                        </div>
                        <h2 className="text-4xl font-black text-white leading-tight tracking-tighter italic uppercase">Intelligence <br /> Hub</h2>
                        <p className="text-blue-100/70 text-sm font-medium max-w-sm leading-relaxed">
                            Access your Governance Brain, track readiness scores, and optimize your academic trajectory with AI insights.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Launch Command Hub</span>
                        <div className="flex-1 h-px bg-white/20" />
                        <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Vertical Quick Access */}
                <div className="space-y-4 flex flex-col">

                    <QuickLinkCard
                        title="Resume Studio"
                        sub="Surgical CV Engineering"
                        icon={<FileText />}
                        to="/resume-studio"
                        color="text-blue-400"
                        bg="bg-blue-400/5"
                    />
                    <QuickLinkCard
                        title="Career Tracks"
                        sub="Placement Opportunity Matrix"
                        icon={<Target />}
                        to="/placement-hub"
                        color="text-purple-400"
                        bg="bg-purple-400/5"
                    />
                    <QuickLinkCard
                        title="Mock Tests"
                        sub="Aptitude & Skill Validation"
                        icon={<Cpu />}
                        to="/mock-tests"
                        color="text-amber-400"
                        bg="bg-amber-400/5"
                    />
                    <QuickLinkCard
                        title="Research Hub"
                        sub="Academic Repository & Papers"
                        icon={<BookOpen />}
                        to="/research"
                        color="text-indigo-400"
                        bg="bg-indigo-400/5"
                    />

                </div>
            </div>

            {/* Bottom Section: Recent Updates */}
            <div className="glass p-10 rounded-[3rem] border-white/5 space-y-8 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">System Notifications</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Real-time Institutional Pulse</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {notifications.length > 0 ? (
                        notifications.map((n, i) => (
                            <ActivityItem
                                key={n.id || i}
                                msg={n.title + ": " + n.message}
                                time={new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                status={n.notification_type || "ALERT"}
                                color={n.is_read ? "text-gray-500" : "text-primary"}
                                onClick={async () => {
                                    if (!n.is_read) {
                                        await notificationApi.markAsRead(n.id);
                                        // Update local state
                                        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
                                    }
                                    if (n.link_url) navigate(n.link_url);
                                }}
                            />
                        ))
                    ) : (
                        <ActivityItem
                            msg="Account successfully activated & verified"
                            time="Just now"
                            status="SECURE"
                            color="text-green-400"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, sub, icon, trend }: any) => (
    <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-4 hover:border-primary/30 transition-all group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
            {icon}
        </div>
        <div className="relative z-10">
            <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
                {trend && <span className="text-[8px] font-black text-primary uppercase tracking-widest">{trend}</span>}
            </div>
            <p className="text-3xl font-black text-white mt-1 tracking-tighter">{value}</p>
            <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">{sub}</p>
        </div>
    </div>
);

const QuickLinkCard = ({ title, sub, icon, to, color, bg }: any) => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate(to)}
            className={`flex-1 glass p-6 rounded-[2rem] border-white/5 flex items-center gap-5 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-all group`}
        >
            <div className={`w-14 h-14 rounded-2xl ${bg} ${color} border border-white/5 flex items-center justify-center transition-all group-hover:scale-110 shadow-xl`}>
                {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-lg font-black text-white leading-none uppercase italic tracking-tight">{title}</h4>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1 truncate">{sub}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
        </div>
    );
};

const ActivityItem = ({ msg, time, status, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5 hover:bg-white/[0.04] transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex items-center gap-5">
            <div className={`px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest ${color} border border-white/5`}>
                {status}
            </div>
            <span className="text-xs font-bold text-gray-300 line-clamp-1">{msg}</span>
        </div>
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-50 shrink-0">{time}</span>
    </div>
);

export default StudentDashboard;
