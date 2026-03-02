// ✅ Edit Profile Form
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useProfile } from "../hooks/userProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileForm = {
    first_name: string;
    last_name: string;
    roll_number?: string;
    admission_year?: string;
    batch?: string;
    department?: string;
};

export default function EditProfile() {
    const { profile, load, save, loading } = useProfile();
    const navigate = useNavigate();
    const [form, setForm] = useState<ProfileForm>({
        first_name: "",
        last_name: "",
        roll_number: "",
        admission_year: "",
        batch: "",
        department: "",
    });

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!profile?.user) return;

        setForm({
            first_name: profile.user.first_name ?? "",
            last_name: profile.user.last_name ?? "",
            roll_number: profile.role_info?.roll_number?.value ?? profile.role_info?.roll_number ?? "",
            admission_year: profile.role_info?.admission_year?.value ?? profile.role_info?.admission_year ?? "",
            batch: profile.role_info?.batch?.value ?? profile.role_info?.batch ?? "",
            department: profile.role_info?.department?.value ?? profile.role_info?.department ?? "",
        });
    }, [profile]);

    const updateField = (key: keyof ProfileForm, value: any) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await save(form);
            toast.success("Profile updated successfully!");
            navigate("/profile");
        } catch (err: any) {
            const data = err?.response?.data;
            let msg = data?.message || "Failed to update profile";
            if (data?.errors) {
                const details = Object.values(data.errors).flat().join(". ");
                if (details) msg = `${msg}: ${details}`;
            }
            toast.error(msg);
        }
    };

    if (!profile)
        return (
            <div className="py-10 text-center text-gray-500">
                Loading profile…
            </div>
        );

    const role = profile?.user?.role?.toLowerCase();

    return (
        <div className="space-y-6 md:space-y-10 p-2 md:p-6 min-h-screen bg-[#050505] text-white selection:bg-primary/30 w-full overflow-x-hidden animate-in fade-in duration-700">
            {/* 🚀 Premium Fluid Header */}
            <div className="glass p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-visible flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6 min-w-0">
                    <button
                        onClick={() => navigate("/profile")}
                        className="w-12 h-12 glass bg-white/5 border-white/10 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all hover:scale-110"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white italic tracking-tighter uppercase leading-none truncate">Edit <span className="text-primary not-italic">Profile</span></h1>
                        <p className="text-muted-foreground text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] mt-2 opacity-50">Update academic identity & preferences</p>
                    </div>
                </div>
            </div>

            {profile?.role_info?.read_only && (
                <div className="glass p-8 rounded-[2.5rem] border-amber-500/20 bg-amber-500/[0.02] flex items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 animate-pulse">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Institutional Data Lock Active</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                            Your profile is synchronized with the University registry. Self-service updates are disabled to maintain record integrity.
                            Contact the <span className="text-white font-bold">University Registrar</span> for modifications.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <fieldset disabled={profile?.role_info?.read_only} className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 disabled:opacity-80">
                    {/* Basic Information */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="glass p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-white/5 bg-white/[0.01] space-y-8">
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                Basic Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">First Name</label>
                                    <input
                                        type="text"
                                        value={form.first_name}
                                        onChange={(e) => updateField("first_name", e.target.value)}
                                        className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={form.last_name}
                                        onChange={(e) => updateField("last_name", e.target.value)}
                                        className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Official Email Address (Locked)</label>
                                <div className="w-full glass bg-white/[0.02] border-white/5 rounded-2xl p-4 text-white/40 font-bold text-sm flex items-center justify-between group">
                                    <span>{profile?.user?.email ?? ""}</span>
                                    <ShieldCheck className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
                                </div>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-2 px-1 opacity-50 italic">Primary authentication identifier</p>
                            </div>
                        </div>
                    </div>

                    {/* Role-Specific Information */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="glass p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border-white/5 bg-white/[0.01] space-y-8 h-full">
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                {role === "student" ? "Academic Meta" : "Institutional Meta"}
                            </h3>

                            <div className="space-y-6">
                                {role === "student" ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">University Roll Number</label>
                                            <input
                                                type="text"
                                                value={form.roll_number}
                                                onChange={(e) => updateField("roll_number", e.target.value)}
                                                className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Admission Year</label>
                                                <input
                                                    type="text"
                                                    value={form.admission_year}
                                                    onChange={(e) => updateField("admission_year", e.target.value)}
                                                    className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Batch</label>
                                                <input
                                                    type="text"
                                                    value={form.batch}
                                                    onChange={(e) => updateField("batch", e.target.value)}
                                                    className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Allocated Department</label>
                                        <input
                                            type="text"
                                            value={form.department}
                                            onChange={(e) => updateField("department", e.target.value)}
                                            className="w-full glass bg-white/5 border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Final Footer Actions */}
                <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-6 p-8 glass rounded-[2.5rem] border-primary/20 bg-primary/[0.03] shadow-lg">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-xl">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white italic tracking-tighter uppercase leading-none">Transmission Security</p>
                            <p className="text-[9px] uppercase font-bold tracking-widest mt-1.5 opacity-60">Changes require institutional synchronization</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            className="px-8 py-3.5 glass border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all rounded-xl"
                        >
                            Back
                        </button>
                        {!profile?.role_info?.read_only && (
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-12 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-blue-500 hover:scale-105 transition-all disabled:opacity-20 disabled:scale-100"
                            >
                                {loading ? "Transmitting..." : "Apply Changes"}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
