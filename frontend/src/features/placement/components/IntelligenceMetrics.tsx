import React from "react";
import { Users, Briefcase, Activity, CheckCircle } from "lucide-react";

interface IntelligenceMetricsProps {
    totalDrives: number;
    activeApplications: number;
    placedCount: number;
}

const IntelligenceMetrics: React.FC<IntelligenceMetricsProps> = ({
    totalDrives,
    activeApplications,
    placedCount
}) => {
    const stats = [
        { label: "Neural Initiatives", value: totalDrives, icon: Briefcase, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        { label: "Active Pipeline", value: activeApplications, icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Live Manifests", value: totalDrives, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
        { label: "Successful Placements", value: placedCount, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
                <div key={index} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/[0.05] transition-all flex items-center gap-5">
                    <div className={`p-4 ${stat.bg} rounded-2xl`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h4 className="text-2xl font-black text-white tracking-tight">{stat.value}</h4>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                        <stat.icon className="w-24 h-24 text-white" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default IntelligenceMetrics;
