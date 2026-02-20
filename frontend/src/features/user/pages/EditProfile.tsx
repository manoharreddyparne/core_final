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
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
                    <p className="text-gray-500 mt-1">Update your account information</p>
                </div>
            </div>

            {profile?.role_info?.read_only && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ShieldCheck className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700 font-bold uppercase tracking-wider">
                                Institutional Data Lock Active
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                                Your profile is synchronized with the University registry. Self-service updates are disabled to maintain record integrity.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={profile?.role_info?.read_only} className="space-y-6 contents">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={form.first_name}
                                    onChange={(e) => updateField("first_name", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={form.last_name}
                                    onChange={(e) => updateField("last_name", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-xs text-gray-400 ml-1">(locked)</span>
                                </label>
                                <input
                                    type="email"
                                    value={profile?.user?.email ?? ""}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400 mt-1">Email is your identity anchor and cannot be changed.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Student-Specific Fields */}
                    {role === "student" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Student Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Roll Number
                                    </label>
                                    <input
                                        type="text"
                                        value={form.roll_number}
                                        onChange={(e) => updateField("roll_number", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Admission Year
                                    </label>
                                    <input
                                        type="text"
                                        value={form.admission_year}
                                        onChange={(e) => updateField("admission_year", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Batch
                                    </label>
                                    <input
                                        type="text"
                                        value={form.batch}
                                        onChange={(e) => updateField("batch", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Teacher-Specific Fields */}
                    {role === "teacher" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Faculty Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={form.department}
                                        onChange={(e) => updateField("department", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </fieldset>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/profile")}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    {!profile?.role_info?.read_only && (
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving…" : "Save Changes"}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
