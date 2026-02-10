// ✅ src/features/auth/pages/Activate.tsx

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { validateActivationToken, activateStudentAccount, type StudentActivationData } from "../api/activationApi";
import { toast } from "react-hot-toast";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export default function Activate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<StudentActivationData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing activation token.");
            setLoading(false);
            return;
        }

        const init = async () => {
            try {
                const res = await validateActivationToken(token);
                if (res.success && res.data) {
                    setStudent(res.data);
                    setUsername(res.data.roll_number); // Default username to roll number
                } else {
                    setError(res.message || "Failed to validate token.");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || "Token validation failed. It may be expired or already used.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [token]);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await activateStudentAccount({
                token: token!,
                password,
                username
            });
            if (res.success) {
                setSuccess(true);
                toast.success("Account activated! Redirecting to login...");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(res.message || "Activation failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Something went wrong during activation.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Validating your invitation...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-green-100">
                    <div className="flex justify-center mb-6">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Success!</h1>
                    <p className="text-gray-600 mb-8">
                        Your account for <span className="font-semibold">{student?.institution}</span> has been activated.
                        You can now log in using your official email and the password you just set.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-100 p-4 rounded-full">
                            <AlertCircle className="w-12 h-12 text-red-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Activation Link</h1>
                    <p className="text-gray-600 mb-8">{error}</p>
                    <div className="space-y-3">
                        <Link
                            to="/login"
                            className="inline-block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Back to Login
                        </Link>
                        <p className="text-sm text-gray-500">
                            If you think this is a mistake, please contact your University SPOC.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 font-inter">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-blue-600 p-8 text-white text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-90" />
                    <h1 className="text-2xl font-bold">Activate Your Account</h1>
                    <p className="text-blue-100 text-sm mt-1">{student?.institution}</p>
                </div>

                <div className="p-8">
                    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Name</span>
                            <span className="font-semibold text-slate-900">{student?.full_name}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Email</span>
                            <span className="font-semibold text-slate-900">{student?.email}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Department</span>
                            <span className="font-semibold text-slate-900">{student?.department}</span>
                        </div>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Choose a username"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Min 8 characters"
                                minLength={8}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Repeat password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Activating...
                                </>
                            ) : (
                                "Finish Activation"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-400 mt-6 mt-6 leading-relaxed">
                        By activating, you agree to the AUIP Platform Terms of Service and Academic Integrity Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
