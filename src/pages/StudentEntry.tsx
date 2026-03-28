import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Power } from "lucide-react";

const StudentEntry = () => {
  const navigate = useNavigate();
  const [examKey, setExamKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = examKey.trim();
    if (!key) { setError("Please enter your exam key."); return; }
    navigate(`/exam/${key}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1e2e] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-white/50 text-sm flex items-center gap-1.5">
          <span className="text-base">🌐</span> English
        </span>
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
          <ShieldCheck className="h-5 w-5 text-[#f59e0b]" />
          NejoExamPrep
        </Link>
        <Link to="/login" className="p-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors" title="Teacher sign in">
          <Power className="h-5 w-5" />
        </Link>
      </header>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          {/* Icon + title */}
          <div className="text-center mb-6">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 text-[#0f1e2e]" />
            <h1 className="text-xl font-bold text-[#0f1e2e]">Student</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter exam key"
              value={examKey}
              onChange={(e) => { setExamKey(e.target.value); setError(""); }}
              className="flex-1 h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-[#1a8fe3] focus:outline-none text-sm text-[#0f1e2e] placeholder:text-slate-400 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-[#0f1e2e] hover:bg-[#1a2e42] text-white font-semibold text-sm transition-colors"
            >
              Next
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          {/* Cheat prevention link */}
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <a href="#cheat-prevention" className="hover:text-[#1a8fe3] hover:underline transition-colors">
              Read more about our cheat-prevention systems
            </a>
          </div>
        </div>
      </div>

      {/* Cheat prevention info anchor */}
      <div id="cheat-prevention" className="px-6 pb-12 max-w-md mx-auto w-full">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70 text-sm space-y-2">
          <p className="font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#f59e0b]" /> Cheat Prevention
          </p>
          <p>NejoExamPrep enforces fullscreen mode, detects tab switching, blocks right-click and keyboard shortcuts, and logs all suspicious activity in real time.</p>
          <p>Teachers receive a full activity report for every student after the exam.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentEntry;
