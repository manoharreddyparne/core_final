import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import { instApiClient } from "../../auth/api/base";
import {
    BookOpen,
    Users,
    Calendar,
    LayoutDashboard,
    Zap,
    GraduationCap,
    Clock,
    CheckCircle2,
    ChevronRight
} from "lucide-react";

export const FacultyDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats
                const statsRes = await instApiClient.get("dashboard/stats/");
                if (statsRes.data.success) {
                    setStatsData(statsRes.data.data);
                }

                // Fetch real assignments
                const academicRes = await instApiClient.get("courses/teacher-assignments/");
                const assignments = academicRes.data.success ? academicRes.data.data : academicRes.data;
                setAssignedSubjects(Array.isArray(assignments) ? assignments : []);

            } catch (err) {
                console.error("Faculty dashboard sync failed", err);
            } finally {
                setStatsLoading(false);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const stats = [
        {
            label: "Courses Taught",
            value: statsData?.active_courses?.toLocaleString() || (statsLoading ? "..." : "0"),
            icon: BookOpen,
            color: "text-blue-400",
            bg: "bg-blue-400/10"
        },
        {
            label: "Student Base",
            value: statsData?.total_students?.toLocaleString() || (statsLoading ? "..." : "0"),
            icon: Users,
            color: "text-purple-400",
            bg: "bg-purple-400/10"
        },
        {
            label: "System Status",
            value: "LIVE",
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-400/10"
        },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-tight">
                        Faculty <span className="text-primary italic relative">
                            Command
                            <span className="absolute -bottom-2 left-0 w-full h-1 bg-primary/20 rounded-full blur-sm" />
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium tracking-wide">
                        Welcome back, <span className="text-white font-bold decoration-primary/30 underline decoration-2 underline-offset-4">{user?.full_name || user?.first_name || "Educator Unit"}</span>.
                        Operational status: <span className="text-green-500 font-black uppercase tracking-widest text-[10px]">Optimal</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="glass px-6 py-3 rounded-2xl border-white/5 flex items-center gap-4 shadow-2xl backdrop-blur-3xl group hover:border-primary/50 transition-all cursor-default">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping opacity-40" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Protocol: Faculty_Active</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Course Management */}
                <div className="glass p-10 rounded-[3rem] premium-gradient border-none relative overflow-hidden group min-h-[300px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-48 h-48 text-white" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Academic Governance</h2>
                        <p className="text-blue-100/70 text-sm font-medium max-w-sm leading-relaxed">
                            Manage course syllabi, student enrollments, and coordinate with the Governance Brain for automated placement logic.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button
                            onClick={() => navigate('/faculty/academic')}
                            className="px-8 py-3 bg-white text-blue-900 font-bold rounded-2xl shadow-xl hover:bg-white/90 transition-all flex items-center gap-2"
                        >
                            Academic Management
                        </button>
                    </div>
                </div>

                {/* My Students */}
                <div className="glass p-10 rounded-[3rem] bg-white/[0.03] border-white/5 relative overflow-hidden group min-h-[300px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-48 h-48 text-white" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">Student Mentorship</h2>
                        <p className="text-gray-500 text-sm font-medium max-w-sm leading-relaxed">
                            Monitor student performance, provide career guidance, and review placement eligibility audits.
                        </p>
                    </div>
                    <div className="relative z-10">
                        <button className="px-8 py-3 glass bg-white/5 border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2">
                            My Students
                        </button>
                    </div>
                </div>
            </div>

            {/* Upcoming Schedule */}
            <div className="glass p-8 rounded-[3rem] border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white px-2 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Today's Schedule
                    </h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline px-2">View Full Calendar</button>
                </div>
                <div className="space-y-4">
                    {assignedSubjects.length > 0 ? (
                        assignedSubjects.slice(0, 3).map((item, i) => (
                            <div
                                key={i}
                                onClick={() => navigate('/faculty/academic', { state: { subject_id: item.subject } })}
                                className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="text-center min-w-[80px]">
                                        <p className="text-xs font-black text-primary uppercase tracking-tighter">
                                            {item.subject_code}
                                        </p>
                                    </div>
                                    <div className="h-8 w-[1px] bg-white/10" />
                                    <div>
                                        <h4 className="text-white font-bold">{item.subject_name}</h4>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <LayoutDashboard className="w-3 h-3" />
                                            Section {item.section_label || 'A'} · {item.academic_year_label}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg group-hover:bg-primary transition-colors">
                                    <span className="text-[10px] font-black text-primary group-hover:text-white uppercase tracking-widest">Go to Desk</span>
                                    <ChevronRight className="w-3 h-3 text-primary group-hover:text-white" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl">
                            <BookOpen className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold text-sm">No course assignments found for your profile.</p>
                            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mt-2 px-4 shadow-sm border border-white/5 rounded-full inline-block py-1">Contact Institution Admin</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
