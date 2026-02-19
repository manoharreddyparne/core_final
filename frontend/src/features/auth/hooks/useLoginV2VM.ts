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
    const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("");

    const handleTurnstileSuccess = useCallback((token: string | null) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const [tempUserId, setTempUserId] = useState<number | null>(null);
    const [lockoutTimer, setLockoutTimer] = useState<number>(0);
    const [resendCooldown, setResendCooldown] = useState<number>(0);

    // Fetch Public Config (Turnstile Site Key)
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await v2AuthApi.getPublicConfig();
                if (config.turnstile_site_key) {
                    setTurnstileSiteKey(config.turnstile_site_key);
                }
            } catch (err) {
                console.error("[V2-AUTH] Failed to load public security config", err);
            }
        };
        fetchConfig();
    }, []);

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

    const handleAdminLogin = useCallback(async (jitTicket?: string | null, options?: { forceGlobal?: boolean }) => {
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
            let res;
            // ✅ ISOLATED AUTH SWITCH
            // If forceGlobal is true OR direct JIT ticket is present, we bypass institutional login logic
            if (options?.forceGlobal || !selectedInstitution) {
                // Global Super Admin Login
                res = await v2AuthApi.adminLogin({
                    username: identifier,
                    password,
                    turnstile_token: turnstileToken,
                    jit_ticket: jitTicket
                });
            } else {
                // Institutional Login (Tenant Schema)
                res = await v2AuthApi.instAdminLogin({
                    institution_id: selectedInstitution.id,
                    email: identifier, // passed as 'email' expected by backend
                    password,
                    turnstile_token: turnstileToken
                });
            }

            if (res.data?.require_otp) {
                setOtpRequired(true);
                setTempUserId(res.data.user_id ?? null);
                setResendCooldown(300);
                toast.success("Credentials valid. 2FA Required.");
                return;
            }

            if (res.success) {
                if (res.data?.access) {
                    setAccessToken(res.data.access);
                }

                // ✅ For institutional logins, user is directly in the response.
                // Only fall back to hydratePassport for super admin (global) logins.
                let userData = res.data?.user;
                if (!userData && !selectedInstitution) {
                    // Global admin: passport hydration needed
                    userData = (await hydratePassport()).user;
                }

                if (userData) {
                    setUser(userData);
                    const role = (userData.role || "").toUpperCase();
                    if (role === 'SUPER_ADMIN') {
                        toast.success("Super Admin authenticated.");
                        navigate("/superadmin/dashboard");
                    } else if (role === 'INSTITUTION_ADMIN') {
                        toast.success("Institutional Admin authenticated.");
                        navigate("/institution/dashboard");
                    } else {
                        toast.success("Authentication successful.");
                        navigate("/institution/dashboard");
                    }
                } else {
                    toast.error("Session sync failed. Please try again.");
                }
            } else {
                toast.error(res.message || "Access Denied: Invalid root certificates.");
            }
        } catch (err: any) {
            console.error("[useLoginV2VM] Login Error:", err);
            const data = err.response?.data;
            const status = err.response?.status;

            if (status === 403) {
                if (data?.lockout_timer) {
                    // IP locked out — trigger the full lockout overlay
                    setLockoutTimer(data.lockout_timer);
                    toast.error(data.message || "Access revoked. Your IP has been temporarily locked.");
                } else {
                    // Protocol Violation / JIT Expired
                    toast.error(data?.message || "Security protocol violation. Please request a new link.");
                    setTimeout(() => navigate("/auth/infrastructure-status"), 2000);
                }
            } else {
                // Robust message extraction: check message, detail, or nested data.message
                const backendMsg = data?.message || data?.detail || data?.data?.message;
                const finalMsg = backendMsg || "Authentication failed. Please check your credentials and try again.";

                toast.error(finalMsg);

                // If backend sent attempts_remaining, we could use it for specific UI effects if needed
                if (data?.data?.attempts_remaining !== undefined) {
                    console.warn(`[useLoginV2VM] Attempts remaining: ${data.data.attempts_remaining}`);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [identifier, password, turnstileToken, navigate, selectedInstitution]);

    const handleResendAdminOTP = useCallback(async () => {
        if (!tempUserId || resendCooldown > 0) return;
        setIsLoading(true);
        try {
            const res = await v2AuthApi.resendAdminOTP(tempUserId);
            setResendCooldown(300);
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
                navigate("/institution/dashboard");
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
                }

                const userData = res.data?.user || (await hydratePassport()).user;

                if (userData) {
                    setUser(userData);
                    toast.success("2FA Verified. Access Granted.");
                    const role = userData.role?.toUpperCase();

                    let target = "/student-dashboard";
                    if (role === 'SUPER_ADMIN') {
                        target = "/superadmin/dashboard";
                    } else if (role === 'INSTITUTION_ADMIN' || role === 'ADMIN') {
                        target = "/institution/dashboard";
                    }

                    // Using a small timeout to ensure state settles
                    setTimeout(() => navigate(target), 100);
                } else {
                    toast.error("Login successful but session failed to start.");
                }
            } else {
                toast.error(res.message || "Invalid 2FA Code.");
            }
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.lockout_timer) {
                setLockoutTimer(data.lockout_timer);
            }

            const msg = data?.message || data?.detail || "Verification failed. Please try again.";
            toast.error(msg);

            // ✅ Professional Redirect: If session expired, user must request a new JIT link
            if (msg.toLowerCase().includes("session expired")) {
                setTimeout(() => {
                    navigate("/auth/infrastructure-status");
                }, 1500);
            }
        } finally {
            setIsLoading(false);
        }
    }, [tempUserId, otp, password, rememberDevice, navigate, selectedInstitution]);

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
        setTurnstileToken: handleTurnstileSuccess,
        onTurnstileExpire: handleTurnstileExpire,
        turnstileSiteKey, // ✅ Expose site key
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
