// ✅ src/features/dashboard/pages/CoreStudentAdmin.tsx

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getCoreStudents, inviteStudent, type CoreStudent } from "../../auth/api/institutionAdminApi";
import { Loader2, UserPlus, Search, Filter, GraduationCap, LayoutGrid, List as ListIcon, Mail, Edit3 } from "lucide-react";

export default function CoreStudentAdmin() {
    const [students, setStudents] = useState<CoreStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Management</h1>
                    <p className="text-slate-500 mt-1">Manage institutional student records and activation flow.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStudents}
                        className="p-2.5 text-slate-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all"
                    >
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                        <UserPlus className="w-4 h-4" />
                        <span>Seed Student</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={stats.total} icon={<GraduationCap className="text-blue-600" />} />
                <StatCard label="Active" value={stats.active} icon={<CheckCircle className="text-green-600" />} color="green" />
                <StatCard label="Invited" value={stats.invited} icon={<Mail className="text-amber-600" />} color="amber" />
                <StatCard label="Seeded" value={stats.seeded} icon={<Filter className="text-slate-600" />} color="slate" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, roll, or ref..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table/List */}
            {loading && students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Loading institutional data...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No students found</h3>
                    <p className="text-slate-500">Try adjusting your search criteria or check filters.</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Academic</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((s) => (
                                <tr key={s.stu_ref} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {s.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{s.full_name}</p>
                                                <p className="text-xs text-slate-400 font-mono">{s.roll_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s.stu_ref}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <p>{s.department}</p>
                                        <p className="text-xs text-slate-400">Sem {s.current_semester} • Batch {s.batch_year}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={s.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {s.status === 'SEEDED' && (
                                                <button
                                                    onClick={() => handleInvite(s.stu_ref)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Send Invitation"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all" title="Edit Metrics">
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
                        <div key={s.stu_ref} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            {/* status line */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${getStatusColor(s.status)}`} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center font-bold text-lg">
                                    {s.full_name.charAt(0)}
                                </div>
                                <StatusBadge status={s.status} />
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg">{s.full_name}</h3>
                            <p className="text-sm text-slate-500 font-mono mb-4">{s.roll_number}</p>

                            <div className="space-y-2 mb-6 text-sm text-slate-600">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Dept</span>
                                    <span className="font-medium">{s.department}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Ref</span>
                                    <span className="font-medium">{s.stu_ref}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-50">
                                {s.status === 'SEEDED' && (
                                    <button
                                        onClick={() => handleInvite(s.stu_ref)}
                                        className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Invite
                                    </button>
                                )}
                                <button className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color = "blue" }: any) {
    const colorClasses: any = {
        blue: "bg-blue-50 border-blue-100",
        green: "bg-green-50 border-green-100",
        amber: "bg-amber-50 border-amber-100",
        slate: "bg-slate-50 border-slate-100",
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
                <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
                <span className="text-slate-500 text-sm font-medium">{label}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
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

function CheckCircle(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
    );
}
