// ✅ src/features/dashboard/pages/CoreStudentAdmin.tsx

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getCoreStudents, inviteStudent, type CoreStudent } from "../../auth/api/institutionAdminApi";
import { Loader2, UserPlus, Search, Filter, GraduationCap, LayoutGrid, List as ListIcon, Mail, Edit3, Plus, CheckCircle } from "lucide-react";
import { BulkSeedModal } from "../components/BulkSeedModal";

export default function CoreStudentAdmin() {
    const [students, setStudents] = useState<CoreStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Stats
    const [stats, setStats] = useState({ total: 0, active: 0, invited: 0, seeded: 0 });

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await getCoreStudents();
            if (res.success && res.data) {
                setStudents(res.data);
                const data = res.data;
                setStats({
                    total: data.length,
                    active: data.filter(s => s.status === 'ACTIVE').length,
                    invited: data.filter(s => s.status === 'INVITED').length,
                    seeded: data.filter(s => s.status === 'SEEDED').length,
                });
            }
        } catch (err: any) {
            toast.error("Failed to load student data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleInvite = async (stu_ref: string) => {
        try {
            const res = await inviteStudent(stu_ref);
            if (res.success) {
                toast.success("Invitation sent successfully!");
                fetchStudents(); // Refresh to update status
            }
        } catch (err: any) {
            toast.error("Failed to send invitation.");
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.stu_ref.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white px-1">Student <span className="text-primary">Management</span></h1>
                    <p className="text-muted-foreground mt-1 px-1">Institutional record tracking & activation command center.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStudents}
                        className="p-3 bg-white/5 border border-white/10 text-primary rounded-2xl hover:bg-white/10 transition-all"
                    >
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                        <Plus className="w-5 h-5" />
                        <span>Seed Batch</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={stats.total} icon={<GraduationCap className="text-white" />} />
                <StatCard label="Active Users" value={stats.active} icon={<CheckCircle className="text-green-400" />} color="green" />
                <StatCard label="Invited" value={stats.invited} icon={<Mail className="text-amber-400" />} color="amber" />
                <StatCard label="Pending" value={stats.seeded} icon={<Filter className="text-white" />} color="slate" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-5 rounded-3xl">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name, roll or ref..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading && students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 glass rounded-[3rem]">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase">Initializing Hub...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-24 glass rounded-[3rem]">
                    <div className="bg-white/5 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/10">
                        <Search className="w-10 h-10 text-gray-700" />
                    </div>
                    <h3 className="text-2xl font-black text-white">No matches found</h3>
                    <p className="text-muted-foreground mt-2">Try adjusting your search filters.</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="glass rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Reference</th>
                                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Academic</th>
                                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStudents.map((s) => (
                                <tr key={s.stu_ref} className="hover:bg-white/5 transition-colors group border-white/5">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 text-primary flex items-center justify-center font-black text-sm border border-white/10 group-hover:bg-primary group-hover:text-white transition-all">
                                                {s.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-primary transition-colors">{s.full_name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{s.roll_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 uppercase">{s.stu_ref}</span>
                                    </td>
                                    <td className="px-8 py-5 text-sm">
                                        <p className="font-bold text-gray-300">{s.department}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Sem {s.current_semester} • Batch {s.batch_year}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <StatusBadge status={s.status} />
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                            {s.status === 'SEEDED' && (
                                                <button
                                                    onClick={() => handleInvite(s.stu_ref)}
                                                    className="p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl border border-primary/20 transition-all"
                                                    title="Send Invitation"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button className="p-2.5 bg-white/5 text-gray-500 hover:text-white rounded-xl border border-white/10 transition-all">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map(s => (
                        <div key={s.stu_ref} className="glass p-8 rounded-[3rem] space-y-6 hover:border-primary/50 transition-all group relative overflow-hidden">
                            {/* status line */}
                            <div className={`absolute top-0 left-0 w-full h-1.5 opacity-40 ${getStatusColor(s.status)}`} />

                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 text-primary flex items-center justify-center font-black text-xl border border-white/10 group-hover:premium-gradient group-hover:text-white transition-all">
                                    {s.full_name.charAt(0)}
                                </div>
                                <StatusBadge status={s.status} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{s.full_name}</h3>
                                <p className="text-xs text-gray-500 font-mono font-bold tracking-widest">{s.roll_number}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Department</p>
                                    <p className="text-sm font-bold text-gray-300">{s.department}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Reference</p>
                                    <p className="text-sm font-mono font-bold text-gray-300">{s.stu_ref}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                {s.status === 'SEEDED' && (
                                    <button
                                        onClick={() => handleInvite(s.stu_ref)}
                                        className="flex-1 py-3 px-4 premium-gradient text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Send Invite
                                    </button>
                                )}
                                <button className="p-3 bg-white/5 text-gray-500 rounded-2xl border border-white/10 hover:text-white transition-all">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <BulkSeedModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={fetchStudents}
            />
        </div>
    );
}

function StatCard({ label, value, icon, color = "blue" }: any) {
    const colorClasses: any = {
        blue: "bg-primary/20 text-primary border-primary/30",
        green: "bg-green-400/20 text-green-400 border-green-400/30",
        amber: "bg-amber-400/20 text-amber-400 border-amber-400/30",
        slate: "bg-white/5 text-gray-400 border-white/10",
    };

    return (
        <div className="glass p-6 rounded-[2.5rem] space-y-4 flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
                <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'ACTIVE': { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
        'INVITED': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Invited' },
        'SEEDED': { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Seeded' },
        'SUSPENDED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    };
    const c = config[status] || config['SEEDED'];
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case 'ACTIVE': return 'bg-green-500';
        case 'INVITED': return 'bg-amber-500';
        case 'SEEDED': return 'bg-slate-300';
        case 'SUSPENDED': return 'bg-red-500';
        default: return 'bg-slate-200';
    }
}
