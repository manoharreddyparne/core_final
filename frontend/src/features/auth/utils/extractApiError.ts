/**
 * extractApiError
 * ---------------
 * Normalises errors from the backend into a single human-readable string.
 *
 * Backend shapes handled:
 *  1. { message: "...", errors: { field: ["msg"] } }   ← our custom ApiResponse
 *  2. { field: ["msg1", "msg2"] }                      ← DRF ValidationError (direct)
 *  3. { detail: "..." }                                ← DRF 401/403/404
 *  4. { non_field_errors: ["..."] }                    ← DRF serializer non-field
 *  5. Plain string                                     ← fallback
 */
export function extractApiError(
    err: any,
    fallback = "Something went wrong"
): string {
    console.log("[extractApiError] Raw error input:", err);
    const response = err?.response ?? err;
    const data = response?.data ?? err;
    console.log("[extractApiError] Extracted data:", data);

    if (!data || typeof data !== "object") return fallback;

    // ── 1. Check for `message` + `errors` wrapper ──────────────────────────
    if (data.message && data.errors) {
        const fieldMsgs = flattenErrors(data.errors);
        return fieldMsgs || String(data.message);
    }

    // ── 2. Check for `errors` key only ───────────────────────────────────────
    if (data.errors && typeof data.errors === "object") {
        const fieldMsgs = flattenErrors(data.errors);
        if (fieldMsgs) return fieldMsgs;
    }

    // ── 3. Check for specific DRF `detail` ───────────────────────────────────
    if (data.detail && typeof data.detail === "string") {
        return data.detail;
    }

    // ── 4. Check for direct message ──────────────────────────────────────────
    if (data.message && typeof data.message === "string") {
        return data.message;
    }

    // ── 5. DRF field errors at top level { field: ["msg"] } ──────────────────
    const topLevelFields = flattenErrors(data);
    if (topLevelFields) return topLevelFields;

    // ── 6. Fallback to status text or generic ────────────────────────────────
    return (response?.statusText) || fallback;
}

/**
 * Flattens a { field: string[] } error object (DRF shape) into a sentence.
 * Skips keys that are not arrays or are empty.
 * Returns null if nothing useful is found.
 */
function flattenErrors(errors: Record<string, any>): string | null {
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;

    const parts: string[] = [];

    for (const [key, val] of Object.entries(errors)) {
        // skip unwanted meta keys
        if (["success", "status", "code", "message"].includes(key)) continue;

        if (Array.isArray(val)) {
            val.forEach((v) => {
                if (typeof v === "string") {
                    parts.push(formatFieldError(key, v));
                }
            });
        } else if (typeof val === "string") {
            parts.push(formatFieldError(key, val));
        }
    }

    return parts.length ? parts.join(" • ") : null;
}

function formatFieldError(field: string, message: string): string {
    // non_field_errors → don't prefix with field name
    if (field === "non_field_errors") return message;
    // Convert snake_case field to Title Case prefix
    const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${label}: ${message}`;
}
