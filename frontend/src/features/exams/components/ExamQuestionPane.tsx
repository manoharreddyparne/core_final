import React from 'react';

interface Option {
  id: number;
  text: string;
}

interface QuestionPaneProps {
  question: any;
  currentIdx: number;
  selectedOptionIds: number[];
  onSelect: (id: number) => void;
}

export const ExamQuestionPane: React.FC<QuestionPaneProps> = ({
  question, currentIdx, selectedOptionIds, onSelect
}) => {
  if (!question) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
              Q_{currentIdx + 1}
           </span>
           <span className="text-slate-600 font-mono text-[10px] uppercase">Level: {question.difficulty}</span>
        </div>
        <h3 className="text-2xl font-bold text-white leading-tight tracking-tight">
           {question.text}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {question.options?.map((opt: Option, i: number) => {
             const isSelected = selectedOptionIds.includes(opt.id);
             return (
               <button 
                 key={opt.id} 
                 onClick={() => onSelect(opt.id)}
                 className={`group flex items-center p-6 border-2 rounded-3xl transition-all duration-300 ${
                   isSelected 
                   ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                   : 'bg-white/5 border-white/5 hover:border-white/10'
                 }`}
               >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-6 font-black text-sm transition-colors ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                     {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-lg font-medium tracking-tight ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {opt.text}
                  </span>
               </button>
             );
         })}
      </div>

      {question.question_type === 'CODING' && (
        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Memory Constraints</span>
           <p className="text-xs text-slate-400">Strict heap limits enforced. Ensure optimal time complexity.</p>
        </div>
      )}
    </div>
  );
};
