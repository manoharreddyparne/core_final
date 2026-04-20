import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamLockdown } from '../hooks/useExamLockdown';
import { DeviceGate } from '../components/DeviceGate';
import { ProctorSentinel } from '../components/ProctorSentinel';
import { CodeArena } from '../components/CodeArena';
import { examService } from '../services/examService';
import { ExamHeader } from '../components/ExamHeader';
import { ExamQuestionPane } from '../components/ExamQuestionPane';
import { PortalSplash } from '../components/PortalSplash';
import { useSecurityScreener } from '../hooks/useSecurityScreener';

export const ExamPortalPage: React.FC = () => {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [violationScore, setViolationScore] = useState(0);
  const [indices, setIndices] = useState({ section: 0, question: 0 });
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    examService.startAttempt(examId!, 'secure-client-v1')
      .then(data => { setSession(data); setAnswers(data.draft_answers || {}); setLoading(false); })
      .catch(err => { setError(err.response?.data?.detail || 'Portal Initialization Error'); setLoading(false); });
  }, [examId]);

  const onViolation = useCallback(async (type: string, details: any) => {
    if (!session?.id) return;
    const res = await examService.logViolation(session.id, type, details);
    setViolationScore(res.violation_score);
    if (res.is_blocked) { setError('TERMINATED: Security Breach'); setActive(false); }
  }, [session?.id]);

  const currentMapping = useMemo(() => session?.exam_details?.sections?.[indices.section]?.questions?.[indices.question], [session, indices]);

  const handleSelect = async (oid: number) => {
    setAnswers(p => ({ ...p, [currentMapping.id]: { option_ids: [oid] } }));
    await examService.submitAnswer(session.id, currentMapping.id, { option_ids: [oid] });
  };

  const handleFinish = async () => {
    if (!window.confirm("Complete Session?")) return;
    await examService.finishExam(session.id);
    navigate('/dashboard');
  };

  const { isFullscreen } = useExamLockdown({ active, onViolation });
  useSecurityScreener(active, onViolation);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-[0.5em]">Neural_Sync_Active</div>;
  if (error) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><h2 className="text-4xl font-black text-red-500 mb-4">{error}</h2><button onClick={() => navigate('/dashboard')} className="p-4 bg-white/5 rounded-xl uppercase font-bold">Return</button></div>;

  return (
    <DeviceGate>
      <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
        {active && session?.exam_details?.enable_webcam && <ProctorSentinel onViolation={onViolation} />}
        {!active ? (
          <PortalSplash exam={session?.exam_details} onStart={() => setActive(true)} />
        ) : (
          <div className="h-screen flex flex-col overflow-hidden">
            <ExamHeader title={session?.exam_details?.title} timeLeft="01:22:45" violationScore={violationScore} isFinishing={false} onFinish={handleFinish} />
            <main className="flex-1 flex overflow-hidden">
              <div className="w-1/2 p-16 overflow-y-auto border-r border-white/5 scroll-smooth">
                 <ExamQuestionPane question={currentMapping?.question} currentIdx={indices.question} selectedOptionIds={answers[currentMapping?.id]?.option_ids || []} onSelect={handleSelect} />
              </div>
              <div className="w-1/2 bg-black/20 p-16 flex flex-col">
                {currentMapping?.question?.question_type === 'CODING' ? (
                  <CodeArena initialCode={currentMapping.question.coding_metadata?.boilerplate} language={currentMapping.question.coding_metadata?.language} questionIdentifier={currentMapping.question.id} onCodeChange={() => {}} onSubmit={() => {}} />
                ) : <div className="flex-1 flex flex-col items-center justify-center opacity-20"><div className="w-20 h-20 border-2 border-dashed border-white mb-6 rounded-full" /><p className="font-black uppercase tracking-widest text-xs">Standard Response Mode</p></div>}
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setIndices(i => ({ ...i, question: i.question - 1 }))} disabled={indices.question === 0} className="px-8 py-3 glass rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30">Prev</button>
                  <button onClick={() => setIndices(i => ({ ...i, question: i.question + 1 }))} className="px-10 py-3 bg-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Next</button>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </DeviceGate>
  );
};
