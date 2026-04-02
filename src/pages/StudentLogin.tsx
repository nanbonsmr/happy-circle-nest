import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = studentId.trim().toUpperCase();
    const pwd = password.trim();
    if (!sid || !pwd) { setError("Please enter both Student ID and password."); return; }

    setLoading(true);
    setError("");

    try {
      const { data: student, error: dbErr } = await supabase
        .from("students")
        .select("id, student_id, full_name, email, password, must_change_password, avatar_url, gender, grade")
        .ilike("student_id", sid)
        .maybeSingle();

      if (dbErr || !student) {
        setError("Student ID not found. Please check and try again.");
        setLoading(false);
        return;
      }

      if (student.password !== pwd) {
        setError("Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      // Store student session
      sessionStorage.setItem("student_logged_in", "true");
      sessionStorage.setItem("student_db_id", student.id);
      sessionStorage.setItem("student_id", student.student_id);
      sessionStorage.setItem("student_name", student.full_name);
      sessionStorage.setItem("student_email", student.email || "");
      sessionStorage.setItem("student_avatar", student.avatar_url || "");
      sessionStorage.setItem("student_gender", student.gender || "");
      sessionStorage.setItem("student_grade", student.grade || "");
      sessionStorage.setItem("student_must_change_pw", student.must_change_password ? "true" : "false");

      navigate("/student/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1e2e] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="#" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
          <img src={logo} alt="NejoExamPrep" className="h-8 w-8 rounded-full object-cover" />
          NejoExamPrep
        </Link>
        
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#0f1e2e]">Student Login</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your Student ID and password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Student ID</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. STU-0001"
                  value={studentId}
                  onChange={(e) => { setStudentId(e.target.value); setError(""); }}
                  disabled={loading}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-slate-200 focus:border-[#2563EB] focus:outline-none text-sm text-[#0f1e2e] placeholder:text-slate-400 font-mono uppercase transition-colors disabled:opacity-60"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  disabled={loading}
                  className="w-full h-11 px-4 pr-10 rounded-xl border-2 border-slate-200 focus:border-[#2563EB] focus:outline-none text-sm text-[#0f1e2e] placeholder:text-slate-400 transition-colors disabled:opacity-60"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Your credentials are assigned by the administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
