import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthProvider/AuthProvider";
import {
    BookOpen,
    Users,
    Calendar,
    LayoutDashboard,
    Zap,
    GraduationCap,
    Clock,
    CheckCircle2
} from "lucide-react";

export const FacultyDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const stats = [
        { label: "Active Courses", value: "4", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-400/10" },
        { label: "Total Students", value: "185", icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
        { label: "Pending Tasks", value: "12", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Faculty <span className="text-primary italic">Command</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, <span className="text-white font-bold">{user?.full_name || user?.first_name || user?.username || "Educator"}</span>.
                        System operational.
                    </p>
                </div>
                <div className="glass px-4 py-2 rounded-2xl border-white/5 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Faculty Protocol Active</span>
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
                    {[
                        { title: "Advanced Algorithms", time: "09:00 AM - 10:30 AM", room: "Cluster A", status: "Upcoming" },
                        { title: "System Architecture Workshop", time: "11:00 AM - 12:30 PM", room: "Lab 04", status: "Upcoming" },
                        { title: "Faculty Council Meeting", time: "02:30 PM - 04:00 PM", room: "Conf Room 2", status: "Upcoming" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer">
                            <div className="flex items-center gap-6">
                                <div className="text-center min-w-[100px]">
                                    <p className="text-xs font-black text-primary uppercase tracking-tighter">{item.time}</p>
                                </div>
                                <div className="h-8 w-[1px] bg-white/10" />
                                <div>
                                    <h4 className="text-white font-bold">{item.title}</h4>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <LayoutDashboard className="w-3 h-3" />
                                        {item.room}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{item.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
