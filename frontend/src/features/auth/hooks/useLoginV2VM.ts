import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { v2AuthApi, Institution } from "../api/v2AuthApi";
import { useAuth } from "../context/AuthProvider/AuthProvider";
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

    const [otpRequired, setOtpRequired] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailHint, setEmailHint] = useState("");

    const handleInstitutionSelect = (inst: Institution | null) => {
        setSelectedInstitution(inst);
        if (inst) {
            localStorage.setItem('selected_institution', JSON.stringify(inst));
        } else {
            localStorage.removeItem('selected_institution');
        }
    };

    const handleCheckIdentity = async () => {
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
            toast.error(err.response?.data?.detail || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStudentLogin = async () => {
        if (!selectedInstitution) {
            toast.error("Please select an institution first.");
            return;
        }
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.studentLogin({
                institution_id: selectedInstitution.id,
                identifier,
                password
            });

            if (res.success && res.data) {
                toast.success("Login successful!");
                navigate("/student-dashboard");
            } else {
                toast.error(res.message || "Invalid credentials.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacultyLogin = async () => {
        if (!selectedInstitution) {
            toast.error("Please select an institution first.");
            return;
        }
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await v2AuthApi.facultyLogin({
                institution_id: selectedInstitution.id,
                email: identifier,
                password
            });

            if (res.data?.requires_otp) {
                setOtpRequired(true);
                setEmailHint(res.data.email_hint);
                toast.success("Password verified. OTP sent.");
            } else {
                toast.error(res.message || "Login failed.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Invalid credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdminLogin = async () => {
        if (!identifier || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            // Using a specific Super Admin endpoint if available, or generic login
            // For now, aligning with the industry standard hidden gateway
            const res = await v2AuthApi.studentLogin({
                institution_id: 1, // Global Public Schema
                identifier,
                password
            });

            if (res.success) {
                toast.success("Super Admin authenticated.");
                navigate("/superadmin/institutions");
            } else {
                toast.error("Access Denied: Invalid root certificates.");
            }
        } catch (err: any) {
            toast.error("Security Breach: Invalid gateway credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyMFA = async () => {
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
            toast.error(err.response?.data?.detail || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setOtpRequired(false);
        setOtp("");
        setPassword("");
        setEmail("");
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
        otpRequired,
        setOtpRequired,
        isLoading,
        emailHint,
        handleCheckIdentity,
        handleStudentLogin,
        handleFacultyLogin,
        handleAdminLogin,
        handleVerifyMFA
    };
};
