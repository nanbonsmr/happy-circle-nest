import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle, CheckCircle2, Loader2, User, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const rules = [
  "Do not switch tabs or leave the exam window — each violation is logged.",
  "The exam will auto-submit when the timer runs out.",
  "All answers are saved automatically as you select them.",
  "5 violations will result in your score being set to zero.",
  "Ensure a stable internet connection throughout the exam.",
  "Do not refresh the page — your progress is saved but violations are not reset.",
];

interface StudentInfo {
  name: string;
  email: string;
  studentId: string;
}

const ExamReady = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [examStatus, setExamStatus] = useState<string>("published");
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [duration, setDuration] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [loadingExam, setLoadingExam] = useState(true);
  const [examError, setExamError] = useState("");
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { navigate(`/exam/${accessCode}`); return; }

    const loadExam = async () => {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("id, title, subject, status, duration_minutes")
        .ilike("access_code", accessCode || "")
        .maybeSingle();

      if (error || !exam) {
        setExamError("Exam not found. Please check your access code.");
        setLoadingExam(false);
        return;
      }

      setExamTitle(exam.title);
      setExamSubject(exam.subject || "");
      setExamStatus(exam.status);
      setDuration(exam.duration_minutes);

      // Fetch question count and total marks
      const { data: qs } = await supabase
        .from("questions")
        .select("marks")
        .eq("exam_id", exam.id);
      setQuestionCount(qs?.length || 0);
      setTotalMarks((qs || []).reduce((s, q) => s + (q.marks || 1), 0));

      // Fetch student info from session + registry
      const { data: sessionRow } = await supabase
        .from("exam_sessions")
        .select("student_name, student_email, student_registry_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionRow) {
        let studentId = "";
        if (sessionRow.student_registry_id) {
          const { data: reg } = await supabase
            .from("students")
            .select("student_id")
            .eq("id", sessionRow.student_registry_id)
            .maybeSingle();
          studentId = reg?.student_id || "";
        }
        setStudentInfo({
          name: sessionRow.student_name,
          email: sessionRow.student_email,
          studentId,
        });
      }

      setLoadingExam(false);

      if (exam.status === "active") {
        await supabase.from("exam_sessions")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", sessionId);
        navigate(`/exam/${accessCode}/take`);
        return;
      }

      const channel = supabase.channel(`exam-ready-${exam.id}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${exam.id}` },
          async (payload) => {
            const newStatus = payload.new.status;
            setExamStatus(newStatus);
            if (newStatus === "active") {
              const sid = sessionStorage.getItem("session_id");
              if (sid) {
                await supabase.from("exam_sessions")
                  .update({ status: "in_progress", started_at: new Date().toISOString() })
                  .eq("id", sid);
              }
              navigate(`/exam/${accessCode}/take`);
            }
          })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let cleanup: (() => void) | undefined;
    loadExam().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [accessCode, navigate]);

  if (loadingExam) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f] mx-auto" />
        <p className="text-sm text-slate-500">Loading exam details…</p>
      </div>
    </div>
  );

  if (examError) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <div className="text-center max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <p className="text-red-600 font-semibold mb-4">{examError}</p>
        <button type="button" onClick={() => navigate("/student")}
          className="px-6 py-2 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:bg-[#162d4a] transition-colors">
          Go Back
        </button>
      </div>
    </div>
  );

  const isWaiting = examStatus !== "active";

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="NejoExamPrep" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />
            <div>
              <p className="text-white font-bold text-sm leading-tight">NejoExamPrep</p>
              <p className="text-white/50 text-xs">Exam Lobby</p>
            </div>
          </div>
          {studentInfo && (
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-white/60" />
              <div className="text-right">
                <p className="text-white text-xs font-semibold leading-tight">{studentInfo.name}</p>
                {studentInfo.studentId && <p className="text-white/50 text-xs font-mono">{studentInfo.studentId}</p>}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-lg space-y-4">

          {/* Exam info card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#1e3a5f] flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[#1e3a5f] leading-tight">{examTitle}</h1>
                {examSubject && <p className="text-sm text-slate-500 mt-0.5">{examSubject}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Clock className="h-4 w-4 text-[#1e3a5f] mx-auto mb-1" />
                <p className="text-lg font-bold text-[#1e3a5f]">{duration}</p>
                <p className="text-xs text-slate-500">Minutes</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Hash className="h-4 w-4 text-[#1e3a5f] mx-auto mb-1" />
                <p className="text-lg font-bold text-[#1e3a5f]">{questionCount}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <CheckCircle2 className="h-4 w-4 text-[#1e3a5f] mx-auto mb-1" />
                <p className="text-lg font-bold text-[#1e3a5f]">{totalMarks}</p>
                <p className="text-xs text-slate-500">Total Marks</p>
              </div>
            </div>
          </div>

          {/* Student info */}
          {studentInfo && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Your Details</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Name</span>
                  <span className="text-sm font-semibold text-[#1e3a5f]">{studentInfo.name}</span>
                </div>
                {studentInfo.studentId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Student ID</span>
                    <span className="text-sm font-mono font-bold text-[#1a8fe3] bg-blue-50 px-2 py-0.5 rounded">{studentInfo.studentId}</span>
                  </div>
                )}
                {studentInfo.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Email</span>
                    <span className="text-sm text-slate-600 truncate max-w-[200px]">{studentInfo.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rules */}
          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Exam Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {rules.map((rule, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} className="flex items-start gap-2.5 text-sm">
                    <div className="h-5 w-5 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-[#1e3a5f]">{i + 1}</span>
                    </div>
                    <span className="text-slate-600 leading-snug">{rule}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-5 pb-5">
              {isWaiting ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-[#1e3a5f]" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[#1e3a5f]">Waiting for exam to start…</p>
                    <p className="text-sm text-slate-500 mt-1">Your teacher will start the exam shortly. Stay on this page.</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Connected · Listening for start signal
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-700">Exam is starting!</p>
                    <p className="text-sm text-slate-500 mt-1">Redirecting you now…</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <img src={logo} alt="" className="h-4 w-4 rounded-full object-cover" />
          <span>NejoExamPrep · Nejo Ifa Boru Special Boarding Secondary School</span>
        </div>
      </footer>
    </div>
  );
};

export default ExamReady;
