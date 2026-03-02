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
    theme = "light"
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 3;

    const onSuccessRef = useRef(onSuccess);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onSuccessRef.current = onSuccess;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    }, [onSuccess, onExpire, onError]);

    // Turnstile always renders - no bypasses

    useEffect(() => {
        let isMounted = true;

        const renderWidget = () => {
            if (!isMounted) return;
            const trimmedKey = siteKey?.trim();

            // Critical check: Only render if container, library, and key are all ready
            if (containerRef.current && (window as any).turnstile && trimmedKey) {
                // If already rendered, reset instead of re-rendering to avoid duplicates
                if (widgetIdRef.current) {
                    try {
                        (window as any).turnstile.reset(widgetIdRef.current);
                    } catch (e) { }
                    return;
                }

                try {
                    widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
                        sitekey: trimmedKey,
                        callback: (token: string) => {
                            retryCountRef.current = 0;
                            onSuccessRef.current(token);
                        },
                        "expired-callback": () => {
                            onExpireRef.current?.();
                        },
                        "error-callback": (code: string) => {
                            if (retryCountRef.current < MAX_RETRIES) {
                                retryCountRef.current++;
                                if (widgetIdRef.current) {
                                    (window as any).turnstile.reset(widgetIdRef.current);
                                }
                            } else {
                                onErrorRef.current?.();
                            }
                        },
                        theme: theme,
                    });
                    console.debug("[TURNSTILE] Widget rendered successfully");
                } catch (err) {
                    console.error("[TURNSTILE] Render error:", err);
                }
            }
        };

        // Load the script if missing
        if (!(window as any).turnstile) {
            const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
            if (!existingScript) {
                const script = document.createElement("script");
                script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    // Small delay to ensure initialization
                    setTimeout(renderWidget, 100);
                };
                document.head.appendChild(script);
            } else {
                // Script exists but lib not ready - poll briefly
                const interval = setInterval(() => {
                    if ((window as any).turnstile) {
                        renderWidget();
                        clearInterval(interval);
                    }
                }, 100);
                setTimeout(() => clearInterval(interval), 5000); // Stop after 5s
            }
        } else {
            renderWidget();
        }

        return () => {
            isMounted = false;
            if (widgetIdRef.current && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetIdRef.current);
                } catch (err) { }
                widgetIdRef.current = null;
            }
        };
    }, [siteKey, theme]);

    return (
        <div className="flex flex-col items-center space-y-3 w-full">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Human Verification Identity
            </p>
            <div ref={containerRef} className="scale-90 origin-center min-h-[65px]" />
        </div>
    );
};
