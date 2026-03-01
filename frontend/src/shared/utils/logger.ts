/**
 * Global Logger Utility
 * Only logs to console if VITE_DEBUG=true or during development.
 */

const isDebug = import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV;

export const logger = {
    log: (...args: any[]) => {
        if (isDebug) console.log(...args);
    },
    error: (...args: any[]) => {
        if (isDebug) console.error(...args);
    },
    warn: (...args: any[]) => {
        if (isDebug) console.warn(...args);
    },
    info: (...args: any[]) => {
        if (isDebug) console.info(...args);
    },
    group: (...args: any[]) => {
        if (isDebug) console.group(...args);
    },
    groupEnd: () => {
        if (isDebug) console.groupEnd();
    },
};
