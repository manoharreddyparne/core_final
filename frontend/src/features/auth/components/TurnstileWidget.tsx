import { useEffect, useRef, FC } from "react";

interface Props {
    siteKey?: string;
    onSuccess: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    theme?: "light" | "dark" | "auto";
}

export const TurnstileWidget: FC<Props> = ({
    siteKey,
    onSuccess,
    onExpire,
    onError,
    theme = "dark"
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 3;

    useEffect(() => {
        const checkInterference = () => {
            // Check for common adblock/trackers blocking Cloudflare
            if (!(window as any).turnstile && document.querySelector('script[src*="turnstile"]')) {
                console.error("[TURNSTILE] 🕵️ Script detected but object missing. Likely blocked by an extension (AdBlock/uBlock).");
            }
        };

        const renderWidget = () => {
            if (containerRef.current && (window as any).turnstile && !widgetIdRef.current && siteKey) {
                // console.debug(`[TURNSTILE] 🛡️ Initializing human verification protocol (Attempt ${retryCountRef.current + 1}/${MAX_RETRIES + 1})...`);
                widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        // console.debug("[TURNSTILE] ✅ Identity verified. Token acquired.");
                        retryCountRef.current = 0; // Reset on success
                        onSuccess(token);
                    },
                    "expired-callback": () => {
                        // console.warn("[TURNSTILE] ⚠️ Challenge session expired. Refreshing...");
                        onExpire?.();
                    },
                    "error-callback": (code: string) => {
                        // console.error("[TURNSTILE] ❌ Challenge execution error. Code:", code);

                        // Retry logic
                        if (retryCountRef.current < MAX_RETRIES) {
                            retryCountRef.current++;
                            // console.info(`[TURNSTILE] 🔄 Automated retry initiated (${retryCountRef.current}/${MAX_RETRIES})...`);
                            if (widgetIdRef.current) {
                                (window as any).turnstile.reset(widgetIdRef.current);
                            }
                        } else {
                            // Only log critical failure if absolutely necessary, but keep it quiet for now based on user request
                            onError?.();
                        }
                    },
                    theme: theme,
                });
            }
        };

        // Load Turnstile script if not already present
        if (!(window as any).turnstile) {
            // console.debug("[TURNSTILE] Loading remote security layer...");
            if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
                const script = document.createElement("script");
                script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    // console.debug("[TURNSTILE] Remote security layer loaded.");
                    renderWidget();
                };
                script.onerror = () => {
                    // console.error("[TURNSTILE] 🚨 FAILED to reach security servers. Please disable AdBlockers/VPNs.");
                }
                document.head.appendChild(script);
            }
        } else {
            // If script is already loaded but widget not rendered (e.g. navigation back)
            renderWidget();
        }

        // 🛑 REMOVED: Interval check was causing noise.
        // const interval = setInterval(checkInterference, 5000);

        return () => {
            // clearInterval(interval);
            if (widgetIdRef.current && (window as any).turnstile) {
                // console.debug("[TURNSTILE] Handshake cleanup.");
                try {
                    (window as any).turnstile.remove(widgetIdRef.current);
                } catch (err) {
                    // console.warn("[TURNSTILE] Cleanup warning:", err);
                }
                widgetIdRef.current = null;
            }
        };
    }, [onSuccess, onExpire, onError, theme, siteKey]);

    return (
        <div className="flex flex-col items-center space-y-3 w-full">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Human Verification Identity
            </p>
            <div ref={containerRef} className="scale-90 origin-center min-h-[65px]" />
        </div>
    );
};
