// src/features/placement/pages/PlacementHub.tsx
import React, { useEffect, useState } from 'react';
import { placementApi } from '../api';
import { PlacementDrive, PlacementApplication } from '../types';
import { RecruitmentFunnel } from '../components/RecruitmentFunnel';
import PlacementDriveCard from '../components/PlacementDriveCard';

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

    const handleApply = async (driveId: number, companyName: string) => {
        if (!window.confirm(`Are you certain you wish to initiate the recruitment sequence for ${companyName}? This will synchronize your official resume with the firm.`)) {
            return;
        }
        
        try {
            setApplying(driveId);
            // using a valid placeholder URL for now
            await placementApi.applyForDrive(driveId, "https://auip.edu/resumes/default.pdf");
            
            import('react-hot-toast').then(({ toast }) => {
                toast.success(`Application for ${companyName} integrated into system.`);
            });
            
            // refresh data
            await fetchData();
        } catch (error: any) {
            import('react-hot-toast').then(({ toast }) => {
                toast.error(error.response?.data?.message || "Failed to establish application.");
            });
        } finally {
            setApplying(null);
        }
    };

    const activeJourneys = Array.isArray(apps) ? apps.filter(a => !['APPLIED', 'PLACED', 'REJECTED'].includes(a.status)) : [];
    const openDrives = Array.isArray(drives) ? drives.filter(d => !apps?.find(a => (typeof a.drive === 'object' ? (a.drive as any).id : a.drive) === d.id)) : [];
    const appliedDrives = Array.isArray(apps) ? apps.filter(a => a.status === 'APPLIED') : [];
    const completedDrives = Array.isArray(apps) ? apps.filter(a => ['PLACED', 'REJECTED'].includes(a.status)) : [];

    if (loading) return <div className="text-white animate-pulse">Scanning recruitment database...</div>;

    return (
        <div className="space-y-16 animate-in fade-in duration-700 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div>
                <h1 className="text-5xl font-black text-white italic tracking-tighter">
                    Career <span className="text-primary">&</span> Placement Hub
                </h1>
                <p className="text-muted-foreground mt-4 font-medium max-w-2xl text-lg">
                    Real-time recruitment lifecycle tracking.
                </p>
            </div>

            {/* 1. My Active Journeys */}
            {activeJourneys.length > 0 && (
                <section className="space-y-8">
                    <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-widest">
                        <div className="w-12 h-1 bg-primary"></div>
                        My Active Journeys
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {activeJourneys.map(app => (
                            <div key={app.id} className="glass p-8 rounded-[3rem] space-y-4 hover:border-white/20 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">{app.drive_details.company_name}</h3>
                                        <p className="text-primary text-xs font-black uppercase tracking-widest">{app.drive_details.role}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-black text-primary border border-primary/20">
                                        IN PROGRESS
                                    </div>
                                </div>
                                <RecruitmentFunnel stages={app.stages} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 2. Open Drives */}
            <section className="space-y-8">
                <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-widest">
                    <div className="w-12 h-1 bg-green-500"></div>
                    Open Drives
                </h2>
                {openDrives.length === 0 ? (
                    <div className="glass p-12 rounded-[3.5rem] border-dashed text-center opacity-50">
                        No new drives available at this moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {openDrives.map(drive => (
                            <PlacementDriveCard 
                                key={drive.id}
                                drive={drive}
                                mode="student"
                                onApply={(id) => handleApply(id, drive.company_name)}
                                isApplying={applying === drive.id}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* 3. Applied Drives */}
            {appliedDrives.length > 0 && (
                <section className="space-y-8">
                    <h2 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-widest">
                        <div className="w-12 h-1 bg-blue-500"></div>
                        Applied Drives
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {appliedDrives.map(app => (
                            <PlacementDriveCard 
                                key={app.id}
                                drive={app.drive_details as any}
                                mode="student"
                                appStatus={app.status}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 4. Completed Drives */}
            {completedDrives.length > 0 && (
                <section className="space-y-8">
                    <h2 className="text-2xl font-black text-gray-400 flex items-center gap-4 uppercase tracking-widest">
                        <div className="w-12 h-1 bg-gray-600"></div>
                        Completed Drives
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 opacity-60 grayscale hover:grayscale-0 transition-grayscale duration-500">
                        {completedDrives.map(app => (
                            <PlacementDriveCard 
                                key={app.id}
                                drive={app.drive_details as any}
                                mode="student"
                                appStatus={app.status}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default PlacementHub;
