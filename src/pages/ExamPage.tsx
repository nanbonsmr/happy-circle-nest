import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, AlertCircle, Loader2,
  ShieldAlert, XCircle, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  block_id: string | null;
  block_order: number;
  instructions: string | null;
  paragraph: string | null;
  image_url: string | null;
  image_caption: string | null;
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

  const [currentQuestion, setCurrentQuestion] = useState(() => {
    // Restore last question position on reconnect
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
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("low");

  const totalViolationsRef = useRef(0);
  const warningOpenRef = useRef(false);
  const [activeWarning, setActiveWarning] = useState<{ event: CheatEventType; total: number } | null>(null);
  const [fullscreenReady] = useState(true); // No gate screen — CSS overlay handles visual fullscreen
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [ejectedByViolation, setEjectedByViolation] = useState(false);

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
      else {
        // Clean up violation counter on successful submit
        const sid2 = sessionStorage.getItem("session_id") || sessionId;
        if (sid2) {
          localStorage.removeItem(`violations_${sid2}`);
          sessionStorage.removeItem(`q_pos_${sid2}`);
        }
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

    // Zero out the score and mark as ejected by violation
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

    // Persist violation count so it survives page refresh
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
    enabled: !loading && !examEnded && !ejected && !!sessionId && fullscreenReady,
  });

  useEffect(() => {
    const sid = sessionStorage.getItem("session_id");
    if (!sid) { navigate(`/exam/${accessCode}`); return; }
    setSessionId(sid);

    // Restore violation count from localStorage (survives refresh)
    const stored = parseInt(localStorage.getItem(`violations_${sid}`) || "0", 10);
    if (stored > 0) {
      totalViolationsRef.current = stored;
      // If already ejected before refresh, show ejection screen immediately
      if (stored >= MAX_VIOLATIONS) {
        setEjectedByViolation(true);
        setLoading(false);
        return;
      }
    }

    // Block accidental refresh/close during exam
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Refreshing will not reset your violations. Are you sure?";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const loadExam = async () => {
      const { data: exam } = await supabase
        .from("exams")
        .select("id, duration_minutes, started_at, status, security_level")
        .eq("access_code", accessCode || "")
        .maybeSingle();

      if (!exam || exam.status !== "active") { setExamEnded(true); setLoading(false); return; }

      setExamId(exam.id);
      setSecurityLevel((exam.security_level as SecurityLevel) || "low");

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
        existingAnswers.forEach((a: any) => { if (a.selected_answer) ansMap[a.question_id] = a.selected_answer; });
        setAnswers(ansMap);
        if (Object.keys(ansMap).length > 0) {
          toast({ title: "Welcome back!", description: "Your previous answers have been restored." });
        }
      }
      setLoading(false);

      // Real-time: detect if teacher closes exam while student is taking it
      const examChannel = supabase.channel(`exam-status-${exam.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${exam.id}` },
          (payload) => {
            if (payload.new.status !== "active") {
              setExamEnded(true);
            }
          })
        .subscribe();

      return () => { supabase.removeChannel(examChannel); };
    };

    let cleanupExamChannel: (() => void) | undefined;
    loadExam().then((cleanup) => { cleanupExamChannel = cleanup; });

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      cleanupExamChannel?.();
    };
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

  // Persist current question position so it survives reconnect
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (ejectedByViolation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-950 p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white shadow-2xl p-8">
            <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-red-700 mb-3">Your Score Has Been Removed</h1>
            <p className="text-slate-600 mb-2">
              You reached <strong>{MAX_VIOLATIONS} violations</strong> during this exam.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Your score has been set to <strong>0</strong> and your teacher has been notified. This action cannot be undone.
            </p>
            <Button type="button" onClick={() => navigate("/")} variant="outline" className="w-full">
              Return to Home
            </Button>
          </div>
        </motion.div>
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

  return (
    <>
      {/* ── CSS fullscreen overlay — covers entire viewport, no browser API ── */}
      <div className="fixed inset-0 z-[100] bg-gray-100 overflow-hidden select-none exam-fullscreen">
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

        {/* Minimal top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">E</span>
              </div>
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
            </div>
            <div className="text-sm text-gray-600">
              MAMITU TOLA HUJUQA | 000074480
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex h-[calc(100vh-60px)]">
          {/* Left side - Question content */}
          <div className="flex-1 p-8 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl"
              >
                {/* Section title */}
                <h1 className="text-lg font-medium text-gray-800 mb-6">direction I</h1>

                {/* Instructions/Paragraph */}
                {(q.instructions || q.paragraph) && (
                  <div className="mb-6 text-sm text-gray-600 leading-relaxed">
                    {q.instructions && <p className="mb-3">{q.instructions}</p>}
                    {q.paragraph && <p>{q.paragraph}</p>}
                  </div>
                )}

                {/* Question */}
                <div className="mb-6">
                  <p className="text-base text-gray-800 font-medium mb-4">
                    {currentQuestion + 1}.{q.marks > 1 ? ` (${q.marks} marks)` : ''} {q.question_text}
                  </p>

                  {/* Answer options */}
                  <div className="space-y-3">
                    {options.map((opt) => {
                      const isSelected = answers[q.id] === opt.key;
                      return (
                        <label
                          key={opt.key}
                          htmlFor={`opt-${q.id}-${opt.key}`}
                          className="flex items-start gap-3 cursor-pointer group"
                        >
                          <div className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300 group-hover:border-blue-400"
                          }`}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium text-gray-700">{opt.key}.</span>
                            <span className="text-gray-700">{opt.text}</span>
                          </div>
                          <input
                            type="radio"
                            id={`opt-${q.id}-${opt.key}`}
                            name={`question-${q.id}`}
                            value={opt.key}
                            checked={isSelected}
                            onChange={() => saveAnswer(q.id, opt.key)}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Image if present */}
                {q.image_url && (
                  <div className="mb-6">
                    <img src={q.image_url} alt={q.image_caption || "Exam image"}
                      className="max-w-full h-auto border border-gray-200 rounded" />
                    {q.image_caption && (
                      <p className="text-xs text-gray-500 mt-2 italic">{q.image_caption}</p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right side - Timer and Navigation */}
          <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col">
            {/* Timer */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-3 py-2 border rounded text-sm font-mono ${
                isTimeLow ? "border-red-300 bg-red-50 text-red-700" : "border-gray-300 bg-gray-50 text-gray-700"
              }`}>
                <Clock className="h-4 w-4" />
                {Math.floor(timeLeft / 3600).toString().padStart(2, '0')}:
                {Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:
                {(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* Question navigation grid */}
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((qu: Question, i: number) => (
                  <button
                    key={qu.id}
                    type="button"
                    onClick={() => setCurrentQuestion(i)}
                    className={`h-8 w-8 text-xs font-medium rounded transition-all ${
                      i === currentQuestion
                        ? "bg-blue-600 text-white"
                        : answers[qu.id]
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentQuestion((p: number) => Math.max(0, p - 1))}
                  disabled={currentQuestion === 0}
                  className="flex-1 text-sm"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentQuestion((p: number) => Math.min(questions.length - 1, p + 1))}
                  disabled={currentQuestion === questions.length - 1}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Next
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={!allAnswered || submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Exam"
                )}
              </Button>
            </div>

            {/* Status indicator */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              {answeredCount}/{questions.length} questions answered
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              Once submitted, you cannot change your answers. Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSubmit(false)}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              Yes, Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExamPage;
