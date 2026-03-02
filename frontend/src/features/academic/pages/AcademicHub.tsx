import React, { useState, useEffect } from 'react';
import {
    BookOpen, Layers, Building2, Users, School, Code, ExternalLink, Activity,
    Calendar, ListOrdered, UserPlus, PlusCircle, Pencil, Trash2, Filter, AlertCircle,
    ChevronRight, CheckCircle2, MoreVertical, Search, FileSpreadsheet, Database,
    ClipboardList, Lock, History, Settings, UploadCloud, X
} from 'lucide-react';
import { academicApi } from '../api/academicApi';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';
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

    // Bulk Enrollment State
    const [isBulkOpen, setIsBulkOpen] = useState(false);
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

    const getFieldsForTab = (tab: string) => {
        switch (tab) {
            case 'departments':
                return [
                    { name: 'name', label: 'Department Name', required: true, fullWidth: true },
                    { name: 'code', label: 'Code', required: true },
                    { name: 'head_email', label: 'HOD Email', type: 'email' },
                    { name: 'description', label: 'Description', type: 'textarea', fullWidth: true }
                ];
            case 'programs':
                return [
                    { name: 'department', label: 'Department ID', required: true },
                    { name: 'name', label: 'Program Name', required: true },
                    { name: 'code', label: 'Code', required: true },
                    { name: 'degree_type', label: 'Degree', type: 'select', options: [{ label: 'B.Tech', value: 'B.TECH' }, { label: 'MBA', value: 'MBA' }] },
                    { name: 'duration_years', label: 'Years', type: 'number' }
                ];
            case 'subjects':
                return [
                    { name: 'name', label: 'Subject Name', required: true, fullWidth: true },
                    { name: 'code', label: 'Code', required: true },
                    { name: 'department', label: 'Dept ID', required: true },
                    { name: 'program', label: 'Program ID', required: true },
                    { name: 'semester_number', label: 'Semester', type: 'number' },
                    { name: 'credits', label: 'Credits', type: 'number' },
                    { name: 'max_marks', label: 'Max Marks', type: 'number' },
                    { name: 'is_placement_relevant', label: 'Placement Relevant', type: 'checkbox' }
                ];
            case 'syllabus-units':
                return [
                    { name: 'subject', label: 'Subject ID', required: true },
                    { name: 'unit_number', label: 'Unit Group', type: 'number' },
                    { name: 'title', label: 'Unit Title', required: true, fullWidth: true },
                    { name: 'ai_question_weight', label: 'AI Weight', type: 'number' }
                ];
            default:
                return [{ name: 'name', label: 'Label', required: true }];
        }
    };

    const fetchData = async () => {
        const tab = tabs.find(t => t.id === activeTab);
        if (!tab) return;

        setLoading(true);
        try {
            const res = await academicApi.list(tab.endpoint);
            const raw = res.data.success ? res.data.data : res.data;
            setData(Array.isArray(raw) ? raw : []);
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
            toast.success('Blockchain entry synchronized');
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
        const studentLines = bulkEnrollData.rawStudents.split('\n').filter(l => l.trim());
        const students = studentLines.map(line => {
            const [roll, name] = line.split(',').map(s => s.trim());
            return { roll_number: roll, student_name: name || `Student ${roll}` };
        });

        if (!bulkEnrollData.subject_id || !bulkEnrollData.semester_id || students.length === 0) {
            toast.error('Incomplete bulk parameters');
            return;
        }

        try {
            await academicApi.bulkEnroll({
                subject_id: bulkEnrollData.subject_id,
                semester_id: bulkEnrollData.semester_id,
                section_id: bulkEnrollData.section_id,
                students: students
            });
            toast.success(`Bulk sync complete: ${students.length} units processed`);
            setIsBulkOpen(false);
            fetchData();
        } catch (err) {
            toast.error('Bulk sync failed');
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
            <div className="flex flex-wrap gap-2.5 bg-black/20 p-3 rounded-[3rem] border border-white/5 backdrop-blur-3xl overflow-x-auto custom-scrollbar no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-2xl scale-105'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 inline-block mr-2" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Audit Search */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder={`Audit search across ${activeTab} core database...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-3xl py-6 pl-14 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:ring-4 ring-primary/5 transition-all font-bold"
                />
            </div>

            {/* Registry Visualization */}
            <div className="glass-modern min-h-[600px] rounded-[4rem] border border-white/5 p-10 relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] -mr-80 -mt-80 pointer-events-none" />

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[500px]">
                        <Activity className="w-16 h-16 text-primary animate-spin opacity-40 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40">Synchronizing Matrix</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {data.filter(item => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())).map((item: any) => (
                            <div key={item.id} className="bg-white/5 border border-white/5 p-8 rounded-[3rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative">
                                {!isAdmin && <Lock className="absolute top-8 right-8 w-3.5 h-3.5 text-gray-700" />}

                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-5 h-5" })}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white italic tracking-tighter">
                                                {item.name || item.code || item.label || item.roll_number}
                                            </h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.status || 'Active'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        {item.program_name && <p className="text-[11px] text-gray-400 font-bold uppercase">Plan: <span className="text-white ml-2">{item.program_name}</span></p>}
                                        {item.subject_name && <p className="text-[11px] text-gray-400 font-bold uppercase">Subject: <span className="text-white ml-2">{item.subject_name}</span></p>}
                                        {item.employee_id && <p className="text-[11px] text-gray-400 font-bold uppercase">Faculty Log: <span className="text-white ml-2 italic">{item.employee_id}</span></p>}
                                        {item.created_at && <p className="text-[9px] text-gray-600 font-bold tracking-widest mt-4">RECORDED: {new Date(item.created_at).toLocaleString()}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-6 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                    {activeTab === 'subjects' && (
                                        <button
                                            onClick={() => { setActiveTab('syllabus-units'); setSearchQuery(item.code); }}
                                            className="px-6 py-3 bg-primary/10 text-primary rounded-2xl text-[10px] font-black hover:bg-primary hover:text-white transition-all uppercase tracking-widest"
                                        >
                                            Units
                                        </button>
                                    )}

                                    {isAdmin ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 rounded-2xl text-[10px] font-black text-white hover:bg-white/10 transition-colors uppercase tracking-widest"
                                            >
                                                Modify
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-3 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500 transition-all group/del"
                                            >
                                                <Trash2 className="w-4 h-4 group-hover/del:text-white" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 py-3 px-4 bg-white/5 rounded-2xl text-[9px] font-bold text-gray-600 uppercase tracking-widest italic">
                                            <Lock className="w-3 h-3" /> Core Lock
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Enrollment Modal */}
            {isBulkOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-10 shadow-[0_0_100px_rgba(20,110,245,0.1)]">
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
                                    <input type="text" value={bulkEnrollData.subject_id} onChange={e => setBulkEnrollData({ ...bulkEnrollData, subject_id: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none" placeholder="Target Subject" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Semester ID</label>
                                    <input type="text" value={bulkEnrollData.semester_id} onChange={e => setBulkEnrollData({ ...bulkEnrollData, semester_id: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none" placeholder="Active Semester" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Student List (CSV Format: roll_number, name)</label>
                                <textarea value={bulkEnrollData.rawStudents} onChange={e => setBulkEnrollData({ ...bulkEnrollData, rawStudents: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-3xl px-5 py-5 text-xs text-white placeholder:text-gray-800 font-bold focus:border-primary/50 outline-none min-h-[200px] resize-none" placeholder="ROLL001, John Doe&#10;ROLL002, Jane Smith" />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setIsBulkOpen(false)} className="flex-1 py-4 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Abort Operation</button>
                            <button onClick={handleBulkEnrollSync} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Execute Bulk Sync</button>
                        </div>
                    </div>
                </div>
            )}

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
