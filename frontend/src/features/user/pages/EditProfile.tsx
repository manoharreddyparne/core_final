// ✅ Edit Profile Form
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "../hooks/userProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileForm = {
    first_name: string;
    last_name: string;
    email: string;
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
        email: "",
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
            email: profile.user.email ?? "",
            roll_number: profile.role_info?.roll_number ?? "",
            admission_year: profile.role_info?.admission_year ?? "",
            batch: profile.role_info?.batch ?? "",
            department: profile.role_info?.department ?? "",
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
            toast.error(err?.message ?? "Failed to update profile");
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

            <form onSubmit={handleSubmit} className="space-y-6">
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
                                Email
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => updateField("email", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
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

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/profile")}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving…" : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
