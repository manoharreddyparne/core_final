import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeArenaProps {
  initialCode: string;
  language: string;
  questionIdentifier: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
}

export const CodeArena: React.FC<CodeArenaProps> = ({ 
  initialCode, 
  language, 
  questionIdentifier,
  onCodeChange, 
  onSubmit 
}) => {
  const [code, setCode] = useState(initialCode);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange(newCode);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <div className="h-14 bg-[#252526] flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Question Context</span>
            <span className="text-xs font-mono text-white font-bold">package auip.q{questionIdentifier};</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <span className="text-[10px] font-bold text-slate-400 capitalize">{language} Environment</span>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => { setCode(initialCode); onCodeChange(initialCode); }}
             className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 transition uppercase tracking-wider"
           >
             Reset
           </button>
           <button 
             onClick={onSubmit}
             className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
           >
             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
             Execute & Test
           </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage={language.toLowerCase()}
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 1.6,
            padding: { top: 20 },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            folding: true,
            renderLineHighlight: 'all',
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabSize: 4,
          }}
        />
      </div>

      <div className="h-44 bg-[#0a0a0a] border-t border-white/5 p-6 font-mono text-sm overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Sandbox Termination Output</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active Runtime</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-emerald-500">➜</span>
            <span className="text-[11px]">Compiling Solution.java...</span>
          </div>
          <div className="pl-5 space-y-1">
             <div className="text-[11px] text-emerald-400/80 italic tracking-tight">✓ Compilation Successful. No segments corrupted.</div>
             <div className="text-[11px] text-slate-300">Running hidden test vectors...</div>
             <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-500 font-bold">[PASS]</span>
                <span className="text-slate-400">Test Case 01: Functional verification</span>
             </div>
             <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-500 font-bold">[PASS]</span>
                <span className="text-slate-400">Test Case 02: Boundary condition analysis</span>
             </div>
             <div className="flex items-center gap-2 text-[11px]">
                <span className="text-red-400 font-bold">[FAIL]</span>
                <span className="text-slate-400">Test Case 03: Performance under concurrency</span>
                <span className="text-[9px] text-red-500/50 ml-2">(Time Limit Exceeded- 2001ms)</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
