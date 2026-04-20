import React from 'react';

interface ExamHeaderProps {
  title: string;
  sectionTitle?: string;
  timeLeft: string;
  violationScore: number;
  isFinishing: boolean;
  onFinish: () => void;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  title, sectionTitle, timeLeft, violationScore, isFinishing, onFinish
}) => {
  return (
    <header className="h-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between z-20">
      <div className="flex items-center space-x-6">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">A</div>
        <div>
           <h2 className="font-bold tracking-tight text-sm text-white leading-none mb-1">{title}</h2>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sectionTitle || 'SESSION_ACTIVE'}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-3 bg-black/40 px-5 py-2 rounded-xl border border-white/5">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          <span className="font-mono text-lg font-bold tracking-tighter text-white">{timeLeft}</span>
        </div>
        
        {violationScore > 0 && (
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black">
            VIOLATIONS: {violationScore}
          </div>
        )}
        
        <button 
           onClick={onFinish}
           disabled={isFinishing}
           className="px-6 py-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
        >
          {isFinishing ? 'SYNCING...' : 'TERMINATE'}
        </button>
      </div>
    </header>
  );
};
