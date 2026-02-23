// src/features/placement/pages/PlacementHub.tsx
import React, { useEffect, useState } from 'react';
import { placementApi } from '../api';
import { PlacementDrive, PlacementApplication } from '../types';
import { RecruitmentFunnel } from '../components/RecruitmentFunnel';

const PlacementHub: React.FC = () => {
    const [drives, setDrives] = useState<PlacementDrive[]>([]);
    const [apps, setApps] = useState<PlacementApplication[]>([]);
    const [loading, setLoading] = useState(true);

    const [applying, setApplying] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            const [d, a] = await Promise.all([
                placementApi.getEligibleDrives(),
                placementApi.getApplications()
            ]);
            setDrives(d);
            setApps(a);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApply = async (driveId: number) => {
        try {
            setApplying(driveId);
            // using empty resume string for now, will integrate Resume Builder later
            await placementApi.applyForDrive(driveId, "default_resume.pdf");
            // refresh data
            await fetchData();
            // Need to import toast at top if not there
            // toast.success("Applied successfully!");
        } catch (error: any) {
            // error could be deadline passed etc.
            alert(error.response?.data?.message || "Failed to apply");
        } finally {
            setApplying(null);
        }
    };

    if (loading) return <div className="text-white animate-pulse">Scanning recruitment database...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-white italic underline decoration-primary/50 decoration-4 underline-offset-8">
                    Career & Placement Hub
                </h1>
                <p className="text-muted-foreground mt-6 font-medium max-w-2xl">
                    Track your recruitment lifecycle from initial eligibility to the final offer.
                    All processes are monitored by the Governance Brain.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Active Applications & Funnels */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-primary rounded-full"></div>
                        My Active Journeys
                    </h2>

                    {apps.length === 0 ? (
                        <div className="glass p-12 rounded-[3rem] text-center border-dashed border-white/10">
                            <p className="text-muted-foreground">You haven't applied to any drives yet.</p>
                            <button className="mt-4 text-primary font-bold text-sm underline">Explore eligible opportunities</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {apps.map(app => (
                                <div key={app.id} className="glass p-8 rounded-[3rem] space-y-4 hover:border-white/10 transition-all">
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">{app.drive_details.company_name}</h3>
                                        <p className="text-primary text-xs font-black uppercase tracking-wider">{app.drive_details.role}</p>
                                    </div>
                                    <RecruitmentFunnel stages={app.stages} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: New Opportunities */}
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-2 h-8 bg-green-400 rounded-full"></div>
                        Open Drives
                    </h2>
                    <div className="space-y-4">
                        {drives.map(drive => (
                            <div key={drive.id} className="glass group p-6 rounded-[2.5rem] border-white/5 hover:bg-white/5 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-white">{drive.company_name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-bold">{drive.location}</p>
                                    </div>
                                    <div className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded uppercase">
                                        {drive.package_details}
                                    </div>
                                </div>

                                <p className="text-xs text-blue-100/60 line-clamp-2 mb-4">
                                    {drive.job_description}
                                </p>

                                <button
                                    onClick={() => handleApply(drive.id as number)}
                                    disabled={applying === drive.id}
                                    className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black text-white hover:bg-primary hover:border-primary transition-all group-hover:shadow-lg group-hover:shadow-primary/20 disabled:opacity-50"
                                >
                                    {applying === drive.id ? "APPLYING..." : "APPLY NOW"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlacementHub;
