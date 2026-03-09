import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, XCircle, UserCheck, ClipboardList, BookOpen,
    Save, ChevronRight, Activity, Search, Filter, AlertTriangle, MoreVertical,
    FileText, Zap, Info
} from 'lucide-react';
import { academicApi } from '../api/academicApi';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';

export const FacultyAcademicWorkforce = () => {
    const { user } = useAuth();
    const [mode, setMode] = useState<'attendance' | 'marks'>('attendance');
    const [mySubjects, setMySubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Operational States (Pre-defined by Admin Core, localized by Faculty)
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState('LECTURE');
    const [topicCovered, setTopicCovered] = useState('');
    const [assessmentType, setAssessmentType] = useState('CIA1');
    const [maxMarks, setMaxMarks] = useState(25);
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
    const [marksRecords, setMarksRecords] = useState<Record<string, number>>({});

    const location = useLocation();

    useEffect(() => {
        const loadSubjects = async () => {
            try {
                const res = await academicApi.list('teacher-assignments');
                // 🧬 Robust Extraction: Handle Success Envelope or Raw Paginated/Array Response
                const rawData = res.data.success ? res.data.data : res.data;
                const data = Array.isArray(rawData) ? rawData : (rawData.results || []);
                
                setMySubjects(data);

                // Auto-select if passed from dashboard
                const stateSubjectId = location.state?.subject_id;
                if (stateSubjectId && data.length > 0) {
                    const match = data.find((s: any) => s.subject === stateSubjectId || s.id === stateSubjectId);
                    if (match) setSelectedSubject(match);
                }
            } catch (err) {
                toast.error("Registry access denied for assigned subjects");
            }
        };
        loadSubjects();
    }, [location.state]);

    // Sync Operational Defaults from Subject Definition
    useEffect(() => {
        if (selectedSubject) {
            setMaxMarks(selectedSubject.subject_max_marks || 25);
            fetchStudents(selectedSubject);
        }
    }, [selectedSubject]);

    const fetchStudents = async (subject: any) => {
        setLoading(true);
        try {
            const res = await academicApi.list('enrollments', { subject: subject.subject });
            // 🧬 Robust Extraction: Handle Success Envelope or Raw Paginated/Array Response
            const rawData = res.data.success ? res.data.data : res.data;
            const data = Array.isArray(rawData) ? rawData : (rawData.results || []);
            
            setStudents(data);

            const initialAttendance: Record<string, string> = {};
            const initialMarks: Record<string, number> = {};
            if (Array.isArray(data)) {
                data.forEach((s: any) => {
                    initialAttendance[s.roll_number] = 'PRESENT';
                    initialMarks[s.roll_number] = 0;
                });
            }
            setAttendanceRecords(initialAttendance);
            setMarksRecords(initialMarks);
        } catch (err) {
            toast.error("Failed to sync student registry");
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceSubmit = async () => {
        if (!selectedSubject) return;
        const payload = {
            subject_id: selectedSubject.subject,
            section_id: selectedSubject.section,
            semester_id: selectedSubject.semester,
            session_date: sessionDate,
            session_type: sessionType,
            topic_covered: topicCovered, // Newly added per Audit
            records: Object.entries(attendanceRecords).map(([roll, status]) => ({
                roll_number: roll,
                status: status
            }))
        };

        try {
            await academicApi.markAttendanceBulk(payload);
            toast.success("Attendance protocol synchronized to Ledger");
            setTopicCovered(''); // Reset after sync
        } catch (err) {
            toast.error("Attendance submission protocol failed");
        }
    };

    const handleMarksSubmit = async () => {
        if (!selectedSubject) return;
        const payload = {
            subject_id: selectedSubject.subject,
            semester_id: selectedSubject.semester,
            assessment_type: assessmentType,
            max_marks: maxMarks,
            records: Object.entries(marksRecords).map(([roll, marks]) => ({
                roll_number: roll,
                marks: marks
            }))
        };

        try {
            await academicApi.bulkEnterMarks(payload);
            toast.success("Academic performance records updated in Core");
        } catch (err) {
            toast.error("Performance entry failed authentication");
        }
    };

    return (
        <div className="space-y-10 max-w-[1200px] mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Faculty Control Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        Academic <span className="text-primary tracking-normal">Workforce</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-500 font-bold uppercase tracking-widest italic">
                            Operational Identity: {user?.full_name || 'Faculty Unit'}
                        </span>
                        {mode === 'attendance' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    </div>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
                    <button
                        onClick={() => setMode('attendance')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'attendance' ? 'bg-primary text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                    >
                        <UserCheck className="w-4 h-4 inline-block mr-2" /> Marking
                    </button>
                    <button
                        onClick={() => setMode('marks')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'marks' ? 'bg-primary text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Zap className="w-4 h-4 inline-block mr-2" /> Evaluation
                    </button>
                </div>
            </div>

            {/* Subject Selector Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mySubjects.map((sub: any) => (
                    <button
                        key={sub.id}
                        onClick={() => setSelectedSubject(sub)}
                        className={`p-6 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${selectedSubject?.id === sub.id
                            ? 'bg-primary/10 border-primary shadow-[0_0_50px_rgba(20,110,245,0.1)]'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                            }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-20 h-20" />
                        </div>
                        <h3 className="text-white font-black text-lg leading-tight uppercase tracking-tighter">{sub.subject_code}</h3>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{sub.section_label || 'Direct Assign'}</p>
                    </button>
                ))}
            </div>

            {selectedSubject ? (
                <div className="glass-modern rounded-[3.5rem] border border-white/5 p-10 space-y-10 relative overflow-hidden">
                    {/* Operation Metadata Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-10 border-b border-white/5">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{selectedSubject.subject_name}</h2>
                            <div className="flex flex-wrap gap-3">
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Credits: <span className="text-white ml-1">{selectedSubject.subject_credits || 'Core'}</span>
                                </div>
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Administrative Sem: {selectedSubject.semester_label || 'Current'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-6 rounded-[2rem] border border-white/5">
                            {mode === 'attendance' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Log Date</label>
                                        <input
                                            type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Type</label>
                                        <select
                                            value={sessionType} onChange={(e) => setSessionType(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:border-primary/50 appearance-none bg-black"
                                        >
                                            <option value="LECTURE">Lecture</option>
                                            <option value="LAB">Lab / Practical</option>
                                            <option value="TUTORIAL">Tutorial</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-1.5 mt-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2 italic">Curriculum Unit / Topic Covered</label>
                                        <input
                                            type="text" placeholder="e.g. Unit 3: Dynamic Programming Intro"
                                            value={topicCovered} onChange={(e) => setTopicCovered(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-gray-700 font-bold focus:outline-none focus:border-primary/50"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Evaluation Event</label>
                                        <select
                                            value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:border-primary/50 appearance-none bg-black"
                                        >
                                            <option value="CIA1">CIA 1</option>
                                            <option value="CIA2">CIA 2</option>
                                            <option value="MID">Mid-Term</option>
                                            <option value="ASSIGNMENT">Assignment</option>
                                            <option value="LAB">Lab Record</option>
                                            <option value="VIVA">Viva Voce</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Admin Max Marks</label>
                                        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-xs text-amber-500 font-black">
                                            {maxMarks} <span className="text-[8px] text-gray-600 font-bold ml-1 uppercase">Restricted</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Operational Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <th className="px-6 py-2">Identity</th>
                                    <th className="px-6 py-2">Roll Registry</th>
                                    <th className="px-6 py-2">Operational Record</th>
                                    <th className="px-6 py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-24 text-gray-600">
                                            <Activity className="w-12 h-12 mx-auto animate-spin mb-4 opacity-20" />
                                            <p className="font-black uppercase tracking-widest opacity-20 italic underline decoration-primary">Syncing Intelligence Matrix...</p>
                                        </td>
                                    </tr>
                                ) : (Array.isArray(students) ? students : []).map((s) => (
                                    <tr key={s.id} className="bg-white/5 hover:bg-white/[0.08] transition-all rounded-[1.5rem] overflow-hidden group">
                                        <td className="px-6 py-5 rounded-l-3xl">
                                            <p className="text-sm font-black text-white italic">{s.student_name}</p>
                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{s.status}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-mono text-primary font-bold opacity-60">#{s.roll_number}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {mode === 'attendance' ? (
                                                <div className="flex gap-1.5">
                                                    {['PRESENT', 'ABSENT', 'LATE', 'OD'].map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => setAttendanceRecords(prev => ({ ...prev, [s.roll_number]: status }))}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${attendanceRecords[s.roll_number] === status
                                                                ? (status === 'PRESENT' ? 'bg-green-500 text-white shadow-lg' : status === 'ABSENT' ? 'bg-red-500 text-white shadow-lg' : 'bg-amber-500 text-white shadow-lg')
                                                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        value={marksRecords[s.roll_number] || 0}
                                                        max={maxMarks}
                                                        onChange={(e) => setMarksRecords(prev => ({ ...prev, [s.roll_number]: Number(e.target.value) }))}
                                                        className="bg-black/40 border border-white/5 rounded-xl px-5 py-2 text-[11px] text-white font-black focus:outline-none focus:border-primary/50 w-24 tracking-tighter"
                                                    />
                                                    <span className="text-[10px] text-gray-600 font-black">/ {maxMarks} Units</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 rounded-r-3xl text-right">
                                            {attendanceRecords[s.roll_number] === 'PRESENT' ? (
                                                <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center ml-auto">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                </div>
                                            ) : attendanceRecords[s.roll_number] === 'ABSENT' ? (
                                                <div className="w-6 h-6 bg-red-500/10 rounded-full flex items-center justify-center ml-auto">
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center ml-auto">
                                                    <Info className="w-3.5 h-3.5 text-gray-700" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Sync Footer */}
                    <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{students.length} Registry Objects Synced</span>
                            </div>
                            <div className="flex gap-6 border-l border-white/10 pl-6">
                                <span className="text-[10px] font-bold text-green-500/60 uppercase">Operational: Ready</span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">{mode.toUpperCase()} MODE ACTIVE</span>
                            </div>
                        </div>

                        <button
                            onClick={mode === 'attendance' ? handleAttendanceSubmit : handleMarksSubmit}
                            className="bg-primary text-white px-12 py-5 rounded-[2rem] font-black flex items-center gap-3 shadow-[0_0_50px_rgba(20,110,245,0.4)] hover:scale-105 transition-all text-xs uppercase tracking-widest"
                        >
                            <Save className="w-5 h-5" />
                            Sync Core Ledger
                        </button>
                    </div>
                </div>
            ) : (
                <div className="glass-modern h-[500px] rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center text-gray-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/[0.01] animate-pulse" />
                    <AlertTriangle className="w-20 h-20 mb-6 opacity-5 rotate-12" />
                    <p className="text-xl font-bold uppercase tracking-widest opacity-20">Matrix Standby</p>
                    <p className="text-sm mt-2 opacity-20 italic">Select an authorized subject to initiate workforce operations.</p>
                </div>
            )}
        </div>
    );
};

export default FacultyAcademicWorkforce;
