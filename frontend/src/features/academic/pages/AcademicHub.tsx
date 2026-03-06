import React, { useState, useEffect } from 'react';
import {
    BookOpen, Layers, Building2, Users, School, Code, ExternalLink, Activity,
    Calendar, ListOrdered, UserPlus, PlusCircle, Pencil, Trash2, Filter, AlertCircle,
    ChevronRight, CheckCircle2, MoreVertical, Search, FileSpreadsheet, Database,
    ClipboardList, Lock, History, Settings, UploadCloud, X, LayoutGrid, List as ListIcon
} from 'lucide-react';
import { academicApi } from '../api/academicApi';
import { instApiClient } from '../../auth/api/base';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
import { academicFormConfig } from '../config/fields';
import { AcademicFormModal } from '../components/AcademicFormModal';


export const AcademicHub = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'INST_ADMIN' || user?.role === 'INSTITUTION_ADMIN';
    const isFaculty = user?.role === 'FACULTY';

    const [activeTab, setActiveTab] = useState('departments');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Bulk Enrollment State
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isBulkSyncing, setIsBulkSyncing] = useState(false);
    const [bulkEnrollData, setBulkEnrollData] = useState({
        subject_id: '',
        semester_id: '',
        section_id: '',
        rawStudents: ''
    });

    const [stats, setStats] = useState({
        totalDepts: 0,
        totalPrograms: 0,
        totalStudents: 0
    });

    // Option Caches for Foreign Keys
    const [optionsCache, setOptionsCache] = useState<any>({
        programs: [],
        departments: [],
        academicYears: [],
        semesters: [],
        subjects: [],
        sections: [],
        faculty: []
    });

    // ESC Support for Bulk Modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsBulkOpen(false);
        };
        if (isBulkOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isBulkOpen]);

    const tabs = [
        { id: 'departments', label: 'Departments', icon: Building2, endpoint: 'departments' },
        { id: 'programs', label: 'Programs', icon: School, endpoint: 'programs' },
        { id: 'academic-years', label: 'Academic Years', icon: Calendar, endpoint: 'academic-years' },
        { id: 'semesters', label: 'Semesters', icon: ListOrdered, endpoint: 'semesters' },
        { id: 'subjects', label: 'Subjects', icon: BookOpen, endpoint: 'subjects' },
        { id: 'syllabus-units', label: 'Units (Syllabus)', icon: Database, endpoint: 'syllabus-units' },
        { id: 'sections', label: 'Sections', icon: Layers, endpoint: 'sections' },
        { id: 'teacher-assignments', label: 'Faculty Assignments', icon: UserPlus, endpoint: 'teacher-assignments' },
        { id: 'enrollments', label: 'Enrollments', icon: Users, endpoint: 'enrollments' },
        { id: 'attendance', label: 'Attendance Logs', icon: History, endpoint: 'attendance' },
        { id: 'marks', label: 'Performance Logs', icon: ClipboardList, endpoint: 'marks' },
        { id: 'courses', label: 'Legacy Courses', icon: Settings, endpoint: 'courses' },
        { id: 'batches', label: 'Legacy Batches', icon: Settings, endpoint: 'batches' },
    ];

    const fetchOptionCaches = async () => {
        try {
            const listParams = { params: { page_size: 500 } };
            const [progRes, deptRes, yearRes, semRes, subRes, secRes, facRes, stuRes] = await Promise.all([
                academicApi.list('programs', listParams),
                academicApi.list('departments', listParams),
                academicApi.list('academic-years', listParams),
                academicApi.list('semesters', listParams),
                academicApi.list('subjects', listParams),
                academicApi.list('sections', listParams),
                instApiClient.get('faculty/'), // Usually not paginated or handled separately
                instApiClient.get('students/', { params: { page_size: 2000 } })
            ]);

            const unwrap = (res: any) => {
                const raw = res.data.success ? res.data.data : res.data;
                return raw.results || (Array.isArray(raw) ? raw : []);
            };

            setOptionsCache({
                programs: unwrap(progRes).map((p: any) => ({ label: p.name, value: p.id })),
                departments: unwrap(deptRes).map((d: any) => ({ label: d.name, value: d.id })),
                academicYears: unwrap(yearRes).map((y: any) => ({ label: y.label, value: y.id })),
                semesters: unwrap(semRes).map((s: any) => ({ label: s.label || `${s.program__code || ''} Sem${s.semester_number}`, value: s.id })),
                subjects: unwrap(subRes).map((s: any) => ({ label: `${s.code} - ${s.name}`, value: s.id })),
                sections: unwrap(secRes).map((s: any) => ({ label: `${s.name} (${s.program_name || ''})`, value: s.id, original: s })),
                faculty: unwrap(facRes).map((f: any) => ({ label: `${f.full_name} (${f.employee_id})`, value: f.employee_id, original: f })),
                students: unwrap(stuRes)
                    .filter((s: any) => s.roll_number)
                    .map((s: any) => ({
                        label: `${s.full_name} (${s.roll_number})`.trim(),
                        value: s.roll_number,
                        original: s
                    }))
            });
        } catch (e) {
            console.error("Option cache pre-fetch failed", e);
        }
    };

    useEffect(() => {
        fetchOptionCaches();
    }, []);

    const getFieldsForTab = (tab: string) => {
        const baseFields = academicFormConfig[tab] || [{ name: 'name', label: 'Label', required: true }];

        // Inject options dynamically
        return baseFields.map(field => {
            if (field.name === 'program') return { ...field, type: 'select', options: optionsCache.programs };
            if (field.name === 'department') return { ...field, type: 'select', options: optionsCache.departments };
            if (field.name === 'academic_year') return { ...field, type: 'select', options: optionsCache.academicYears };
            if (field.name === 'semester') return { ...field, type: 'select', options: optionsCache.semesters };
            if (field.name === 'subject') return { ...field, type: 'select', options: optionsCache.subjects };
            if (field.name === 'section') return { ...field, type: 'select', options: optionsCache.sections };
            if (field.name === 'employee_id') return { ...field, type: 'select', options: optionsCache.faculty };
            if (field.name === 'roll_number') return { ...field, type: 'select', options: optionsCache.students };
            return field;
        });
    };

    const fetchData = async () => {

        const tab = tabs.find(t => t.id === activeTab);
        if (!tab) return;

        setLoading(true);
        try {
            const res = await academicApi.list(tab.endpoint);
            // Handle both {success, data} wrapper and direct DRF pagination {results}
            const raw = res.data.success ? res.data.data : res.data;
            const finalData = raw.results ? raw.results : (Array.isArray(raw) ? raw : []);
            setData(finalData);
        } catch (err: any) {
            toast.error(`Sync protocol failed for ${tab.label}`);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleSave = async (formData: any) => {
        const tab = tabs.find(t => t.id === activeTab);
        try {
            if (selectedItem) {
                await academicApi.update(tab!.endpoint, selectedItem.id, formData);
            } else {
                await academicApi.create(tab!.endpoint, formData);
            }
            setIsModalOpen(false);
            fetchData();
            fetchOptionCaches(); // Refresh caches if needed
            toast.success('Core registry synchronized');
        } catch (err) {
            toast.error('Data rejection by CORE protocol');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Execute destructive purge? Core integrity will be updated.')) return;
        try {
            const tab = tabs.find(t => t.id === activeTab);
            await academicApi.delete(tab!.endpoint, id);
            fetchData();
            toast.success('Registry record purged');
        } catch (err) {
            toast.error('Deletion protocol intercepted');
        }
    };

    const handleBulkEnrollSync = async () => {
        let studentsToEnroll: any[] = [];

        if (bulkEnrollData.section_id) {
            // Find the chosen section's name (e.g., "A") since the DB expects the string name in StudentAcademicRegistry
            const targetSection = optionsCache.sections.find((sec: any) => sec.value == bulkEnrollData.section_id);
            if (!targetSection) {
                toast.error('Invalid Section');
                return;
            }

            const sectionName = targetSection.original.name;
            studentsToEnroll = optionsCache.students
                .filter((s: any) => s.original.section === sectionName || s.original.section_name === sectionName)
                .map((s: any) => ({
                    roll_number: s.value,
                    student_name: s.original.full_name
                }));
        }

        if (!bulkEnrollData.subject_id || !bulkEnrollData.semester_id || studentsToEnroll.length === 0) {
            toast.error(studentsToEnroll.length === 0 ? 'No students assigned to this section' : 'Incomplete parameters');
            return;
        }

        try {
            setIsBulkSyncing(true);
            await academicApi.bulkEnroll({
                subject_id: bulkEnrollData.subject_id,
                semester_id: bulkEnrollData.semester_id,
                section_id: bulkEnrollData.section_id,
                students: studentsToEnroll
            });
            toast.success(`Bulk sync complete: ${studentsToEnroll.length} units processed`);
            setIsBulkOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error('Bulk sync failed');
        } finally {
            setIsBulkSyncing(false);
        }
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Governance Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black text-white tracking-tighter">
                        Academic <span className="text-primary italic">Brain</span>
                    </h1>
                    <p className="text-muted-foreground text-sm uppercase font-black tracking-widest flex items-center gap-2">
                        Institutional Governance Logic — {activeTab}
                    </p>
                </div>

                {isAdmin && (
                    <div className="flex gap-3">
                        {activeTab === 'enrollments' && (
                            <button
                                onClick={() => setIsBulkOpen(true)}
                                className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-3 hover:bg-white/10 transition-all text-xs uppercase tracking-widest"
                            >
                                <UploadCloud className="w-5 h-5 text-primary" /> Bulk Registry Sync
                            </button>
                        )}
                        <button
                            onClick={handleCreate}
                            className="bg-primary text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-3 shadow-[0_0_50px_rgba(20,110,245,0.3)] hover:scale-105 transition-all text-xs uppercase tracking-widest"
                        >
                            <PlusCircle className="w-5 h-5" /> Load {activeTab.slice(0, -1)}
                        </button>
                    </div>
                )}
            </div>

            {/* Global Matrix Navigation */}
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-[2rem] border border-white/5 backdrop-blur-3xl overflow-x-auto custom-scrollbar no-scrollbar w-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* View Mode & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={`Audit search across ${activeTab} core database...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-3xl py-6 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:ring-4 ring-primary/5 transition-all font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-4 rounded-3xl border transition-all ${viewMode === 'grid' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-4 rounded-3xl border transition-all ${viewMode === 'list' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Registry Visualization */}
            <div className="glass-modern min-h-[500px] rounded-[2rem] md:rounded-[3rem] border border-white/5 p-6 md:p-10 relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] -mr-80 -mt-80 pointer-events-none" />

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[500px]">
                        <Activity className="w-16 h-16 text-primary animate-spin opacity-40 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40">Synchronizing Matrix</span>
                    </div>
                ) : (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {data.filter(item => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())).map((item: any) => (
                                <div key={item.id} className="bg-white/5 border border-white/5 p-6 md:p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative flex flex-col">
                                    {!isAdmin && <Lock className="absolute top-6 right-6 w-3.5 h-3.5 text-gray-700" />}

                                    <div className="space-y-4 mb-8 flex-1 min-w-0">
                                        <div className="flex flex-col gap-3 items-start">
                                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                                                {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-5 h-5" })}
                                            </div>
                                            <div className="min-w-0 w-full">
                                                <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tighter truncate w-full" title={item.name || item.code || item.label || item.roll_number || item.student_name || item.faculty_name}>
                                                    {item.name || item.code || item.label || item.roll_number || item.student_name || item.faculty_name}
                                                </h3>
                                                {item.roll_number && <p className="text-[10px] text-primary/70 font-black uppercase tracking-[0.2em] mt-1">{item.roll_number}</p>}
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 truncate ${item.status === 'ACTIVE' ? 'text-green-500/60' : item.status ? 'text-red-500/60' : 'text-gray-500'}`}>{item.status || 'Active'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 min-w-0">
                                            {item.program_name && <p className="text-[11px] text-gray-400 font-bold uppercase truncate">Plan: <span className="text-white ml-2">{item.program_name}</span></p>}
                                            {item.subject_name && <p className="text-[11px] text-gray-400 font-bold uppercase truncate">Subject: <span className="text-white ml-2">{item.subject_name}</span></p>}
                                            {item.employee_id && <p className="text-[11px] text-gray-400 font-bold uppercase truncate">Faculty Log: <span className="text-white ml-2 italic">{item.employee_id}</span></p>}
                                            {item.created_at && <p className="text-[9px] text-gray-600 font-bold tracking-widest mt-4 truncate">RECORDED: {new Date(item.created_at).toLocaleString()}</p>}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shrink-0">
                                        {activeTab === 'subjects' && (
                                            <button
                                                onClick={() => { setActiveTab('syllabus-units'); setSearchQuery(item.code); }}
                                                className="px-6 py-3 bg-primary/10 text-primary rounded-xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-widest whitespace-nowrap"
                                            >
                                                Units
                                            </button>
                                        )}

                                        {isAdmin ? (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/5 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-colors uppercase tracking-widest whitespace-nowrap"
                                                >
                                                    Modify
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 transition-all group/del shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4 group-hover/del:text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 py-3 px-4 bg-white/5 rounded-xl text-[9px] font-bold text-gray-600 uppercase tracking-widest italic whitespace-nowrap">
                                                <Lock className="w-3 h-3" /> Core Lock
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {data.filter(item => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())).map((item: any) => (
                                <div key={item.id} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                                            {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-6 h-6" })}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xl md:text-xl font-black text-white italic tracking-tighter truncate" title={item.name || item.code || item.label || item.roll_number || item.student_name || item.faculty_name}>
                                                {item.name || item.code || item.label || item.roll_number || item.student_name || item.faculty_name}
                                            </h3>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{item.status || 'Active'}</p>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-wrap items-center gap-4 flex-[1.5]">
                                        {item.roll_number && <p className="text-[10px] text-primary font-black uppercase tracking-widest border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-lg">{item.roll_number}</p>}
                                        {item.program_name && <p className="text-[10px] text-gray-400 font-bold uppercase truncate border border-white/10 px-3 py-1.5 rounded-lg"><span className="text-white">{item.program_name}</span></p>}
                                        {item.subject_name && <p className="text-[10px] text-gray-400 font-bold uppercase truncate border border-white/10 px-3 py-1.5 rounded-lg"><span className="text-white">{item.subject_name}</span></p>}
                                        {item.employee_id && <p className="text-[10px] text-gray-400 font-bold uppercase truncate border border-white/10 px-3 py-1.5 rounded-lg"><span className="text-white italic">{item.employee_id}</span></p>}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {activeTab === 'subjects' && (
                                            <button onClick={() => { setActiveTab('syllabus-units'); setSearchQuery(item.code); }} className="px-5 py-3 bg-primary/10 text-primary rounded-xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-widest mr-2">Units</button>
                                        )}
                                        {isAdmin ? (
                                            <>
                                                <button onClick={() => handleEdit(item)} className="p-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"><Pencil className="w-5 h-5" /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                                            </>
                                        ) : <Lock className="w-5 h-5 text-gray-600 px-3" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Bulk Enrollment Modal */}
            {isBulkOpen && (() => {
                const previewStudents = bulkEnrollData.section_id ? (() => {
                    const targetSection = optionsCache.sections.find((sec: any) => sec.value == bulkEnrollData.section_id);
                    if (!targetSection) return [];
                    const sectionName = targetSection.original.name;
                    return optionsCache.students.filter((s: any) => s.original.section === sectionName || s.original.section_name === sectionName);
                })() : [];

                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        {/* Ultra-light translucent backdrop */}
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" onClick={() => setIsBulkOpen(false)} />
                        <div className="relative bg-[#0c0c0e]/80 backdrop-blur-md border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-10 shadow-[0_0_120px_rgba(20,110,245,0.15)] animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Bulk Registry Sync</h2>
                                    <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] mt-1">Multi-Unit Enrollment Operation</p>
                                </div>
                                <button onClick={() => setIsBulkOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl text-gray-600 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Subject ID</label>
                                        <select
                                            value={bulkEnrollData.subject_id} onChange={e => setBulkEnrollData({ ...bulkEnrollData, subject_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none appearance-none"
                                        >
                                            <option value="" className="bg-black">Select Target Subject</option>
                                            {optionsCache.subjects.map((s: any) => <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Semester ID</label>
                                        <select
                                            value={bulkEnrollData.semester_id} onChange={e => setBulkEnrollData({ ...bulkEnrollData, semester_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none appearance-none"
                                        >
                                            <option value="" className="bg-black">Select Active Semester</option>
                                            {optionsCache.semesters.map((s: any) => <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5 p-6 border border-primary/20 bg-primary/5 rounded-3xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Layers className="w-5 h-5 text-primary" />
                                        <div>
                                            <label className="text-[11px] font-black text-white uppercase tracking-widest">Section Auto-Mapper</label>
                                            <p className="text-[9px] text-gray-500 font-bold mt-1">Select a section to automatically aggregate and enroll all its students.</p>
                                        </div>
                                    </div>
                                    <select
                                        value={bulkEnrollData.section_id} onChange={e => setBulkEnrollData({ ...bulkEnrollData, section_id: e.target.value })}
                                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none appearance-none cursor-pointer hover:bg-white/[0.15] transition-all"
                                    >
                                        <option value="" className="bg-black text-gray-500">Pick Section to extract students...</option>
                                        {optionsCache.sections.map((s: any) => <option key={s.value} value={s.value} className="bg-black text-white">{s.label}</option>)}
                                    </select>
                                </div>

                                {/* Preview Students Display */}
                                {previewStudents.length > 0 && (
                                    <div className="max-h-[160px] overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-2xl bg-black/50 p-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex justify-between items-center">
                                            Discovery Preview <span className="bg-primary/20 text-primary px-3 py-1 rounded-full">{previewStudents.length} Assigned Elements</span>
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {previewStudents.slice(0, 40).map((ps: any, idx: number) => (
                                                <div key={idx} className="bg-white/5 p-2 rounded-lg flex justify-between items-center px-4">
                                                    <span className="text-[10px] font-bold text-white uppercase truncate mr-2" title={ps.original.full_name}>{ps.original.full_name}</span>
                                                    <span className="text-[9px] font-black text-gray-500 tracking-widest">{ps.value}</span>
                                                </div>
                                            ))}
                                            {previewStudents.length > 40 && (
                                                <div className="bg-white/5 p-2 rounded-lg flex justify-center items-center px-4 col-span-2">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">+ {previewStudents.length - 40} ADDITIONAL ELEMENTS HIDDEN</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setIsBulkOpen(false)} disabled={isBulkSyncing} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${isBulkSyncing ? 'text-gray-700' : 'text-gray-500 hover:text-white'}`}>Abort Operation</button>
                                <button
                                    onClick={handleBulkEnrollSync}
                                    disabled={isBulkSyncing}
                                    className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-2 ${isBulkSyncing ? 'bg-primary/50 text-white/50 cursor-not-allowed' : 'bg-primary text-white shadow-[0_0_50px_rgba(20,110,245,0.4)] hover:scale-105'}`}
                                >
                                    {isBulkSyncing ? <><Activity className="w-4 h-4 animate-spin" /> SYNCHRONIZING...</> : "Execute Bulk Sync"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <AcademicFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                activeTab={activeTab}
                initialData={selectedItem}
                formDataFields={getFieldsForTab(activeTab)}
            />
        </div>
    );
};

export default AcademicHub;
