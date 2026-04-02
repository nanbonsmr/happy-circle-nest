import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2,
  ShieldAlert, ShieldCheck, XCircle, AlertTriangle, User, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCheatPrevention, type CheatEventType, type SecurityLevel } from "@/hooks/useCheatPrevention";
import logo from "@/assets/logo.png";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  question_order: number;
  block_id: string | null;
  block_order: number;
  instructions: string | null;
  paragraph: string | null;
  image_url: string | null;
  image_caption: string | null;
}

interface ExamInfo {
  title: string;
  subject: string;
  duration_minutes: number;
}

interface StudentInfo {
  name: string;
  email: string;
  studentId: string;
}

const MAX_VIOLATIONS = 5;

const EVENT_LABELS: Record<CheatEventType, string> = {
  tab_switch: "Tab switching detected",
  fullscreen_exit: "Attempting to exit exam screen",
  copy_attempt: "Copying content",
  paste_attempt: "Pasting content",
  devtools_open: "Opening DevTools",
  inactivity: "Long inactivity",
  window_resize: "Resizing the window",
};

const AnswerOptions = memo(({
  questionId, options, selected, onSelect,
}: {
  questionId: string;
  options: { key: string; text: string }[];
  selected: string;
  onSelect: (questionId: string, key: string) => void;
}) => (
  <div className="space-y-3" role="radiogroup">
    {options.map((opt) => {
      const isSelected = selected === opt.key;
      return (
        <label
          key={opt.key}
          htmlFor={`opt-${questionId}-${opt.key}`}
          onMouseDown={(e) => e.preventDefault()}
          className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all select-none ${
            isSelected
              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-sm ring-1 ring-[#1e3a5f]/20"
              : "border-slate-200 hover:border-[#1e3a5f]/40 hover:bg-slate-50"
          }`}
        >
          <input type="radio" id={`opt-${questionId}-${opt.key}`} name={`question-${questionId}`}
            value={opt.key} checked={isSelected} onChange={() => onSelect(questionId, opt.key)} className="sr-only" />
          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            isSelected ? "border-[#1e3a5f] bg-[#1e3a5f]" : "border-slate-300"
          }`}>
            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
          <span className="font-semibold text-sm text-[#1e3a5f] shrink-0 w-5">{opt.key}.</span>
          <span className="text-[#0f172a] leading-snug">{opt.text}</span>
        </label>
      );
    })}
  </div>
));

const CheatWarningOverlay = ({
  event, totalViolations, onDismiss, onEject,
}: {
  event: CheatEventType; totalViolations: number; onDismiss: () => void; onEject: () => void;
}) => {
  const triesLeft = MAX_VIOLATIONS - totalViolations;
  const isFinalWarning = totalViolations === MAX_VIOLATIONS;
  const isEjected = totalViolations > MAX_VIOLATIONS;

  useEffect(() => {
    if (isEjected) { const t = setTimeout(onEject, 5000); return () => clearTimeout(t); }
  }, [isEjected, onEject]);

  if (isEjected) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-red-950/95 p-4">
      <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="h-9 w-9 text-red-600" />
        </div>
        <h3 className="text-xl font-extrabold text-red-700 mb-2">Removed from Exam</h3>
        <p className="text-slate-600 text-sm mb-2">You have been removed due to repeated violations.</p>
        <p className="text-xs text-slate-400 mb-6">Your answers have been submitted and your teacher has been notified.</p>
        <div className="text-xs text-slate-400">Redirecting in 5 seconds…</div>
      </motion.div>
    </div>
  );

  if (isFinalWarning) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-orange-950/80 p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-orange-600" />
        </div>
        <h3 className="text-lg font-extrabold text-orange-700 mb-1">⚠️ Final Warning!</h3>
        <p className="text-slate-700 text-sm font-medium mb-2">{EVENT_LABELS[event]}</p>
        <p className="text-slate-600 text-sm mb-4">
          You have used all your chances.{" "}
          <span className="font-bold text-red-600">One more violation and you will be permanently removed.</span>
        </p>
        <p className="text-xs text-slate-400 mb-5">Violation #{totalViolations} — this is your last warning.</p>
        <Button type="button" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={onDismiss}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold">
          I Understand — Return to Exam
        </Button>
      </motion.div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-[#0f172a] mb-1">Warning #{totalViolations}</h3>
        <p className="text-slate-700 text-sm font-medium mb-2">{EVENT_LABELS[event]}</p>
        <p className="text-slate-600 text-sm mb-1">This has been logged and reported to your teacher.</p>
        <p className="text-sm font-semibold text-amber-700 mb-5">
          You have <span className="text-red-600">{triesLeft} {triesLeft === 1 ? "try" : "tries"} left</span> before you are removed.
        </p>
        <Button type="button" onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={onDismiss}
          className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-xl">
          OK — Return to Exam
        </Button>
      </motion.div>
    </div>
  );
};

const ExamPage = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentQuestion, setCurrentQuestion] = useState(() => {
    const sid = sessionStorage.getItem("session_id");
    const saved = sid ? parseInt(sessionStorage.getItem(`q_pos_${sid}`) || "0", 10) : 0;
    return isNaN(saved) ? 0 : saved;
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examId, setExamId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [examEnded, setExamEnded] = useState(false);
  const [ejected, setEjected] = useState(false);
  const [ejectedByViolation, setEjectedByViolation] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("low");
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const totalViolationsRef = useRef(0);
  const warningOpenRef = useRef(false);
  const [activeWarning, setActiveWarning] = useState<{ event: CheatEventType; total: number } | null>(null);

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const sid = sessionStorage.getItem("session_id") || sessionId;
      if (!sid) throw new Error("Session not found");

      const { data: dbQuestions } = await supabase.from("questions").select("id, correct_answer").eq("exam_id", examId);
      const correctMap = new Map((dbQuestions || []).map((q) => [q.id, q.correct_answer]));

      const answersToUpsert = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        session_id: sid,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: correctMap.get(questionId) === selectedAnswer,
      }));

      if (answersToUpsert.length > 0) {
        await supabase.from("student_answers").upsert(answersToUpsert, { onConflict: "session_id,question_id" });
      }

      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const earnedMarks = answersToUpsert.filter((a) => a.is_correct).reduce((s, a) => {
        const q = questions.find((q) => q.id === a.question_id);
        return s + (q?.marks || 0);
      }, 0);

      await supabase.from("exam_sessions").update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score: earnedMarks,
        total_marks: totalMarks,
      }).eq("id", sid);

      if (isAutoSubmit) {
        setExamEnded(true);
      } else {
        localStorage.removeItem(`violations_${sid}`);
        sessionStorage.removeItem(`q_pos_${sid}`);
        navigate(`/exam/${accessCode}/complete`);
      }
    } catch (error: any) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
      setSubmitting(false);
    }
  }, [submitting, sessionId, examId, answers, questions, navigate, accessCode, toast]);

  const handleEject = useCallback(async () => {
    warningOpenRef.current = false;
    const sid = sessionStorage.getItem("session_id") || sessionId;
    if (sid) {
      await supabase.from("exam_sessions").update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score: 0,
        total_marks: 0,
        ejected_by_violation: true,
      }).eq("id", sid);
      localStorage.removeItem(`violations_${sid}`);
      sessionStorage.removeItem(`q_pos_${sid}`);
    }
    setEjectedByViolation(true);
    setEjected(true);
  }, [sessionId]);

  const handleCheatWarning = useCallback((event: CheatEventType, _count: number) => {
    if (warningOpenRef.current) return;
    totalViolationsRef.current += 1;
    const total = totalViolationsRef.current;
    const sid = sessionStorage.getItem("session_id");
    if (sid) localStorage.setItem(`violations_${sid}`, String(total));
    if (total > MAX_VIOLATIONS) { handleEject(); return; }
    warningOpenRef.current = true;
    setActiveWarning({ event, total });
  }, [handleEject]);

  const { requestFullscreen } = useCheatPrevention({
    sessionId,
    securityLevel,
    onWarning: handleCheatWarning,
    enabled: !loading && !examEnded && !ejected && !!sessionId,
  });

  useEffect(() => {
    const sid = sessionStorage.getItem("session_id");
    if (!sid) { navigate(`/exam/${accessCode}`); return; }
    setSessionId(sid);

    const stored = parseInt(localStorage.getItem(`violations_${sid}`) || "0", 10);
    if (stored > 0) {
      totalViolationsRef.current = stored;
      if (stored >= MAX_VIOLATIONS) { setEjectedByViolation(true); setLoading(false); return; }
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Refreshing will not reset your violations. Are you sure?";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const loadExam = async () => {
      // Fetch exam data
      const { data: exam } = await supabase
        .from("exams")
        .select("id, title, subject, duration_minutes, started_at, status, security_level")
        .eq("access_code", accessCode || "")
        .maybeSingle();

      if (!exam || exam.status !== "active") { setExamEnded(true); setLoading(false); return; }

      setExamId(exam.id);
      setSecurityLevel((exam.security_level as SecurityLevel) || "low");
      setExamInfo({ title: exam.title, subject: exam.subject || "", duration_minutes: exam.duration_minutes });

      // Fetch student info from session + registry
      const { data: sessionRow } = await supabase
        .from("exam_sessions")
        .select("student_name, student_email, student_registry_id")
        .eq("id", sid)
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

      const startedAt = exam.started_at ? new Date(exam.started_at).getTime() : Date.now();
      const endTime = startedAt + exam.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (remaining <= 0) { setExamEnded(true); setLoading(false); return; }
      setTimeLeft(remaining);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, marks, question_order, block_id, block_order, instructions, paragraph, image_url, image_caption")
        .eq("exam_id", exam.id).order("question_order");
      setQuestions(qs || []);

      const { data: existingAnswers } = await supabase
        .from("student_answers").select("question_id, selected_answer").eq("session_id", sid);
      if (existingAnswers) {
        const ansMap: Record<string, string> = {};
        existingAnswers.forEach((a) => { if (a.selected_answer) ansMap[a.question_id] = a.selected_answer; });
        setAnswers(ansMap);
        if (Object.keys(ansMap).length > 0) {
          toast({ title: "Welcome back!", description: "Your previous answers have been restored." });
        }
      }
      setLoading(false);

      const examChannel = supabase.channel(`exam-status-${exam.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${exam.id}` },
          (payload) => { if (payload.new.status !== "active") setExamEnded(true); })
        .subscribe();

      return () => { supabase.removeChannel(examChannel); };
    };

    let cleanup: (() => void) | undefined;
    loadExam().then((c) => { cleanup = c; });
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); cleanup?.(); };
  }, [accessCode, navigate]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || examEnded || ejected) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, handleSubmit, timeLeft, examEnded, ejected]);

  useEffect(() => {
    const sid = sessionStorage.getItem("session_id");
    if (sid) sessionStorage.setItem(`q_pos_${sid}`, String(currentQuestion));
  }, [currentQuestion]);

  const saveAnswer = useCallback(async (questionId: string, selectedAnswer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedAnswer }));
    const sid = sessionStorage.getItem("session_id");
    if (!sid) return;
    await supabase.from("student_answers").upsert(
      { session_id: sid, question_id: questionId, selected_answer: selectedAnswer },
      { onConflict: "session_id,question_id" }
    );
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f] mx-auto" />
        <p className="text-sm text-slate-500">Loading your exam…</p>
      </div>
    </div>
  );

  if (ejectedByViolation) return (
    <div className="min-h-screen flex items-center justify-center bg-red-950 p-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
        <div className="rounded-2xl bg-white shadow-2xl p-8">
          <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-red-700 mb-3">Removed from Exam</h1>
          <p className="text-slate-600 mb-2">You reached <strong>{MAX_VIOLATIONS} violations</strong> during this exam.</p>
          <p className="text-slate-500 text-sm mb-6">Your score has been set to <strong>0</strong> and your teacher has been notified.</p>
          <Button type="button" onClick={() => navigate("/")} variant="outline" className="w-full">Return to Home</Button>
        </div>
      </motion.div>
    </div>
  );

  if (examEnded) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
        <Card className="shadow-xl">
          <CardContent className="pt-10 pb-8">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Exam Ended</h1>
            <p className="text-slate-500 mb-6">The exam has been closed by your teacher. Your answers have been submitted.</p>
            <Button type="button" onClick={() => navigate("/")} variant="outline">Back to Home</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">No Questions</h2>
          <p className="text-slate-500">This exam has no questions yet.</p>
        </CardContent>
      </Card>
    </div>
  );

  const q = questions[currentQuestion];
  const options = [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];
  const isTimeLow = timeLeft < 300;
  const totalViolations = totalViolationsRef.current;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const progressPct = Math.round((answeredCount / questions.length) * 100);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-[#f0f4f8] overflow-y-auto select-none">
        <AnimatePresence>
          {activeWarning && (
            <CheatWarningOverlay
              event={activeWarning.event}
              totalViolations={activeWarning.total}
              onDismiss={() => {
                warningOpenRef.current = false;
                if (activeWarning.total > MAX_VIOLATIONS) { handleEject(); }
                else { setActiveWarning(null); requestFullscreen(); }
              }}
              onEject={handleEject}
            />
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <header className="sticky top-0 z-[150] bg-[#1e3a5f] shadow-lg">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            {/* Left: logo + exam info */}
            <div className="flex items-center gap-3 min-w-0">
              <img src={logo} alt="NejoExamPrep" className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-white/20" />
              <div className="min-w-0 hidden sm:block">
                <p className="text-white font-bold text-sm leading-tight truncate">{examInfo?.title || "Exam"}</p>
                {examInfo?.subject && <p className="text-white/50 text-xs truncate">{examInfo.subject}</p>}
              </div>
            </div>

            {/* Center: progress */}
            <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
              <span className="text-white/60 text-xs shrink-0">{currentQuestion + 1}/{questions.length}</span>
              <Progress value={((currentQuestion + 1) / questions.length) * 100} className="flex-1 h-1.5 bg-white/20" />
              <span className="text-white/60 text-xs shrink-0">{progressPct}%</span>
            </div>

            {/* Right: violations + security + timer */}
            <div className="flex items-center gap-2 shrink-0">
              {totalViolations > 0 && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                  totalViolations >= MAX_VIOLATIONS ? "bg-red-500 text-white animate-pulse"
                  : totalViolations >= 3 ? "bg-orange-400 text-white"
                  : "bg-amber-400 text-white"
                }`}>
                  <ShieldAlert className="h-3 w-3" />
                  <span className="hidden sm:inline">{totalViolations}/{MAX_VIOLATIONS}</span>
                </div>
              )}
              <div className={`hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                securityLevel === "high" ? "bg-red-500/20 text-red-200" : "bg-green-500/20 text-green-200"
              }`}>
                {securityLevel === "high" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                <span>{securityLevel === "high" ? "High" : "Standard"}</span>
              </div>
              <div className={`flex items-center gap-1.5 font-mono text-base font-bold px-3 py-1 rounded-full ${
                isTimeLow ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-white"
              }`}>
                <Clock className="h-3.5 w-3.5" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Student info bar */}
          {studentInfo && (
            <div className="bg-[#162d4a] border-t border-white/10">
              <div className="max-w-4xl mx-auto px-4 h-8 flex items-center gap-3">
                <User className="h-3 w-3 text-white/40 shrink-0" />
                <span className="text-white/70 text-xs font-medium">{studentInfo.name}</span>
                {studentInfo.studentId && (
                  <>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/50 text-xs font-mono">{studentInfo.studentId}</span>
                  </>
                )}
                {studentInfo.email && (
                  <>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-white/40 text-xs truncate hidden sm:block">{studentInfo.email}</span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
                  <BookOpen className="h-3 w-3" />
                  <span>{answeredCount}/{questions.length} answered</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ── Question area ── */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentQuestion}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {/* Block context */}
              {(q.instructions || q.paragraph || q.image_url) && (
                <div className="mb-4 space-y-3">
                  {q.instructions && (
                    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <span className="text-lg shrink-0">📌</span>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{q.instructions}</p>
                    </div>
                  )}
                  {q.paragraph && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Read carefully</p>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{q.paragraph}</p>
                    </div>
                  )}
                  {q.image_url && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <img src={q.image_url} alt={q.image_caption || "Exam image"} className="w-full max-h-56 object-contain bg-slate-50" />
                      {q.image_caption && <p className="text-xs text-slate-500 text-center py-2 italic">{q.image_caption}</p>}
                    </div>
                  )}
                </div>
              )}

              <Card className="border-slate-200 shadow-lg bg-white">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-[#1e3a5f] bg-[#1e3a5f]/8 px-3 py-1 rounded-full">
                      Question {currentQuestion + 1} · {q.marks} {q.marks === 1 ? "mark" : "marks"}
                    </span>
                    {answers[q.id] && (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        ✓ Answered
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold mb-6 text-[#0f172a] leading-relaxed">{q.question_text}</h2>
                  <AnswerOptions questionId={q.id} options={options} selected={answers[q.id] || ""} onSelect={saveAnswer} />
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <Button type="button" variant="outline" onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
              disabled={currentQuestion === 0} className="gap-2 bg-white">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {isLastQuestion ? (
              <Button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowSubmitConfirm(true)}
                disabled={!allAnswered || submitting}
                className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white border-0">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting…" : "Submit Exam"}
              </Button>
            ) : (
              <Button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
                className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white border-0">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!allAnswered && isLastQuestion && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} still unanswered.
            </div>
          )}

          {/* Question grid */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((qu, i) => (
                <button key={qu.id} type="button" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCurrentQuestion(i)}
                  className={`h-9 w-9 rounded-lg text-sm font-semibold transition-all ${
                    i === currentQuestion
                      ? "bg-[#1e3a5f] text-white shadow-md ring-2 ring-[#1e3a5f]/30"
                      : answers[qu.id]
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#1e3a5f]" /> Current</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-100 border border-green-300" /> Answered</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-50 border border-slate-200" /> Unanswered</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-200 bg-white mt-4">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <img src={logo} alt="NejoExamPrep" className="h-5 w-5 rounded-full object-cover" />
              <span>NejoExamPrep · Nejo Ifa Boru Special Boarding Secondary School</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{answeredCount} of {questions.length} answered</span>
              <span className={`font-semibold ${isTimeLow ? "text-red-500" : "text-slate-500"}`}>
                {formatTime(timeLeft)} remaining
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              Once submitted, you cannot change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)} className="bg-[#1e3a5f] hover:bg-[#162d4a]">
              Yes, Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExamPage;
