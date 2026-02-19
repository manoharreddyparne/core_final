import { useState, useEffect } from "react";
import { Users, UserPlus, Search, ShieldAlert, CheckCircle2, Clock, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { instApiClient } from "../../auth/api/base";
import { toast } from "react-hot-toast";

export const FacultyAdmin = () => {
    const [facultyData, setFacultyData] = useState<any>({ active: [], pending: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInviting, setIsInviting] = useState(false);

    const fetchFaculty = async () => {
        setLoading(true);
        try {
            const res = await instApiClient.get("faculty/");
            if (res.data.success) {
                setFacultyData(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch faculty", err);
            toast.error("Failed to load faculty registry.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaculty();
    }, []);

    const handleInvite = async () => {
        const email = prompt("Enter Educator Email:");
        const identifier = prompt("Enter Employee ID:");
        if (!email || !identifier) return;

        setIsInviting(true);
        try {
            const res = await instApiClient.post("faculty/invite/", { email, identifier });
            if (res.data.success) {
                toast.success("Invitation sent to educator!");
                fetchFaculty();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to invite educator.");
        } finally {
            setIsInviting(false);
        }
    };

    const filteredActive = facultyData.active.filter((f: any) =>
        f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white px-1 tracking-tight">Faculty <span className="text-secondary italic">Registry</span></h1>
                    <div className="flex items-center gap-2 px-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Academic Staff Provisioning & Governance Hub</span>
                    </div>
                </div>

                <button
                    onClick={handleInvite}
                    disabled={isInviting}
                    className="flex items-center gap-2 px-6 py-4 premium-gradient text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                >
                    {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    Invite Educator
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-8 rounded-[2.5rem] bg-white/[0.02]">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Faculty</p>
                    <p className="text-3xl font-black text-white">{facultyData.total}</p>
                </div>
                <div className="glass p-8 rounded-[2.5rem] bg-green-500/5 border-green-500/10">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Active Staff</p>
                    <p className="text-3xl font-black text-white">{facultyData.active.length}</p>
                </div>
                <div className="glass p-8 rounded-[2.5rem] bg-amber-500/5 border-amber-500/10">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Pending Sync</p>
                    <p className="text-3xl font-black text-white">{facultyData.pending.length}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="relative group max-w-md">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-secondary transition-all" />
                <input
                    type="text"
                    placeholder="Search by email or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white outline-none focus:ring-4 focus:ring-secondary/20 transition-all font-medium"
                />
            </div>

            {/* Registry List */}
            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto" />
                    <p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Syncing Registry...</p>
                </div>
            ) : facultyData.total === 0 ? (
                <div className="glass p-24 rounded-[3rem] text-center space-y-8 bg-white/[0.02] border-dashed border-2 border-white/10">
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-primary/20 blur-[50px] animate-pulse rounded-full" />
                        <div className="relative w-32 h-32 rounded-[2.5rem] bg-black/40 border border-white/10 flex items-center justify-center text-primary shadow-2xl">
                            <ShieldAlert className="w-12 h-12" />
                        </div>
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                        <h3 className="text-2xl font-black text-white">Registry Initialization in Progress</h3>
                        <p className="text-gray-500 font-medium">
                            No educators have been provisioned yet. Use the invitation system to seed your institutional staff.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Active Faculty */}
                    {filteredActive.map((f: any) => (
                        <div key={f.id} className="glass p-8 rounded-[2.5rem] space-y-6 hover:border-secondary/50 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <span className="bg-green-500/10 text-green-500 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/20 uppercase">Active</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-white truncate">{f.email}</h4>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{f.designation || 'Educator'}</p>
                            </div>
                            <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Department</p>
                                    <p className="text-sm font-bold text-gray-300">{f.department || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Since</p>
                                    <p className="text-sm font-bold text-gray-300">{f.joining_date || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pending Invitations */}
                    {facultyData.pending.map((f: any) => (
                        <div key={f.identifier} className="glass p-8 rounded-[2.5rem] space-y-6 border-white/5 opacity-70 hover:opacity-100 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 border border-white/10">
                                    <Mail className="w-7 h-7" />
                                </div>
                                <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/20 uppercase">Invited</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-white truncate">{f.email}</h4>
                                <p className="text-[10px] text-gray-500 font-bold italic tracking-wider mt-1">Ref ID: {f.identifier}</p>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>Sent {new Date(f.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FacultyAdmin;
