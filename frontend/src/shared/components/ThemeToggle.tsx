// src/shared/components/ThemeToggle.tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface Props {
    className?: string;
}

export const ThemeToggle = ({ className = "" }: Props) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            id="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className={`
                relative w-10 h-10 flex items-center justify-center rounded-full
                border border-white/10 dark:border-white/10 light:border-black/10
                bg-white/5 dark:bg-white/5 light:bg-black/5
                hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-black/10
                transition-all duration-300 group overflow-hidden
                ${className}
            `}
        >
            {/* Dark mode icon */}
            <Moon
                className={`
                    w-4 h-4 absolute transition-all duration-300
                    ${theme === "dark"
                        ? "text-blue-400 opacity-100 scale-100 rotate-0"
                        : "text-gray-400 opacity-0 scale-50 -rotate-90"}
                `}
            />
            {/* Light mode icon */}
            <Sun
                className={`
                    w-4 h-4 absolute transition-all duration-300
                    ${theme === "light"
                        ? "text-amber-500 opacity-100 scale-100 rotate-0"
                        : "text-gray-400 opacity-0 scale-50 rotate-90"}
                `}
            />
        </button>
    );
};
