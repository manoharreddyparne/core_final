/**
 * CertificateVerify.tsx
 * Public-facing certificate verification portal.
 * Route: /verify-certificate/:type/:certId
 * Accessible without login — anyone with the QR code or link can verify.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CertData {
    valid: boolean;
    cert_type: "approval" | "activation";
    cert_status: "VALID" | "EXPIRED" | "UNKNOWN";
    institution: {
        name: string;
        domain: string;
        country: string;
        status: string;
    };
    certificate: {
        id: string;
        serial: string;
        fingerprint: string;
        issued_at: string;
        expires_at: string;
        authority: string;
        signature_algo: string;
        key_usage: string[];
        extended_key_usage: string[];
        trust_level: "PROVISIONAL" | "SOVEREIGN";
        pdf_url: string | null;
    };
    chain: Array<{ name: string; type: string; validity: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

const fmtFingerprint = (fp: string | null) => {
    if (!fp) return "—";
    return fp.match(/.{1,2}/g)?.slice(0, 20).join(":") + "...";
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CertificateVerify() {
    const { type, certId } = useParams<{ type: string; certId: string }>();
    const [data, setData] = useState<CertData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!certId) return;
        setLoading(true);
        fetch(`${API}/api/users/public/certificates/${certId}/verify/?type=${type || "approval"}`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success || json.data) {
                    setData(json.data);
                } else {
                    setError(json.message || "Certificate not found.");
                }
            })
            .catch(() => setError("Failed to reach verification server."))
            .finally(() => setLoading(false));
    }, [certId, type]);

    const isSovereign = data?.cert_type === "activation";
    const isValid = data?.cert_status === "VALID";
    const isExpired = data?.cert_status === "EXPIRED";

    // ── Theme ──
    const accent = isSovereign ? "#10b981" : "#f59e0b";
    const accentDim = isSovereign ? "#065f46" : "#78350f";
    const accentText = isSovereign ? "#6ee7b7" : "#fcd34d";

    return (
        <div style={styles.page}>
            {/* Background grid */}
            <div style={styles.grid} />

            <div style={styles.container}>
                {/* ── Header ── */}
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <span style={{ color: accent }}>AUIP</span>
                        <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 8 }}>
                            Certificate Verification Portal
                        </span>
                    </Link>
                    <p style={styles.headerSub}>
                        Academic University Integration Portal · Institutional Trust Authority
                    </p>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div style={styles.card}>
                        <div style={styles.loadingWrap}>
                            <div style={{ ...styles.spinner, borderTopColor: accent }} />
                            <p style={{ color: "#64748b", marginTop: 16 }}>
                                Verifying certificate integrity...
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Error ── */}
                {!loading && error && (
                    <div style={{ ...styles.card, borderColor: "#ef4444" }}>
                        <div style={styles.statusBadge("#ef4444", "#450a0a")}>
                            <span style={{ fontSize: 28 }}>🚫</span>
                            <div>
                                <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 18 }}>
                                    INVALID CERTIFICATE
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                                    {error}
                                </div>
                            </div>
                        </div>
                        <p style={{ color: "#475569", fontSize: 13, marginTop: 24, textAlign: "center" }}>
                            This certificate ID does not exist or may have been tampered with.
                            Contact <a href="mailto:support@auip.edu" style={{ color: "#ef4444" }}>support@auip.edu</a> if you believe this is an error.
                        </p>
                    </div>
                )}

                {/* ── Certificate Data ── */}
                {!loading && data && data.certificate && (
                    <>
                        {/* Status Banner */}
                        <div
                            style={{
                                ...styles.statusBanner,
                                background: isValid
                                    ? `linear-gradient(135deg, ${accentDim}, #0a0a14)`
                                    : "linear-gradient(135deg, #450a0a, #0a0a14)",
                                borderColor: isValid ? accent : "#ef4444",
                            }}
                        >
                            <span style={{ fontSize: 36 }}>
                                {isValid ? "✅" : isExpired ? "⏰" : "❓"}
                            </span>
                            <div>
                                <div
                                    style={{
                                        fontWeight: 800,
                                        fontSize: 22,
                                        color: isValid ? accent : "#ef4444",
                                        letterSpacing: 1,
                                    }}
                                >
                                    {isValid ? "CERTIFICATE VALID" : isExpired ? "CERTIFICATE EXPIRED" : "STATUS UNKNOWN"}
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                                    {isSovereign
                                        ? "Sovereign Activation Certificate · AUIP Governance Network"
                                        : "Provisional Approval Certificate · AUIP Trust Authority"}
                                </div>
                            </div>
                            <div
                                style={{
                                    marginLeft: "auto",
                                    background: isValid ? accent : "#ef4444",
                                    color: "#050d14",
                                    fontWeight: 900,
                                    fontSize: 11,
                                    padding: "4px 14px",
                                    borderRadius: 20,
                                    letterSpacing: 2,
                                    alignSelf: "center",
                                }}
                            >
                                {data.certificate.trust_level}
                            </div>
                        </div>

                        {/* Institution Info */}
                        <div style={{ ...styles.card, borderColor: accent + "40" }}>
                            <div style={styles.sectionLabel(accent)}>INSTITUTION</div>
                            <h1 style={{ color: accentText, fontSize: 30, margin: "8px 0 4px", fontWeight: 800 }}>
                                {data.institution.name}
                            </h1>
                            <p style={{ color: "#38bdf8", fontSize: 14, margin: 0 }}>
                                {data.institution.domain}
                            </p>
                            <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
                                <InfoPill label="Status" value={data.institution.status} color={accent} />
                                <InfoPill label="Country" value={data.institution.country || "India"} color="#94a3b8" />
                                <InfoPill label="Certificate Type" value={isSovereign ? "Sovereign" : "Provisional"} color={accent} />
                            </div>
                        </div>

                        {/* Certificate Details */}
                        <div style={{ ...styles.card, borderColor: accent + "30" }}>
                            <div style={styles.sectionLabel(accent)}>CERTIFICATE DETAILS</div>
                            <div style={styles.grid2Col}>
                                <DetailRow label="Serial Number" value={`SN:${(data.certificate.serial || "").slice(0, 24)}...`} color={accentText} mono />
                                <DetailRow label="Issued On" value={fmtDate(data.certificate.issued_at)} />
                                <DetailRow label="Valid Until" value={fmtDate(data.certificate.expires_at)} color={isValid ? accent : "#ef4444"} />
                                <DetailRow label="Certificate Authority" value={data.certificate.authority} />
                                <DetailRow label="Signature Algorithm" value={data.certificate.signature_algo} />
                                <DetailRow label="Trust Level" value={data.certificate.trust_level} color={accent} />
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <div style={styles.sectionLabel(accent)}>EXTENDED KEY USAGE</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                    {data.certificate.extended_key_usage.map((eku) => (
                                        <span key={eku} style={styles.ekuChip(accent)}>
                                            {eku}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <div style={styles.sectionLabel(accent)}>SHA-256 FINGERPRINT</div>
                                <code style={{ display: "block", marginTop: 8, color: "#475569", fontSize: 12, wordBreak: "break-all" }}>
                                    {fmtFingerprint(data.certificate.fingerprint)}
                                </code>
                            </div>
                        </div>

                        {/* Trust Chain */}
                        <div style={{ ...styles.card, borderColor: accent + "20" }}>
                            <div style={styles.sectionLabel(accent)}>CERTIFICATE CHAIN OF TRUST</div>
                            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 0 }}>
                                {data.chain.map((node, i) => (
                                    <div key={node.name} style={{ display: "flex", flexDirection: "column" }}>
                                        <div style={styles.chainNode(accent, node.type === "end-entity")}>
                                            <div
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: "50%",
                                                    background: node.type === "root"
                                                        ? accent
                                                        : node.type === "intermediate"
                                                            ? accentDim
                                                            : "#1e3a5f",
                                                    border: `2px solid ${accent}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 14,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {node.type === "root" ? "⛨" : node.type === "intermediate" ? "🔗" : "🏛"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>
                                                    {node.name}
                                                </div>
                                                <div style={{ color: "#64748b", fontSize: 12, textTransform: "capitalize" }}>
                                                    {node.type.replace("-", " ")} · {node.validity}
                                                </div>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: accent,
                                                    background: accentDim,
                                                    padding: "2px 10px",
                                                    borderRadius: 12,
                                                    letterSpacing: 1,
                                                }}
                                            >
                                                {node.type.toUpperCase().replace("-", " ")}
                                            </span>
                                        </div>
                                        {i < data.chain.length - 1 && (
                                            <div
                                                style={{
                                                    width: 2,
                                                    height: 20,
                                                    background: accent + "40",
                                                    marginLeft: 17,
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Download / Actions */}
                        {data.certificate.pdf_url && (
                            <div style={{ textAlign: "center", marginTop: 8, marginBottom: 8 }}>
                                <a
                                    href={data.certificate.pdf_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={styles.downloadBtn(accent)}
                                >
                                    ↓ Download Signed Certificate PDF
                                </a>
                            </div>
                        )}

                        {/* Footer note */}
                        <div style={styles.footerNote}>
                            <p>
                                This certificate was digitally signed using X.509 PKI standards with PAdES-B digital signature.
                                Any alteration to the certificate renders it invalid. Verified by AUIP Platform Certification Authority.
                            </p>
                            <p style={{ marginTop: 8, color: "#334155" }}>
                                Certificate ID: <code style={{ color: "#475569" }}>{data.certificate.id}</code>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function InfoPill({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                {label}
            </div>
            <div style={{ color, fontWeight: 700, fontSize: 14, marginTop: 2 }}>{value}</div>
        </div>
    );
}

function DetailRow({
    label,
    value,
    color = "#e2e8f0",
    mono = false,
}: {
    label: string;
    value: string;
    color?: string;
    mono?: boolean;
}) {
    return (
        <div style={{ borderBottom: "1px solid #0f2137", paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                {label}
            </div>
            <div
                style={{
                    color,
                    fontWeight: 600,
                    fontSize: 13,
                    marginTop: 3,
                    fontFamily: mono ? "monospace" : "inherit",
                }}
            >
                {value}
            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
    page: {
        minHeight: "100vh",
        background: "#050d14",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        position: "relative" as const,
        overflow: "hidden",
    },
    grid: {
        position: "absolute" as const,
        inset: 0,
        backgroundImage:
            "linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none" as const,
    },
    container: {
        maxWidth: 760,
        margin: "0 auto",
        padding: "40px 20px 80px",
        position: "relative" as const,
        zIndex: 1,
    },
    header: {
        textAlign: "center" as const,
        marginBottom: 32,
    },
    logo: {
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 3,
        textDecoration: "none",
        display: "inline-block",
    },
    headerSub: {
        color: "#334155",
        fontSize: 12,
        marginTop: 6,
    },
    card: {
        background: "#0a1628",
        border: "1px solid #1e3a5f",
        borderRadius: 16,
        padding: "28px 32px",
        marginBottom: 16,
    },
    loadingWrap: {
        textAlign: "center" as const,
        padding: "48px 0",
    },
    spinner: {
        width: 40,
        height: 40,
        border: "3px solid #1e3a5f",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "0 auto",
    },
    statusBanner: {
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "24px 28px",
        borderRadius: 16,
        border: "2px solid",
        marginBottom: 16,
    },
    statusBadge: (border: string, bg: string) => ({
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
    }),
    sectionLabel: (color: string) => ({
        fontSize: 10,
        fontWeight: 700,
        color,
        letterSpacing: 2,
        textTransform: "uppercase" as const,
        marginBottom: 4,
    }),
    grid2Col: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "0 32px",
        marginTop: 16,
    },
    chainNode: (accent: string, isLast: boolean) => ({
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        borderRadius: 10,
        background: isLast ? `${accent}10` : "transparent",
        border: isLast ? `1px solid ${accent}30` : "1px solid transparent",
    }),
    ekuChip: (accent: string) => ({
        background: `${accent}15`,
        border: `1px solid ${accent}40`,
        color: accent,
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 600,
    }),
    downloadBtn: (accent: string) => ({
        display: "inline-block",
        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
        color: "#050d14",
        textDecoration: "none",
        padding: "12px 28px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 0.5,
    }),
    footerNote: {
        textAlign: "center" as const,
        padding: "20px",
        color: "#334155",
        fontSize: 11,
        lineHeight: 1.6,
    },
};
