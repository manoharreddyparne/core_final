import React, { useState, useEffect } from 'react';
import {
    BookOpen, Layers, Building2, Users, School, Code, ExternalLink, Activity
} from 'lucide-react';
import { academicApiClient } from '../api/academicApi';
import toast from 'react-hot-toast';

export const AcademicHub = () => {
    const [activeTab, setActiveTab] = useState('departments');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'departments', label: 'Departments', icon: Building2, endpoint: 'departments/' },
        { id: 'programs', label: 'Programs', icon: School, endpoint: 'programs/' },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, endpoint: 'subjects/' },
        { id: 'enrollments', label: 'Enrollments', icon: Users, endpoint: 'enrollments/' },
    ];

    const fetchData = async (endpoint: string) => {
        setLoading(true);
        try {
            const res = await academicApiClient.get(endpoint);
            if (res.data.success) {
                setData(res.data.data);
            } else {
                setData(res.data); // sometimes it returns direct array if no success wrapper
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to load ${endpoint}`);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const tab = tabs.find(t => t.id === activeTab);
        if (tab) fetchData(tab.endpoint);
    }, [activeTab]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">
                    Academic <span className="text-primary italic">Hub</span>
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage institutional structure, curriculum, and enrollments.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/5 p-2 rounded-2xl glass border border-white/10 w-fit">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${isActive
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Display */}
            <div className="glass p-8 rounded-[2rem] border-white/5 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-primary animate-pulse">
                        <Activity className="w-12 h-12 mb-4" />
                        <p className="font-bold">Syncing Records...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <Layers className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-bold">No records found for {activeTab}.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.map((item: any) => (
                            <div key={item.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:border-primary/50 transition-all group">
                                <h3 className="text-xl font-black text-white mb-2 line-clamp-1">
                                    {item.name || item.title || item.code || item.label || item.roll_number}
                                </h3>

                                <div className="space-y-2 text-sm text-gray-400">
                                    {item.code && <p className="font-mono text-xs text-primary bg-primary/10 w-fit px-2 py-1 rounded-md">{item.code}</p>}
                                    {item.head_email && <p>HOD: {item.head_email}</p>}
                                    {item.degree_type && <p>Type: {item.degree_type}</p>}
                                    {item.duration_years && <p>Duration: {item.duration_years} Years</p>}
                                    {item.subject_type && <p>Type: {item.subject_type}</p>}
                                    {item.status && <p>Status: <span className="text-green-400">{item.status}</span></p>}
                                </div>

                                <div className="mt-6 flex gap-2">
                                    <button className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-white hover:bg-white/10 w-full">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AcademicHub;
