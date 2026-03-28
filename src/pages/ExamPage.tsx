import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2,
  ShieldAlert, ShieldCheck, XCircle, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCheatPrevention, type CheatEventType, type SecurityLevel } from "@/hooks/useCheatPrevention";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  question_order: number;
}

const MAX_VIOLATIONS = 3;

const EVENT_LABELS: Record<CheatEventType, string> = {
  tab_switch: "Tab switching detected",
  fullscreen_exit: "Attempting to exit exam screen",
  copy_attempt: "Copying content",
  paste_attempt: "Pasting content",
  devtools_open: "Opening DevTools",
  inactivity: "Long inactivity",
  window_resize: "Resizing the window",
};

const CheatWarningOverlay = ({
  event, totalViolations, onDismiss, onEject,
}: {
  event: CheatEventType;
  totalViolations: number;
  onDismiss: () => void;
  onEject: () => void;
}) => {
  const triesLeft = MAX_VIOLATIONS - totalViolations;
  const isFinalWarning = totalViolations === MAX_VIOLATIONS;
  const isEjected = totalViolations > MAX_VIOLATIONS;

  useEffect(() => {
    if (isEjected) {
      const t = setTimeout(onEject, 5000);
      return () => clearTimeout(t);
    }
  }, [isEjected, onEject]);

  if (isEjected) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-red-950/95 p-4">
        <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }}
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8 text-center">
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
  }

  if (isFinalWarning) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-orange-950/80 p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
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
          <Button type="button" onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()} onClick={onDismiss}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold">
            I Understand — Return to Exam
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-[#0f172a] mb-1">Warning #{totalViolations}</h3>
        <p className="text-slate-700 text-sm font-medium mb-2">{EVENT_LABELS[event]}</p>
        <p className="text-slate-600 text-sm mb-1">This has been logged and reported to your teacher.</p>
        <p className="text-sm font-semibold text-amber-700 mb-5">
          You have{" "}
          <span className="text-red-600">{triesLeft} {triesLeft === 1 ? "try" : "tries"} left</span>{" "}
          before you are removed from this exam.
        </p>
        <Button type="button" onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()} onClick={onDismiss}
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

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examId, setExamId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [examEnded, setExamEnded] = useState(false);
  const [ejected, setEjected] = useState(false);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("low");

  const totalViolationsRef = useRef(0);
  const warningOpenRef = useRef(false);
  const [activeWarning, setActiveWarning] = useState<{ event: CheatEventType; total: number } | null>(null);
  const [fullscreenReady, setFullscreenReady] = useState(false);

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const sid = sessionStorage.getItem("session_id") || sessionId;
      if (!sid) throw new Error("Session not found");

      const { data: dbQuestions } = await supabase
        .from("questions").select("id, correct_answer").eq("exam_id", examId);
      const correctMap = new Map((dbQuestions || []).map((q: any) => [q.id, q.correct_answer]));

      const answersToUpsert = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        session_id: sid,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: correctMap.get(questionId) === selectedAnswer,
      }));

      if (answersToUpsert.length > 0) {
        await supabase.from("student_answers")
          .upsert(answersToUpsert, { onConflict: "session_id,question_id" });
      }

      const totalMarks = questions.reduce((s: number, q: Question) => s + q.marks, 0);
      const earnedMarks = answersToUpsert
        .filter((a) => a.is_correct)
        .reduce((s: number, a) => {
          const q = questions.find((q: Question) => q.id === a.question_id);
          return s + (q?.marks || 0);
        }, 0);

      await supabase.from("exam_sessions").update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score: earnedMarks,
        total_marks: totalMarks,
      }).eq("id", sid);

      if (isAutoSubmit) { setExamEnded(true); }
      else { navigate(`/exam/${accessCode}/complete`); }
    } catch (error: any) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
      setSubmitting(false);
    }
  }, [submitting, sessionId, examId, answers, questions, navigate, accessCode, toast]);

  const handleEject = useCallback(() => {
    warningOpenRef.current = false;
    handleSubmit(true);
    setEjected(true);
    setTimeout(() => navigate("/"), 5000);
  }, [handleSubmit, navigate]);

  const handleCheatWarning = useCallback((event: CheatEventType, _count: number) => {
    if (warningOpenRef.current) return;
    totalViolationsRef.current += 1;
    const total = totalViolationsRef.current;
    if (total > MAX_VIOLATIONS) { handleEject(); return; }
    warningOpenRef.current = true;
    setActiveWarning({ event, total });
  }, [handleEject]);

  const { requestFullscreen } = useCheatPrevention({
    sessionId,
    securityLevel,
    onWarning: handleCheatWarning,
    enabled: !loading && !examEnded && !ejected && !!sessionId && fullscreenReady,
  });

  useEffect(() => {
    const sid = sessionStorage.getItem("session_id");
    if (!sid) { navigate(`/exam/${accessCode}`); return; }
    setSessionId(sid);

    const loadExam = async () => {
      const { data: exam } = await supabase
        .from("exams")
        .select("id, duration_minutes, started_at, status, security_level")
        .eq("access_code", accessCode || "")
        .maybeSingle();

      if (!exam || exam.status !== "active") { setExamEnded(true); setLoading(false); return; }

      setExamId(exam.id);
      setSecurityLevel(((exam as any).security_level as SecurityLevel) || "low");

      const startedAt = exam.started_at ? new Date(exam.started_at).getTime() : Date.now();
      const endTime = startedAt + exam.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (remaining <= 0) { setExamEnded(true); setLoading(false); return; }
      setTimeLeft(remaining);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, marks, question_order")
        .eq("exam_id", exam.id).order("question_order");
      setQuestions(qs || []);

      const { data: existingAnswers } = await supabase
        .from("student_answers").select("question_id, selected_answer").eq("session_id", sid);
      if (existingAnswers) {
        const ansMap: Record<string, string> = {};
        existingAnswers.forEach((a: any) => { if (a.selected_answer) ansMap[a.question_id] = a.selected_answer; });
        setAnswers(ansMap);
      }
      setLoading(false);
    };
    loadExam();
  }, [accessCode, navigate]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || examEnded || ejected) return;
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, handleSubmit, timeLeft, examEnded, ejected]);

  const saveAnswer = async (questionId: string, selectedAnswer: string) => {
    setAnswers((prev: Record<string, string>) => ({ ...prev, [questionId]: selectedAnswer }));
    const sid = sessionStorage.getItem("session_id");
    if (!sid) return;
    await supabase.from("student_answers").upsert(
      { session_id: sid, question_id: questionId, selected_answer: selectedAnswer },
      { onConflict: "session_id,question_id" }
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (examEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-10 pb-8">
              <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Exam Completed</h1>
              <p className="text-muted-foreground mb-6">Your answers have been submitted. Your teacher will send results via email.</p>
              <Button type="button" onClick={() => navigate("/")} variant="outline">Back to Home</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">No Questions</h2>
            <p className="text-muted-foreground">This exam has no questions yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // ── Fullscreen gate — shown before exam starts ───────────────────────────
  if (!fullscreenReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl bg-white shadow-2xl p-8 text-center">
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#0f172a] mb-2">Ready to Begin?</h2>
            <p className="text-slate-500 text-sm mb-6">
              The exam will open in fullscreen mode. Do not exit fullscreen during the exam — it will be counted as a violation.
            </p>
            <Button
              type="button"
              className="w-full h-12 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold rounded-xl text-base"
              onClick={() => {
                document.documentElement
                  .requestFullscreen({ navigationUI: "hide" })
                  .catch(() => {})
                  .finally(() => {
                    setFullscreenReady(true);
                  });
              }}
            >
              Enter Fullscreen &amp; Start Exam
            </Button>
            <p className="text-xs text-slate-400 mt-3">
              If fullscreen is blocked by your browser, the exam will still run.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* ── CSS fullscreen overlay — covers entire viewport, no browser API ── */}
      {/* This cannot be exited by Escape, F11, or clicking — unlike browser fullscreen */}
      <div
        className="fixed inset-0 z-[100] bg-[#f8fafc] overflow-y-auto select-none exam-fullscreen"
      >
        {/* Warning overlay */}
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

        {/* Top bar */}
        <div className="sticky top-0 z-[150] bg-[#1e3a5f] shadow-md">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white/70">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <Progress
                value={questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0}
                className="w-32 h-2 bg-white/20"
              />
            </div>
            <div className="flex items-center gap-3">
              {totalViolations > 0 && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  totalViolations >= MAX_VIOLATIONS ? "bg-red-500 text-white animate-pulse"
                  : totalViolations >= 2 ? "bg-orange-400 text-white"
                  : "bg-amber-400 text-white"
                }`}>
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {totalViolations}/{MAX_VIOLATIONS} warnings
                </div>
              )}
              <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                securityLevel === "high" ? "bg-red-500/20 text-red-200" : "bg-green-500/20 text-green-200"
              }`}>
                {securityLevel === "high" ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {securityLevel === "high" ? "High Security" : "Standard"}
              </div>
              <div className={`flex items-center gap-2 font-mono text-lg font-bold ${
                isTimeLow ? "text-red-300 animate-pulse" : "text-white"
              }`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="container max-w-2xl py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-slate-200 shadow-xl bg-white">
                <CardContent className="pt-8 pb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 px-2.5 py-1 rounded-full">
                      {q.marks} marks
                    </span>
                    <span className="text-xs text-slate-500">{answeredCount}/{questions.length} answered</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-6 mt-4 text-[#0f172a]">{q.question_text}</h2>

                  {/* Answer options — pure div, no focusable elements, no fullscreen exit */}
                  <div className="space-y-3">
                    {options.map((opt, i) => {
                      const selected = answers[q.id] === opt.key;
                      return (
                        <motion.div
                          key={opt.key}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()}
                          onTouchStart={(e: { preventDefault: () => void }) => e.preventDefault()}
                          onClick={() => saveAnswer(q.id, opt.key)}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={-1}
                          className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                            selected
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-sm"
                              : "border-slate-200 hover:border-[#1e3a5f]/30 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? "border-[#1e3a5f] bg-[#1e3a5f]" : "border-slate-300"
                          }`}>
                            {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-semibold text-sm text-[#1e3a5f]">{opt.key}.</span>
                          <span className="text-[#0f172a]">{opt.text}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()}
              onClick={() => setCurrentQuestion((p: number) => Math.max(0, p - 1))}
              disabled={currentQuestion === 0}
              className="gap-2 bg-white"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {isLastQuestion ? (
              <Button
                type="button"
                onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()}
                onClick={() => handleSubmit(false)}
                disabled={!allAnswered || submitting}
                className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white border-0"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Exam"}
              </Button>
            ) : (
              <Button
                type="button"
                onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()}
                onClick={() => setCurrentQuestion((p: number) => Math.min(questions.length - 1, p + 1))}
                className="gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white border-0"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!allAnswered && isLastQuestion && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Please answer all questions before submitting.
            </div>
          )}

          {/* Question indicators */}
          <div className="mt-8 flex flex-wrap gap-2 justify-center pb-8">
            {questions.map((qu: Question, i: number) => (
              <button
                key={qu.id}
                type="button"
                onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()}
                onClick={() => setCurrentQuestion(i)}
                className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                  i === currentQuestion
                    ? "bg-[#1e3a5f] text-white shadow-md"
                    : answers[qu.id]
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ExamPage;
