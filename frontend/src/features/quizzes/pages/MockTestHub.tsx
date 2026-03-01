// src/features/quizzes/pages/MockTestHub.tsx
// Sprint 8 — Mock Tests & Anti-Cheat: Full quiz engine with proctoring
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Brain, Clock, Lock, CheckCircle2, XCircle, AlertTriangle,
    Trophy, BarChart3, ArrowRight, ArrowLeft, Maximize2, Shield,
    Play, Timer, Star, Zap
} from 'lucide-react';
import { apiClient } from '../../auth/api/base';
import toast from 'react-hot-toast';

interface Option {
    id: number;
    text: string;
}

interface Question {
    id: number;
    text: string;
    question_type: string;
    marks: number;
    options: Option[];
}

interface Quiz {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    question_count: number;
    questions?: Question[];
    anti_cheat_mode: boolean;
    course: string;
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
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number | string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [attemptId, setAttemptId] = useState<number | null>(null);

    // Anti-cheat
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [warningCount, setWarningCount] = useState(0);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('quizzes/');
            // Handle various response shapes
            const data = res.data?.results || res.data?.data || res.data || [];
            setQuizzes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Quiz fetch failed', err);
            setQuizzes([]);
        } finally {
            setLoading(false);
        }
    };

    // Anti-cheat: Tab switch detection
    useEffect(() => {
        if (phase !== 'ACTIVE') return;
        const handleVisibility = () => {
            if (document.hidden) {
                const newCount = tabSwitchCount + 1;
                setTabSwitchCount(newCount);
                setWarningCount(prev => prev + 1);
                toast.error(`⚠️ Tab switch detected (${newCount}). This is recorded.`, { duration: 3000 });
                if (newCount >= 3) {
                    toast.error('🚨 Auto-submitting due to repeated tab switching!', { duration: 4000 });
                    handleSubmit();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [phase, tabSwitchCount]);

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

    const handleStartQuiz = async (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setPhase('BRIEF');
    };

    const handleBeginTest = async () => {
        if (!selectedQuiz) return;
        const tid = toast.loading('Initializing secure test environment...');
        try {
            // Start attempt
            const res = await apiClient.post(`quizzes/${selectedQuiz.id}/attempts/`);
            const aid = res.data?.id || res.data?.data?.id;
            setAttemptId(aid);

            // Fetch questions
            const qRes = await apiClient.get(`quizzes/${selectedQuiz.id}/questions/`);
            const qs = qRes.data?.results || qRes.data?.data || qRes.data || [];
            setQuestions(Array.isArray(qs) ? qs : []);
            setCurrentQ(0);
            setAnswers({});
            setTimeLeft(selectedQuiz.duration_minutes * 60);
            startTimeRef.current = Date.now();
            setTabSwitchCount(0);
            setWarningCount(0);
            setPhase('ACTIVE');
            if (selectedQuiz.anti_cheat_mode) enterFullscreen();
            toast.success('Test started! Anti-cheat monitoring active.', { id: tid });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start test', { id: tid });
        }
    };

    const handleSubmit = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);

        const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

        try {
            const payload = {
                attempt_id: attemptId,
                answers: Object.entries(answers).map(([qId, optId]) => ({
                    question_id: parseInt(qId),
                    selected_option_id: typeof optId === 'number' ? optId : null,
                    text_answer: typeof optId === 'string' ? optId : null
                })),
                tab_switches: tabSwitchCount,
                time_taken_seconds: timeTaken
            };
            const res = await apiClient.post(`attempts/${attemptId}/submit/`, payload);
            const data = res.data?.data || res.data;
            setResult({
                score: data?.score || 0,
                total_marks: data?.total_marks || questions.reduce((s, q) => s + q.marks, 0),
                percentage: data?.percentage || 0,
                correct: data?.correct_count || 0,
                wrong: data?.wrong_count || 0,
                time_taken: `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`
            });
            setPhase('RESULT');
            if (document.fullscreenElement) document.exitFullscreen?.();
        } catch (err: any) {
            // Even on error, show result with local calculation
            const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
            setResult({
                score: 0,
                total_marks: totalMarks,
                percentage: 0,
                correct: 0,
                wrong: questions.length,
                time_taken: `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`
            });
            setPhase('RESULT');
            if (document.fullscreenElement) document.exitFullscreen?.();
        } finally {
            setSubmitting(false);
        }
    }, [submitting, answers, attemptId, questions, tabSwitchCount]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // ━━━ PHASE: LIST ━━━
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 animate-pulse">Loading Mock Test Arsenal...</p>
        </div>
    );

    if (phase === 'LIST') return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
                        <Brain className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                            Mock <span className="text-primary not-italic">Test Arsenal</span>
                        </h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">
                            Practice. Improve. Conquer.
                        </p>
                    </div>
                </div>
            </div>

            {quizzes.length === 0 ? (
                <div className="glass p-20 rounded-[3rem] border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center">
                        <Brain className="w-12 h-12 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black text-white italic">No Mock Tests Available</h2>
                    <p className="text-muted-foreground max-w-md text-sm font-medium">
                        Your faculty hasn't assigned any mock tests yet. Check back later or contact your placement coordinator.
                    </p>
                    <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl max-w-md w-full">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Coming Soon</p>
                        <p className="text-xs text-gray-400">Practice tests for Aptitude, Coding, and Verbal are being prepared by your institution.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map(quiz => (
                        <div key={quiz.id} className="glass p-8 rounded-[2.5rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                            <div className="relative space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    {quiz.anti_cheat_mode && (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Anti-Cheat
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{quiz.title}</h3>
                                    <p className="text-muted-foreground text-xs mt-1 font-medium line-clamp-2">{quiz.description || 'No description provided.'}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.duration_minutes} min</span>
                                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{quiz.question_count || '?'} Qs</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleStartQuiz(quiz)}
                                className="mt-6 w-full py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" /> Start Test
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ━━━ PHASE: BRIEF ━━━
    if (phase === 'BRIEF' && selectedQuiz) return (
        <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-500">
            <div className="glass p-10 rounded-[3rem] border-white/10 space-y-8">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto">
                        <Lock className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black text-white">{selectedQuiz.title}</h2>
                    <p className="text-muted-foreground text-sm">{selectedQuiz.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Duration', value: `${selectedQuiz.duration_minutes} Minutes`, icon: Clock },
                        { label: 'Questions', value: `${selectedQuiz.question_count || '—'} Questions`, icon: BarChart3 },
                        { label: 'Anti-Cheat', value: selectedQuiz.anti_cheat_mode ? 'Enabled' : 'Disabled', icon: Shield },
                        { label: 'Auto-Submit', value: 'On Timeout', icon: Timer },
                    ].map((info, i) => (
                        <div key={i} className="glass p-5 rounded-2xl border-white/5 flex items-center gap-3">
                            <info.icon className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{info.label}</p>
                                <p className="text-sm font-black text-white">{info.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Rules & Policies
                    </p>
                    <ul className="space-y-2 text-xs text-gray-400 font-medium">
                        <li>• Do not switch tabs — each switch is logged and may auto-submit your test</li>
                        <li>• Test will auto-submit when timer reaches 0</li>
                        {selectedQuiz.anti_cheat_mode && <li>• Fullscreen mode will be enforced</li>}
                        <li>• Results are final and recorded in your profile</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setPhase('LIST')} className="flex-1 py-3 glass border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleBeginTest} className="flex-1 py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2">
                        <Zap className="w-5 h-5" /> Begin Test
                    </button>
                </div>
            </div>
        </div>
    );

    // ━━━ PHASE: ACTIVE ━━━
    if (phase === 'ACTIVE') {
        const q = questions[currentQ];
        const progress = ((currentQ + 1) / questions.length) * 100;
        const isLowTime = timeLeft < 60;
        const answeredCount = Object.keys(answers).length;

        return (
            <div className="max-w-3xl mx-auto py-8 space-y-6 animate-in fade-in duration-300">
                {/* Timer & Progress Bar */}
                <div className="glass p-4 rounded-2xl border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Q {currentQ + 1} / {questions.length}
                        </span>
                        <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase">{answeredCount} answered</span>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg ${isLowTime ? 'bg-red-500/20 text-red-400 animate-pulse' : 'glass border-white/10 text-white'}`}>
                        <Clock className="w-5 h-5" />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Anti-cheat warning */}
                {warningCount > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-[11px] font-black text-red-300 uppercase tracking-wider">
                            ⚠️ Warning {warningCount}/3: Tab switches detected. {3 - warningCount} more will auto-submit.
                        </p>
                    </div>
                )}

                {/* Question Card */}
                {q ? (
                    <div className="glass p-10 rounded-[2.5rem] border-white/10 space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xs font-black shrink-0">
                                {currentQ + 1}
                            </div>
                            <p className="text-lg font-bold text-white leading-relaxed">{q.text}</p>
                        </div>

                        <div className="space-y-3">
                            {q.question_type === 'MCQ' || q.question_type === 'TrueFalse' ? (
                                (q.options || (q.question_type === 'TrueFalse' ? [{ id: 1, text: 'True' }, { id: 2, text: 'False' }] : [])).map((opt: Option) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all font-medium text-sm ${answers[q.id] === opt.id
                                            ? 'bg-primary/20 border-primary text-white shadow-xl shadow-primary/20'
                                            : 'glass border-white/10 text-gray-300 hover:bg-white/[0.05] hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${answers[q.id] === opt.id ? 'border-primary bg-primary' : 'border-white/20'}`}>
                                                {answers[q.id] === opt.id && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
                                            </div>
                                            {opt.text}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <textarea
                                    value={typeof answers[q.id] === 'string' ? answers[q.id] as string : ''}
                                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Type your answer here..."
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl p-5 text-sm font-medium min-h-[120px] outline-none focus:border-primary transition-all resize-none"
                                />
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                                disabled={currentQ === 0}
                                className="px-6 py-3 glass border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all disabled:opacity-30 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Previous
                            </button>

                            {currentQ < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQ(currentQ + 1)}
                                    className="px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    Next <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-8 py-3 bg-green-500/80 text-white font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : <>Submit Test <CheckCircle2 className="w-4 h-4" /></>}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-muted-foreground">No questions found in this test.</div>
                )}

                {/* Question Navigator */}
                <div className="glass p-5 rounded-2xl border-white/10">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Question Navigator</p>
                    <div className="flex flex-wrap gap-2">
                        {questions.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentQ(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${i === currentQ
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : answers[questions[i]?.id] !== undefined
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                                        : 'glass border-white/10 text-muted-foreground hover:text-white'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ━━━ PHASE: RESULT ━━━
    if (phase === 'RESULT' && result) {
        const passed = result.percentage >= 50;
        return (
            <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="glass p-10 rounded-[3rem] border-white/10 space-y-8 text-center">
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {passed ? <Trophy className="w-12 h-12 text-green-400" /> : <XCircle className="w-12 h-12 text-red-400" />}
                    </div>

                    <div>
                        <h2 className="text-4xl font-black text-white">{passed ? 'Well Done!' : 'Keep Practicing!'}</h2>
                        <p className="text-muted-foreground mt-2 font-medium">
                            {passed ? 'You passed the mock test.' : 'Review the answers and try again.'}
                        </p>
                    </div>

                    {/* Score Ring */}
                    <div className={`inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-8 ${passed ? 'border-green-500/30' : 'border-red-500/30'} relative mx-auto`}>
                        <p className="text-4xl font-black text-white">{result.percentage}%</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Score', value: `${result.score}/${result.total_marks}`, color: 'text-primary' },
                            { label: 'Correct', value: result.correct, color: 'text-green-400' },
                            { label: 'Wrong', value: result.wrong, color: 'text-red-400' },
                            { label: 'Time', value: result.time_taken, color: 'text-amber-400' },
                        ].map((s, i) => (
                            <div key={i} className="glass p-4 rounded-2xl border-white/5">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {tabSwitchCount > 0 && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                ⚠️ {tabSwitchCount} tab switch(es) were recorded during this attempt.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button onClick={() => { setPhase('LIST'); setSelectedQuiz(null); setResult(null); }} className="flex-1 py-3 glass border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">
                            Back to Tests
                        </button>
                        <button onClick={() => handleStartQuiz(selectedQuiz!)} className="flex-1 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2">
                            <Star className="w-4 h-4" /> Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default MockTestHub;
