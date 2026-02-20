// src/features/intelligence/components/ReadinessMeter.tsx
import React from 'react';

interface ReadinessMeterProps {
    score: number;
    label: string;
    color?: string;
}

export const ReadinessMeter: React.FC<ReadinessMeterProps> = ({ score, label, color = "primary" }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/5"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`text-${color} transition-all duration-1000 ease-out`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{score}%</span>
                </div>
            </div>
            <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        </div>
    );
};
