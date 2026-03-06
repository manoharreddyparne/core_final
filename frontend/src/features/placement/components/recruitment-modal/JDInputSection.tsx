import React from "react";
import { UploadCloud, FileText, BrainCircuit } from "lucide-react";

interface JDInputSectionProps {
    activeInputTab: 'upload' | 'text';
    setActiveInputTab: (tab: 'upload' | 'text') => void;
    jdText: string;
    setJdText: (text: string) => void;
    uploading: boolean;
    handleJDUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTextAnalysis: () => void;
    isEditing: boolean;
}

const JDInputSection: React.FC<JDInputSectionProps> = ({
    activeInputTab,
    setActiveInputTab,
    jdText,
    setJdText,
    uploading,
    handleJDUpload,
    handleTextAnalysis,
    isEditing
}) => {
    // Re-enable input during edit as requested by user
    // if (isEditing) return null;

    return (
        <div className="space-y-6">
            <div className="p-1.5 bg-black/40 rounded-2xl border border-white/5 flex gap-1">
                <button
                    onClick={() => setActiveInputTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeInputTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <UploadCloud className="w-4 h-4" /> PDF Upload
                </button>
                <button
                    onClick={() => setActiveInputTab('text')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeInputTab === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <FileText className="w-4 h-4" /> Paste JD Text
                </button>
            </div>

            {activeInputTab === 'upload' ? (
                <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-[2.5rem] text-center relative overflow-hidden group">
                    <BrainCircuit className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-base font-bold text-white mb-2">Neural Vision Engine</h3>
                    <p className="text-[11px] text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed font-medium">
                        Drop your JD PDF, Logo, or Screenshot (JPG/PNG). AI will extract branding and structured data.
                    </p>
                    <label className="inline-flex items-center gap-2 cursor-pointer px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95">
                        <UploadCloud className="w-4 h-4" />
                        {uploading ? "Analyzing Multimodal Data..." : "Select Document / Image"}
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleJDUpload} disabled={uploading} />
                    </label>
                </div>
            ) : (
                <div className="space-y-3">
                    <textarea
                        value={jdText}
                        onChange={e => setJdText(e.target.value)}
                        placeholder="Paste the Job Description text here for AI analysis..."
                        className="w-full h-40 bg-black/40 border border-white/10 rounded-[2rem] p-5 text-sm text-gray-300 focus:border-indigo-500/50 outline-none transition-all resize-none font-medium"
                    />
                    <button
                        onClick={handleTextAnalysis}
                        disabled={uploading || jdText.length < 50}
                        className="w-full py-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        {uploading ? "Analyzing Unstructured Text..." : "Execute Neural Analysis"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default JDInputSection;
