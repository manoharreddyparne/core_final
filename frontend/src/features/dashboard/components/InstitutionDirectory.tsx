/**
 * InstitutionDirectory.tsx
 * Public-facing section for LandingPage.
 *
 * Features:
 *  - Live search/filter over AUIP-approved institutions
 *  - Expandable detail card (description, contact, domain)
 *  - Direct links to Approval + Sovereign certificate verify portal
 *  - "Verify Certificate" CTA that any visitor can use
 *  - Zero auth required — all public API
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2, Search, ShieldCheck, ExternalLink,
    ChevronDown, ChevronUp, Globe, Mail, Hash,
    BadgeCheck, Lock
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Institution {
    id: number;
    name: string;
    domain: string;
    contact_email: string;
    slug: string;
    status: string;
    // cert fields (returned by public list endpoint)
    certificate_id?: string;
    certificate_issued_at?: string;
    certificate_expires_at?: string;
    activation_cert_id?: string;
    activation_cert_issued_at?: string;
    activation_cert_expires_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

const isValid = (expires?: string) => {
    if (!expires) return false;
    return new Date(expires) > new Date();
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InstitutionDirectory() {
    const navigate = useNavigate();
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [filtered, setFiltered] = useState<Institution[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`${API}/api/users/public/institutions/`)
            .then((r) => r.json())
            .then((json) => {
                // accept both paginated and flat responses
                const list: Institution[] = Array.isArray(json)
                    ? json
                    : json.results ?? json.data ?? [];
                // only show approved
                const approved = list.filter((i) => i.status === "APPROVED");
                setInstitutions(approved);
                setFiltered(approved);
            })
            .catch(() => { }) // silent — visitors shouldn't see backend errors
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const q = query.toLowerCase();
        setFiltered(
            q
                ? institutions.filter(
                    (i) =>
                        i.name.toLowerCase().includes(q) ||
                        i.domain?.toLowerCase().includes(q)
                )
                : institutions
        );
        setExpandedId(null);
    }, [query, institutions]);

    const toggle = (id: number) =>
        setExpandedId((prev) => (prev === id ? null : id));

    return (
        <section
            id="institutions"
            className="py-24 px-4 border-t"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
            <div className="max-w-5xl mx-auto space-y-12">

                {/* ── Header ── */}
                <div className="text-center space-y-4">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border"
                        style={{
                            background: "rgba(16,185,129,0.08)",
                            borderColor: "rgba(16,185,129,0.25)",
                            color: "#6ee7b7",
                        }}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AUIP Certified Network
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                        Member Institutions
                    </h2>
                    <p
                        className="text-base md:text-lg max-w-xl mx-auto leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Every institution on AUIP holds a verifiable X.509 digital
                        certificate. Anyone can check authenticity — no login required.
                    </p>
                </div>

                {/* ── Trust badges ── */}
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                    {[
                        { label: "X.509 PKI", icon: Lock, color: "#60a5fa" },
                        { label: "PAdES-B Signed", icon: ShieldCheck, color: "#34d399" },
                        { label: "Publicly Verifiable", icon: BadgeCheck, color: "#a78bfa" },
                    ].map(({ label, icon: Icon, color }) => (
                        <div
                            key={label}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border text-center"
                            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
                        >
                            <Icon className="w-5 h-5" style={{ color }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── Search ── */}
                <div className="relative max-w-xl mx-auto">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search institution or domain…"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-emerald-500/30"
                        style={{
                            background: "var(--bg-elevated)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: "var(--text-muted)" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── List ── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                            <div
                                key={n}
                                className="skeleton h-20 rounded-2xl"
                                style={{ opacity: 0.5 }}
                            />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Building2
                            className="w-12 h-12 mx-auto mb-4"
                            style={{ color: "var(--text-muted)" }}
                        />
                        <p
                            className="font-black text-sm uppercase tracking-widest"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {query ? "No institutions match your search" : "No institutions yet"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((inst) => {
                            const expanded = expandedId === inst.id;
                            const hasCert = !!inst.certificate_id;
                            const hasSovCert = !!inst.activation_cert_id;
                            const certOk = isValid(inst.certificate_expires_at);
                            const sovOk = isValid(inst.activation_cert_expires_at);

                            return (
                                <div
                                    key={inst.id}
                                    className="rounded-2xl border overflow-hidden transition-all duration-200"
                                    style={{
                                        background: "var(--bg-elevated)",
                                        borderColor: expanded
                                            ? "rgba(16,185,129,0.35)"
                                            : "var(--border)",
                                    }}
                                >
                                    {/* Row */}
                                    <button
                                        onClick={() => toggle(inst.id)}
                                        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                                            style={{ background: "rgba(16,185,129,0.1)" }}
                                        >
                                            <Building2 className="w-5 h-5 text-emerald-400" />
                                        </div>

                                        {/* Name + domain */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-sm truncate">
                                                {inst.name}
                                            </div>
                                            <div
                                                className="text-xs truncate mt-0.5"
                                                style={{ color: "var(--text-muted)" }}
                                            >
                                                {inst.domain}
                                            </div>
                                        </div>

                                        {/* Cert pills */}
                                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                                            {hasCert && (
                                                <span
                                                    className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                                    style={{
                                                        background: certOk
                                                            ? "rgba(245,158,11,0.12)"
                                                            : "rgba(100,116,139,0.12)",
                                                        color: certOk ? "#fcd34d" : "#64748b",
                                                    }}
                                                >
                                                    {certOk ? "✓ Approved Cert" : "Cert Expired"}
                                                </span>
                                            )}
                                            {hasSovCert && (
                                                <span
                                                    className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                                    style={{
                                                        background: sovOk
                                                            ? "rgba(16,185,129,0.12)"
                                                            : "rgba(100,116,139,0.12)",
                                                        color: sovOk ? "#34d399" : "#64748b",
                                                    }}
                                                >
                                                    {sovOk ? "✓ Sovereign Cert" : "Sovereign Expired"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Chevron */}
                                        {expanded ? (
                                            <ChevronUp className="w-4 h-4 shrink-0 text-emerald-400" />
                                        ) : (
                                            <ChevronDown
                                                className="w-4 h-4 shrink-0"
                                                style={{ color: "var(--text-muted)" }}
                                            />
                                        )}
                                    </button>

                                    {/* Expanded detail */}
                                    {expanded && (
                                        <div
                                            className="border-t px-6 py-6 space-y-6"
                                            style={{ borderColor: "rgba(16,185,129,0.15)" }}
                                        >
                                            {/* Quick info */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <InfoChip
                                                    icon={Globe}
                                                    label="Domain"
                                                    value={inst.domain || "—"}
                                                    color="#60a5fa"
                                                />
                                                <InfoChip
                                                    icon={Mail}
                                                    label="Contact"
                                                    value={inst.contact_email || "—"}
                                                    color="#a78bfa"
                                                />
                                                <InfoChip
                                                    icon={Hash}
                                                    label="Status"
                                                    value={inst.status}
                                                    color="#34d399"
                                                />
                                            </div>

                                            {/* Certificate actions */}
                                            <div>
                                                <p
                                                    className="text-[10px] font-black uppercase tracking-widest mb-3"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    Verifiable Certificates
                                                </p>
                                                <div className="flex flex-wrap gap-3">
                                                    {hasCert ? (
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/verify-certificate/approval/${inst.certificate_id}`
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                                            style={{
                                                                background: "rgba(245,158,11,0.12)",
                                                                border: "1px solid rgba(245,158,11,0.3)",
                                                                color: "#fcd34d",
                                                            }}
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            Verify Approval Cert
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest"
                                                            style={{
                                                                background: "var(--bg-card)",
                                                                border: "1px solid var(--border)",
                                                                color: "var(--text-muted)",
                                                            }}
                                                        >
                                                            No Approval Cert
                                                        </span>
                                                    )}

                                                    {hasSovCert ? (
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/verify-certificate/activation/${inst.activation_cert_id}`
                                                                )
                                                            }
                                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                                            style={{
                                                                background: "rgba(16,185,129,0.12)",
                                                                border: "1px solid rgba(16,185,129,0.3)",
                                                                color: "#34d399",
                                                            }}
                                                        >
                                                            <BadgeCheck className="w-3.5 h-3.5" />
                                                            Verify Sovereign Cert
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest"
                                                            style={{
                                                                background: "var(--bg-card)",
                                                                border: "1px solid var(--border)",
                                                                color: "var(--text-muted)",
                                                            }}
                                                        >
                                                            No Sovereign Cert Yet
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cert issued dates */}
                                            {(hasCert || hasSovCert) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                    {hasCert && (
                                                        <CertDateCard
                                                            label="Approval Certificate"
                                                            issued={fmtDate(inst.certificate_issued_at)!}
                                                            expires={fmtDate(inst.certificate_expires_at)!}
                                                            valid={certOk}
                                                            color="#f59e0b"
                                                        />
                                                    )}
                                                    {hasSovCert && (
                                                        <CertDateCard
                                                            label="Sovereign Certificate"
                                                            issued={fmtDate(inst.activation_cert_issued_at)!}
                                                            expires={fmtDate(inst.activation_cert_expires_at)!}
                                                            valid={sovOk}
                                                            color="#10b981"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* External */}
                                            <div className="flex justify-end pt-2">
                                                <a
                                                    href={`https://${inst.domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-blue-400"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    Visit Institution <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Bottom CTA — public verify prompt ── */}
                <div
                    className="rounded-3xl border p-8 text-center space-y-4"
                    style={{
                        background: "linear-gradient(135deg, rgba(16,185,129,0.07), rgba(59,130,246,0.07))",
                        borderColor: "rgba(16,185,129,0.2)",
                    }}
                >
                    <div className="flex justify-center">
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-black">Got a Certificate to Verify?</h3>
                    <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                        If you received a certificate from an AUIP-registered institution or
                        institution admin, you can verify its authenticity here — instantly,
                        without creating an account.
                    </p>
                    <button
                        onClick={() => navigate("/verify-certificate/approval/lookup")}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Open Verification Portal
                    </button>
                </div>
            </div>
        </section>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoChip({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof Globe;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
            <div className="min-w-0">
                <div
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                >
                    {label}
                </div>
                <div
                    className="text-xs font-bold truncate mt-0.5"
                    style={{ color: "var(--text-primary)" }}
                >
                    {value}
                </div>
            </div>
        </div>
    );
}

function CertDateCard({
    label,
    issued,
    expires,
    valid,
    color,
}: {
    label: string;
    issued: string;
    expires: string;
    valid: boolean;
    color: string;
}) {
    return (
        <div
            className="p-4 rounded-xl space-y-2"
            style={{
                background: valid ? `${color}0d` : "var(--bg-card)",
                border: `1px solid ${valid ? color + "30" : "var(--border)"}`,
            }}
        >
            <div
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color }}
            >
                {label}
            </div>
            <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>Issued: <strong>{issued || "—"}</strong></span>
                <span
                    style={{ color: valid ? color : "#ef4444" }}
                    className="font-bold"
                >
                    {valid ? `Valid to ${expires}` : `Expired ${expires}`}
                </span>
            </div>
        </div>
    );
}
