import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface AuditRow {
  student_email: string;
  raw_score: number;
  violation_score: number;
  status: string;
  is_blocked: boolean;
}

export const ForensicDashboard: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [data, setData] = useState<AuditRow[]>([]);

  // Simulation of data fetch
  useEffect(() => {
    setData([
      { student_email: 'student_1@auip.edu', raw_score: 85, violation_score: 0, status: 'SUBMITTED', is_blocked: false },
      { student_email: 'student_2@auip.edu', raw_score: 12, violation_score: 45, status: 'BLOCKED', is_blocked: true },
      { student_email: 'student_3@auip.edu', raw_score: 70, violation_score: 5, status: 'SUBMITTED', is_blocked: false },
    ]);
  }, [examId]);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Forensic_Audit_Node</h1>
          <p className="text-slate-500 font-mono text-sm mt-2">ASEP_INTELLIGENCE_HUB // EXAM_ID_{examId}</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all uppercase text-xs tracking-widest">
          Export_Excel_Report
        </button>
      </div>

      <div className="grid gap-4">
        {data.map((row, idx) => (
          <div key={idx} className={`p-6 rounded-2xl border transition-all ${row.is_blocked ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10 hover:border-blue-500/50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-black text-slate-500 block uppercase tracking-widest mb-1">Student_Identity</span>
                <h3 className="text-lg font-bold">{row.student_email}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-500 block uppercase tracking-widest mb-1">Status</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${row.is_blocked ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {row.status}
                </span>
              </div>
              <div className="w-48 px-8 border-x border-white/5">
                <span className="text-xs font-black text-slate-500 block uppercase tracking-widest mb-1">Violation_Score</span>
                <div className="h-2 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${row.violation_score > 20 ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min(row.violation_score, 100)}%` }}
                  />
                </div>
              </div>
              <button className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
                <span className="text-xs font-black text-slate-400 group-hover:text-white uppercase">View_Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
