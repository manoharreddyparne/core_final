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

    const onSuccessRef = useRef(onSuccess);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    // Update refs when props change
    useEffect(() => {
        onSuccessRef.current = onSuccess;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    }, [onSuccess, onExpire, onError]);

    useEffect(() => {
        const renderWidget = () => {
            const trimmedKey = siteKey?.trim();
            if (containerRef.current && (window as any).turnstile && !widgetIdRef.current && trimmedKey) {
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
            }
        };

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
                    // ignore error on cleanup
                }
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
