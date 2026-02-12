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

    useEffect(() => {
        const renderWidget = () => {
            if (containerRef.current && (window as any).turnstile && !widgetIdRef.current && siteKey) {
                widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: onSuccess,
                    "expired-callback": onExpire,
                    "error-callback": onError,
                    theme: theme,
                });
            }
        };

        // Load Turnstile script if not already present
        if (!(window as any).turnstile) {
            if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
                const script = document.createElement("script");
                script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                script.async = true;
                script.defer = true;
                script.onload = renderWidget;
                document.head.appendChild(script);
            }
        } else {
            renderWidget();
        }

        return () => {
            if (widgetIdRef.current && (window as any).turnstile) {
                try {
                    (window as any).turnstile.remove(widgetIdRef.current);
                } catch (err) {
                    console.warn("Turnstile cleanup error:", err);
                }
                widgetIdRef.current = null;
            }
        };
    }, [onSuccess, onExpire, onError, theme]);

    return (
        <div className="flex flex-col items-center space-y-3 w-full">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Human Verification Identity
            </p>
            <div ref={containerRef} className="scale-90 origin-center min-h-[65px]" />
        </div>
    );
};
