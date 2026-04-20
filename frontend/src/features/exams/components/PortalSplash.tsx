import React from 'react';

interface PortalSplashProps {
  exam: any;
  onStart: () => void;
}

export const PortalSplash: React.FC<PortalSplashProps> = ({ exam, onStart }) => {
  return (
    <div className="container mx-auto max-w-4xl py-20 px-6 animate-in zoom-in-95 duration-700">
      <div className="bg-slate-900 border border-white/5 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-5xl font-black mb-4 text-white tracking-tighter leading-none italic uppercase">
            {exam?.title}
          </h1>
          <p className="text-slate-400 mb-10 text-xl font-medium max-w-2xl">{exam?.description}</p>
          
          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Timeline', val: `${exam?.duration_minutes}m` },
              { label: 'Capacity', val: `${exam?.total_marks} Pts` },
              { label: 'Security', val: 'Level_4' }
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">{stat.label}</span>
                <span className="text-xl font-black text-white">{stat.val}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={onStart}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-xl shadow-2xl shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            ESTABLISH_SECURE_SESSION
          </button>
          
          <div className="mt-8 flex justify-center space-x-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span>• Device Bound</span>
            <span>• Neural Proctored</span>
            <span>• Auto-Submission Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
