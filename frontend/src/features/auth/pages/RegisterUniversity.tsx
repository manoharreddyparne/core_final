import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Globe, Users, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { v2AuthApi } from "../api/v2AuthApi";

export const RegisterUniversity = () => {
    const navigate = useNavigate();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [siteKey, setSiteKey] = useState("");

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await v2AuthApi.getPublicConfig();
                setSiteKey(config.turnstile_site_key);
            } catch (err) {
                console.error("Failed to load Turnstile config", err);
            }
        };
        fetchConfig();
    }, []);

    const handleTurnstileSuccess = React.useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = React.useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const [formData, setFormData] = useState({
        name: "",
        domain: "",
        contact_email: "",
        contact_number: "",
        address: "",
        student_count_estimate: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!turnstileToken) {
            setError("Please complete human verification.");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            await v2AuthApi.registerInstitution({
                ...formData,
                turnstile_token: turnstileToken
            });
            setIsSubmitted(true);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.detail || "Failed to submit application. Please try again.";
            setError(msg);

            // 🔄 Critical: Reset Turnstile token on failure so user has to solve a new one
            // or we don't try to reuse a spent token.
            setTurnstileToken(null);
            if ((window as any).turnstile) {
                try {
                    (window as any).turnstile.reset();
                } catch (resetErr) {
                    console.warn("Turnstile reset failed", resetErr);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-black">
                <div className="glass p-12 rounded-[3.5rem] max-w-2xl w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-400 border border-green-500/30">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white">Application Received</h1>
                        <p className="text-muted-foreground text-lg">
                            Thank you for applying to join the AUIP Platform. Our team will review your details and get back to you at <span className="text-white font-bold">{formData.contact_email}</span> within 24-48 hours.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/")}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 py-20">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                        Institutional Onboarding
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tight">
                        Register Your <span className="text-primary italic">University</span>
                    </h1>
                    <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                        Join the elite network of intelligent universities. Secure your digital governance today.
                    </p>
                </div>

                <div className="glass p-8 md:p-12 rounded-[3.5rem] relative group border-white/5">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* University Name */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">University Name</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        required
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="e.g. Stanford University"
                                    />
                                </div>
                            </div>

                            {/* Institutional Domain */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Official Domain</label>
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        required
                                        name="domain"
                                        value={formData.domain}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="e.g. stanford.edu"
                                    />
                                </div>
                            </div>

                            {/* Contact Email */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Admin Contact Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        required
                                        type="email"
                                        name="contact_email"
                                        value={formData.contact_email}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="admin@university.edu"
                                    />
                                </div>
                            </div>

                            {/* Student Count */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Estimated Students</label>
                                <div className="relative group">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        required
                                        type="number"
                                        name="student_count_estimate"
                                        value={formData.student_count_estimate}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="e.g. 5000"
                                    />
                                </div>
                            </div>

                            {/* Contact Number */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Campus Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="City, State, Country"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-2xl">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center">
                            <TurnstileWidget
                                siteKey={siteKey}
                                onSuccess={handleTurnstileSuccess}
                                onExpire={handleTurnstileExpire}
                                theme="dark"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="w-full py-5 premium-gradient text-white font-black text-xl rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-6 h-6" />
                                    Submit Registration Application
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-500 text-sm font-medium">
                    Already registered? <button onClick={() => navigate("/login")} className="text-primary hover:underline font-bold">Sign in as Admin</button>
                </p>
            </div>
        </div>
    );
};
