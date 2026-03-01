// src/shared/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    toggleTheme: () => { },
    setTheme: () => { },
});

const STORAGE_KEY = "auip_theme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        // 1. Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored === "dark" || stored === "light") return stored;
        // 2. Check .env default
        const envDefault = import.meta.env.VITE_DEFAULT_THEME as Theme | undefined;
        if (envDefault === "light") return "light";
        // 3. Check OS preference
        if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
        return "dark";
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(theme);
        root.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const setTheme = (t: Theme) => setThemeState(t);
    const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
