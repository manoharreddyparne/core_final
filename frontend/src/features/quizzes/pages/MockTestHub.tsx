// src/features/quizzes/pages/MockTestHub.tsx
// Sprint 8 — Unified Exam Engine (Mock Tests & Online Exams)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Brain, Clock, Lock, CheckCircle2, XCircle, AlertTriangle,
    Trophy, BarChart3, ArrowRight, ArrowLeft, Maximize2, Shield,
    Play, Timer, Star, Zap
} from 'lucide-react';
import { coreApiClient } from '../../auth/api/base';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthProvider/AuthProvider';

interface Option {
    id: number;
    text: string;
}

interface Question {
    id: number;
    text: string;
    question_type: string;
    marks?: number;
    options: Option[];
}

interface ExamMapping {
    id: number;
    question: Question;
    marks_override: number;
    order: number;
}

interface Exam {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    questions_count: number;
    anti_cheat_enabled: boolean;
    is_mock: boolean;
    total_marks: number;
    mappings?: ExamMapping[];
}


interface QuizResult {
    score: number;
    total_marks: number;
    percentage: number;
    correct: number;
    wrong: number;
    time_taken: string;
}

type QuizPhase = 'LIST' | 'BRIEF' | 'ACTIVE' | 'RESULT';

const MockTestHub: React.FC = () => {
    const [phase, setPhase] = useState<QuizPhase>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<ExamMapping[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [attemptId, setAttemptId] = useState<string | null>(null);

    // Anti-cheat
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        setLoading(true);
        try {
            // Fetch exams (both mock and real based on user context)
            const res = await coreApiClient.get('exams/exam_definitions/');

            const data = res.data?.results || res.data?.data || res.data || [];
            setExams(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Exam fetch failed', err);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    // Anti-cheat tracking
    useEffect(() => {
        if (phase !== 'ACTIVE') return;
        const handleVisibility = () => {
            if (document.hidden) {
                const newCount = tabSwitchCount + 1;
                setTabSwitchCount(newCount);
                setWarningCount(prev => prev + 1);
                
                // Log to server
                if (attemptId) {
                    coreApiClient.post(`exams/exam_attempts/${attemptId}/log_violation/`, {
                        event_type: 'TAB_SWITCH',
                        details: { count: newCount, source: 'visibilitychange' }
                    });
                }

                toast.error(`⚠️ Tab switch detected (${newCount}). This is recorded.`, { duration: 3000 });
                if (newCount >= 10) { // More lenient for mock tests but still tracked
                    toast.error('🚨 Serious warning: Repeated tab switching recorded.', { duration: 4000 });
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [phase, tabSwitchCount, attemptId]);

    // Timer countdown
    useEffect(() => {
        if (phase !== 'ACTIVE' || timeLeft <= 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    toast.error('⏰ Time up! Auto-submitting...', { duration: 3000 });
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const enterFullscreen = () => {
        document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => { });
    };

    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.role?.toLowerCase();
    const isManager = ['faculty', 'teacher', 'admin', 'institution_admin', 'inst_admin'].includes(role || '');

    const handleStartExam = async (exam: Exam) => {
        navigate(`/exam-portal/${exam.id}`);
    };

    const handleGenerateAI = async (exam: Exam) => {
        const tid = toast.loading('AI Architect is designing questions...');
        try {
            await coreApiClient.post(`exams/${exam.id}/generate-ai-questions/`, {
                topic: exam.title,
                count: 5,
                type: 'MCQ'
            });
            toast.success('Neural mapping complete. Questions generated.', { id: tid });
            fetchExams();
        } catch (err) {
            toast.error('AI Architect busy. Try again later.', { id: tid });
        }
    };

    const handleBeginTest = async () => {
        if (!selectedExam) return;
        const tid = toast.loading('Initializing secure exam environment...');
        try {
            // Start attempt
            const res = await coreApiClient.post('exams/exam_attempts/', {
                exam: selectedExam.id
            });
            const attemptData = res.data;
            setAttemptId(attemptData.id);

            // Fetch questions (now included in exam_details mapping)
            const mappings = attemptData.exam_details?.mappings || [];
            setQuestions(mappings);
            setCurrentQ(0);
            setAnswers({});
            setTimeLeft(selectedExam.duration_minutes * 60);
            startTimeRef.current = Date.now();
            setTabSwitchCount(0);
            setWarningCount(0);
            setPhase('ACTIVE');
            if (selectedExam.anti_cheat_enabled) enterFullscreen();
            toast.success('Secure session established.', { id: tid });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to start exam', { id: tid });
        }
    };

    const saveAnswer = async (mappingId: number, answerData: { option_ids?: number[], text_answer?: string }) => {
        try {
            await coreApiClient.post(`exams/exam_attempts/${attemptId}/submit_answer/`, {
                question_id: mappingId,
                ...answerData
            });
        } catch (err) {
            console.error('Failed to save answer', err);
        }
    };

    const handleSubmit = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);

        const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

        try {
            const res = await coreApiClient.post(`exams/exam_attempts/${attemptId}/finish/`);
            const data = res.data;
            setResult({
                score: data?.score || 0,
                total_marks: selectedExam?.total_marks || 100,
                percentage: ((data?.score || 0) / (selectedExam?.total_marks || 100)) * 100,
                correct: 0, // Server handles detailed metrics
                wrong: 0,
                time_taken: `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`
            });
            setPhase('RESULT');
            if (document.fullscreenElement) document.exitFullscreen?.();
            toast.success('Exam submitted successfully.');
        } catch (err: any) {
            toast.error('Submission failed. Contact admin.');
        } finally {
            setSubmitting(false);
        }
    }, [submitting, attemptId, selectedExam]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // UI Renders (similar to previous version but updated for new types)
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Synchronizing Neural Workspace...</p>
        </div>
    );

    if (phase === 'LIST') return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                    <Brain className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Exam <span className="text-primary not-italic">Infrastructure</span>
                    </h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">
                        Mock Tests & Official Assessments
                    </p>
                </div>
            </div>

            {exams.length === 0 ? (
                <div className="glass p-20 rounded-[3rem] border-white/5 text-center space-y-4">
                    <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Active Sessions</h3>
                    <p className="text-muted-foreground font-medium max-w-sm mx-auto">You have no scheduled exams or mock tests at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.id} className="glass p-8 rounded-[2.5rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-between">
                            <div className="relative space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className={`w-12 h-12 rounded-2xl ${exam.is_mock ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'} flex items-center justify-center`}>
                                        <Play className="w-6 h-6" />
                                    </div>
                                    {exam.anti_cheat_enabled && (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Secure
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{exam.title}</h3>
                                    <p className="text-muted-foreground text-xs mt-1 font-medium line-clamp-2">{exam.description}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{exam.duration_minutes}m</span>
                                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-primary" />{exam.questions_count} Qs</span>
                                    <span className={`px-2 py-0.5 rounded-md ${exam.is_mock ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {exam.is_mock ? 'Mock' : 'Exam'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => handleStartExam(exam)}
                                    className={`flex-1 py-4 ${exam.is_mock ? 'bg-primary' : 'bg-red-600'} text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2`}
                                >
                                    Launch Portal
                                </button>
                                {isManager && (
                                    <button
                                        onClick={() => handleGenerateAI(exam)}
                                        className="w-14 h-14 bg-white/5 border border-white/10 text-primary rounded-2xl hover:bg-primary/20 transition-all flex items-center justify-center group"
                                        title="Generate AI Questions"
                                    >
                                        <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (phase === 'BRIEF' && selectedExam) return (
        <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500">
            <div className="glass p-12 rounded-[3.5rem] border-white/10 space-y-10">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto">
                        <Lock className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{selectedExam.title}</h2>
                    <p className="text-muted-foreground text-sm font-medium">{selectedExam.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Timeline', value: `${selectedExam.duration_minutes} Mins`, icon: Clock },
                        { label: 'Questions', value: `${selectedExam.questions_count} Sets`, icon: BarChart3 },
                        { label: 'Anti-Cheat', value: selectedExam.anti_cheat_enabled ? 'Active' : 'Disabled', icon: Shield },
                        { label: 'Auto-Submit', value: 'Enabled', icon: Timer },
                    ].map((info, i) => (
                        <div key={i} className="glass p-5 rounded-2xl border-white/5 flex items-center gap-4">
                            <info.icon className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{info.label}</p>
                                <p className="text-sm font-black text-white uppercase">{info.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Policy Compliance
                    </p>
                    <ul className="space-y-2 text-xs text-gray-400 font-medium leading-relaxed">
                        <li>• Tab switches are logged and analyzed by the Governance Brain.</li>
                        <li>• Session auto-terminates upon timer exhaustion.</li>
                        <li>• Screen recording and fullscreen enforcement active.</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setPhase('LIST')} className="flex-1 py-4 glass border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">
                        Abort
                    </button>
                    <button onClick={handleBeginTest} className="flex-1 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all flex items-center justify-center gap-2">
                        Initialize Secure Session
                    </button>
                </div>
            </div>
        </div>
    );

    if (phase === 'ACTIVE' && questions.length > 0) {
        const mapping = questions[currentQ];
        const q = mapping.question;
        const progress = ((currentQ + 1) / questions.length) * 100;
        const isLowTime = timeLeft < 60;

        return (
            <div className="max-w-4xl mx-auto py-8 space-y-6 animate-in fade-in duration-300">
                <div className="glass p-6 rounded-3xl border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Question Status</p>
                            <p className="text-lg font-black text-white italic uppercase tracking-tighter">{currentQ + 1} <span className="text-xs not-italic text-muted-foreground">/ {questions.length}</span></p>
                        </div>
                        <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-2xl tracking-tighter ${isLowTime ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' : 'glass border-white/10 text-white shadow-xl'}`}>
                        <Clock className={`w-6 h-6 ${isLowTime ? 'animate-spin-slow' : ''}`} />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="glass p-12 rounded-[3.5rem] border-white/10 space-y-10">
                    <div className="flex items-start gap-6">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-black shrink-0 shadow-lg">
                            {currentQ + 1}
                        </div>
                        <p className="text-xl font-bold text-white leading-relaxed tracking-tight">{q.text}</p>
                    </div>

                    <div className="space-y-4">
                        {q.question_type === 'MCQ' || q.question_type === 'MULTI_SELECT' ? (
                            q.options.map((opt: Option) => {
                                const isSelected = answers[mapping.id]?.includes?.(opt.id) || answers[mapping.id] === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => {
                                            if (q.question_type === 'MCQ') {
                                                const newAnswers = { ...answers, [mapping.id]: opt.id };
                                                setAnswers(newAnswers);
                                                saveAnswer(mapping.id, { option_ids: [opt.id] });
                                            } else {
                                                const currentOptions = answers[mapping.id] || [];
                                                const newOptions = currentOptions.includes(opt.id) 
                                                    ? currentOptions.filter((id: number) => id !== opt.id)
                                                    : [...currentOptions, opt.id];
                                                setAnswers({ ...answers, [mapping.id]: newOptions });
                                                saveAnswer(mapping.id, { option_ids: newOptions });
                                            }
                                        }}
                                        className={`w-full text-left p-6 rounded-[1.5rem] border transition-all duration-300 font-bold text-sm flex items-center justify-between group ${isSelected
                                            ? 'bg-primary/20 border-primary text-white shadow-2xl shadow-primary/20'
                                            : 'glass border-white/5 text-gray-400 hover:bg-white/[0.08] hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary scale-110 shadow-lg shadow-primary/30' : 'border-white/10 group-hover:border-primary/50'}`}>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            </div>
                                            {opt.text}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <textarea
                                value={answers[mapping.id] || ''}
                                onChange={e => {
                                    setAnswers({ ...answers, [mapping.id]: e.target.value });
                                }}
                                onBlur={e => saveAnswer(mapping.id, { text_answer: e.target.value })}
                                placeholder="Precision response required..."
                                className="w-full bg-white/5 border border-white/10 text-white rounded-[2rem] p-8 text-sm font-medium min-h-[160px] outline-none focus:border-primary transition-all resize-none shadow-inner"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <button
                            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                            disabled={currentQ === 0}
                            className="px-8 py-4 glass border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all disabled:opacity-20 flex items-center gap-3"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>

                        {currentQ < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQ(currentQ + 1)}
                                className="px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3"
                            >
                                Forward <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-12 py-4 bg-green-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-green-600/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? 'Encrypting...' : <>Complete Session <CheckCircle2 className="w-4 h-4" /></>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'RESULT' && result) {
        const passed = result.percentage >= 50;
        return (
            <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
                <div className="glass p-12 rounded-[4rem] border-white/10 space-y-10 text-center relative overflow-hidden">
                    <div className={`absolute top-0 inset-x-0 h-2 ${passed ? 'bg-green-500' : 'bg-red-500'}`} />
                    
                    <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${passed ? 'bg-green-500/20 shadow-green-500/20' : 'bg-red-500/20 shadow-red-500/20'}`}>
                        {passed ? <Trophy className="w-12 h-12 text-green-400" /> : <XCircle className="w-12 h-12 text-red-400" />}
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                            {passed ? 'Assessment Success' : 'Session Terminated'}
                        </h2>
                        <p className="text-muted-foreground font-medium text-sm">
                            {passed ? 'System verification complete. Achievements recorded.' : 'Benchmark not reached. Analysis required.'}
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-10 bg-white/5 border border-white/5 rounded-full w-48 h-48 mx-auto shadow-2xl border-t-primary/20">
                        <p className="text-5xl font-black text-white italic tracking-tighter leading-none">{Math.round(result.percentage)}%</p>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-2">Aggregate</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-6 rounded-3xl border-white/5">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Raw Score</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{result.score} <span className="text-xs not-italic text-muted-foreground">/ {result.total_marks}</span></p>
                        </div>
                        <div className="glass p-6 rounded-3xl border-white/5">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Timeline</p>
                            <p className="text-2xl font-black text-primary italic tracking-tighter">{result.time_taken}</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => { setPhase('LIST'); setSelectedExam(null); setResult(null); }} className="flex-1 py-4 glass border-white/5 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">
                            Exit Portal
                        </button>
                        <button onClick={() => handleStartExam(selectedExam!)} className="flex-1 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-all">
                            Retrain Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default MockTestHub;
