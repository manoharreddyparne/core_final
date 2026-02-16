import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v2AuthApi, Institution } from "../api/v2AuthApi";
import { useAuth } from "../context/AuthProvider/AuthProvider";
import { setAccessToken } from "../utils/tokenStorage";
import { hydratePassport } from "../api/passportApi";
import { toast } from "react-hot-toast";

export type AuthRole = "student" | "faculty";

export const useLoginV2VM = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const [role, setRole] = useState<AuthRole>("student");
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(() => {
        const saved = localStorage.getItem('selected_institution');
        return saved ? JSON.parse(saved) : null;
    });

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [rememberDevice, setRememberDevice] = useState(false);

    const [otpRequired, setOtpRequired] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailHint, setEmailHint] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const [tempUserId, setTempUserId] = useState<number | null>(null);
    const [lockoutTimer, setLockoutTimer] = useState<number>(0);
    const [resendCooldown, setResendCooldown] = useState<number>(0);

    useEffect(() => {
        if (lockoutTimer <= 0) return;
        const timer = setInterval(() => {
            setLockoutTimer((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [lockoutTimer]);

    // Resend Cooldown Hook
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleInstitutionSelect = (inst: Institution | null) => {
        setSelectedInstitution(inst);
        if (inst) {
            localStorage.setItem('selected_institution', JSON.stringify(inst));
        } else {
            localStorage.removeItem('selected_institution');
        }
    };

    const handleCheckIdentity = useCallback(async () => {
        if (!selectedInstitution) {
            toast.error("Please select an institution first.");
            return;
        }
        if (!identifier || !email) {
            toast.error("Please fill in both Roll Number and Email.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.checkIdentity({
                institution_id: selectedInstitution.id,
                identifier,
                email
            });

            if (res.success) {
                toast.success("Identity verified! Activation link sent to your email.");
            } else {
                toast.error(res.detail || "Identity verification failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedInstitution, identifier, email]);

    const handleStudentLogin = useCallback(async () => {
        if (!selectedInstitution) {
            toast.error("Please select an institution first.");
            return;
        }
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (!turnstileToken) {
            toast.error("Please complete the human verification.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.studentLogin({
                institution_id: selectedInstitution.id,
                identifier,
                password,
                turnstile_token: turnstileToken
            });

            if (res.success && res.data) {
                toast.success("Login successful!");
                navigate("/student-dashboard");
            } else {
                toast.error(res.message || "Invalid credentials.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedInstitution, identifier, password, turnstileToken, navigate]);

    const handleFacultyLogin = useCallback(async () => {
        if (!selectedInstitution) {
            toast.error("Please select an institution first.");
            return;
        }
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (!turnstileToken) {
            toast.error("Please complete the human verification.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.facultyLogin({
                institution_id: selectedInstitution.id,
                email: identifier,
                password,
                turnstile_token: turnstileToken
            });

            if (res.data?.requires_otp) {
                setOtpRequired(true);
                setEmailHint(res.data.email_hint);
                toast.success("Password verified. OTP sent.");
            } else {
                toast.error(res.message || "Login failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Invalid credentials.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedInstitution, identifier, password, turnstileToken]);

    const handleAdminLogin = useCallback(async (jitTicket?: string | null) => {
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (!turnstileToken) {
            toast.error("Please complete the human verification.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.adminLogin({
                username: identifier,
                password,
                turnstile_token: turnstileToken,
                jit_ticket: jitTicket
            });

            // ✅ Check for OTP requirement (Step 1 success)
            if (res.data?.require_otp) {
                setOtpRequired(true);
                setTempUserId(res.data.user_id ?? null);
                // Start resend cooldown immediately upon initial delivery
                setResendCooldown(300);
                toast.success("Credentials valid. 2FA Required.");
                return;
            }

            // ✅ Direct success (Trusted device)
            if (res.success) {
                if (res.data?.access) {
                    setAccessToken(res.data.access);
                    if (res.data?.user) {
                        setUser(res.data.user);
                    } else {
                        const boot = await hydratePassport();
                        setUser(boot?.user ?? null);
                    }
                }
                toast.success("Super Admin authenticated.");
                navigate("/superadmin/institutions");
            } else {
                toast.error("Access Denied: Invalid root certificates.");
            }
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.lockout_timer) {
                setLockoutTimer(data.lockout_timer);
            }
            const msg = data?.message || data?.detail || "Security Breach: Invalid gateway credentials.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, [identifier, password, turnstileToken, navigate]);

    const handleResendAdminOTP = useCallback(async () => {
        if (!tempUserId || resendCooldown > 0) return;
        setIsLoading(true);
        try {
            const res = await v2AuthApi.resendAdminOTP(tempUserId);
            setResendCooldown(300); // 5 minutes
            toast.success(res.detail || "Security token resent.");
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.cooldown) setResendCooldown(data.cooldown);
            toast.error(data?.detail || "Failed to resend OTP.");
        } finally {
            setIsLoading(false);
        }
    }, [tempUserId, resendCooldown]);

    const handleVerifyMFA = useCallback(async () => {
        if (!selectedInstitution || !otp) return;

        setIsLoading(true);
        try {
            const res = await v2AuthApi.verifyFacultyMFA({
                institution_id: selectedInstitution.id,
                email: identifier,
                otp
            });

            if (res.success && res.data) {
                toast.success("MFA verified! Redirecting...");
                navigate("/admin-dashboard");
            } else {
                toast.error(res.message || "Invalid OTP.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedInstitution, identifier, otp, navigate]);

    const handleVerifyAdminMFA = useCallback(async (jitTicket?: string | null) => {
        if (!tempUserId || !otp || !password) return;

        setIsLoading(true);
        try {
            const res = await v2AuthApi.verifyAdminOTP({
                user_id: tempUserId,
                otp,
                password,
                remember_device: rememberDevice,
                jit_ticket: jitTicket
            });

            if (res.success) {
                if (res.data?.access) {
                    setAccessToken(res.data.access);
                    if (res.data?.user) {
                        setUser(res.data.user);
                        toast.success("2FA Verified. Access Granted.");
                        setTimeout(() => navigate("/superadmin/institutions"), 100);
                        return;
                    } else {
                        try {
                            const boot = await hydratePassport();
                            if (boot?.user) {
                                setUser(boot.user);
                                toast.success("2FA Verified.");
                                navigate("/superadmin/institutions");
                                return;
                            }
                        } catch (e) {
                            console.error("Hydration fallback failed", e);
                        }
                        toast.error("Login successful but session failed to start.");
                        return;
                    }
                }
                toast.success("2FA Verified.");
                navigate("/superadmin/institutions");
            } else {
                toast.error(res.message || "Invalid 2FA Code.");
            }
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.lockout_timer) {
                setLockoutTimer(data.lockout_timer);
            }
            toast.error(data?.message || data?.detail || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    }, [tempUserId, otp, password, rememberDevice, navigate]);

    const resetForm = () => {
        setOtpRequired(false);
        setOtp("");
        setPassword("");
        setEmail("");
        setTurnstileToken(null);
        setTempUserId(null);
        setLockoutTimer(0);
        setResendCooldown(0);
    };

    return {
        role,
        setRole: (r: AuthRole) => { setRole(r); resetForm(); },
        selectedInstitution,
        setSelectedInstitution: handleInstitutionSelect,
        identifier,
        setIdentifier,
        password,
        setPassword,
        email,
        setEmail,
        otp,
        setOtp,
        turnstileToken,
        setTurnstileToken,
        otpRequired,
        setOtpRequired,
        isLoading,
        emailHint,
        handleCheckIdentity,
        handleStudentLogin,
        handleFacultyLogin,
        handleAdminLogin,
        handleResendAdminOTP,
        handleVerifyMFA,
        handleVerifyAdminMFA,
        rememberDevice,
        setRememberDevice,
        lockoutTimer,
        resendCooldown
    };
};
