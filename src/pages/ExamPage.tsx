import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronLeft, ChevronRight, Send, AlertCircle, Loader2,
  ShieldAlert, ShieldCheck, XCircle, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

// Total violations allowed before ejection
const MAX_VIOLATIONS = 3;

const EVENT_LABELS: Record<CheatEventType, string> = {
  tab_switch: "Tab switching",
  copy_attempt: "Copying content",
  paste_attempt: "Pasting content",
  right_click: "Right-clicking",
  devtools_open: "Opening DevTools",
  inactivity: "Long inactivity",
  window_resize: "Resizing the window",
};

// ── Warning overlay — escalates based on total violation count ──────────────
const CheatWarningOverlay = ({
  event,
  totalViolations,
  onDismiss,
  onEject,
}: {
  event: CheatEventType;
  totalViolations: number;
  onDismiss: () => void;
  onEject: () => void;
}) => {
  const triesLeft = MAX_VIOLATIONS - totalViolations;
  const isFinalWarning = totalViolations === MAX_VIOLATIONS;
  const isEjected = totalViolations > MAX_VIOLATIONS;

  // Auto-eject after 5 s if over limit
  useEffect(() => {
    if (isEjected) {
      const t = setTimeout(onEject, 5000);
      return () => clearTimeout(t);
    }
  }, [isEjected, onEject]);

  if (isEjected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/95 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-8 text-center"
        >
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-9 w-9 text-red-600" />
          </div>
          <h3 className="text-xl font-extrabold text-red-700 mb-2">Removed from Exam</h3>
          <p className="text-slate-600 text-sm mb-2">
            You have been removed due to repeated violations.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Your answers have been submitted and your teacher has been notified.
          </p>
          <div className="text-xs text-slate-400">Redirecting in 5 seconds…</div>
        </motion.div>
      </motion.div>
    );
  }

  if (isFinalWarning) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-orange-950/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center"
        >
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-orange-600" />
          </div>
          <h3 className="text-lg font-extrabold text-orange-700 mb-1">⚠️ Final Warning!</h3>
          <p className="text-slate-700 text-sm font-medium mb-2">
            {EVENT_LABELS[event]} was detected.
          </p>
          <p className="text-slate-600 text-sm mb-4">
            You have used all your chances. <span className="font-bold text-red-600">One more violation and you will be permanently removed from this exam.</span>
          </p>
          <p className="text-xs text-slate-400 mb-5">
            Violation #{totalViolations} — this is your last warning.
          </p>
          <Button
            type="button"
            onClick={onDismiss}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold"
          >
            I Understand — Return to Exam
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  // Standard warning (violations 1–2)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center"
      >
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-[#0f172a] mb-1">
          Warning #{totalViolations}
        </h3>
        <p className="text-slate-700 text-sm font-medium mb-2">
          {EVENT_LABELS[event]} was detected.
        </p>
        <p className="text-slate-600 text-sm mb-1">
          This has been logged and reported to your teacher.
        </p>
        <p className="text-sm font-semibold text-amber-700 mb-5">
          You have{" "}
          <span className="text-red-600">
            {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
          </span>{" "}
          before you are removed from this exam.
        </p>
        <Button
          type="button"
          onClick={onDismiss}
          className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-xl"
        >
          OK — Return to Exam
        </Button>
      </motion.div>
    </motion.div>
  );
};

// ── Main exam page ────────────────────────────────────────────────────────────
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

  // Total violation counter (persists across events)
  const totalViolationsRef = useRef(0);
  const warningOpenRef = useRef(false);
  const [activeWarning, setActiveWarning] = useState<{
    event: CheatEventType;
    total: number;
  } | null>(null);

  // ── Submit handler (shared for auto, manual, and ejection) ──────────────────
  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const sid = sessionStorage.getItem("session_id") || sessionId;
        if (!sid) throw new Error("Session not found");

        const { data: dbQuestions } = await supabase
          .from("questions")
          .select("id, correct_answer")
          .eq("exam_id", examId);

        const correctMap = new Map(
          (dbQuestions || []).map((q) => [q.id, q.correct_answer])
        );

        const answersToUpsert = Object.entries(answers).map(
          ([questionId, selectedAnswer]) => ({
            session_id: sid,
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_correct: correctMap.get(questionId) === selectedAnswer,
          })
        );

        if (answersToUpsert.length > 0) {
          await supabase
            .from("student_answers")
            .upsert(answersToUpsert, { onConflict: "session_id,question_id" });
        }

        const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
        const earnedMarks = answersToUpsert
          .filter((a) => a.is_correct)
          .reduce((s, a) => {
            const q = questions.find((q) => q.id === a.question_id);
            return s + (q?.marks || 0);
          }, 0);

        await supabase
          .from("exam_sessions")
          .update({
            status: "submitted",
            submitted_at: new Date().toISOString(),
            score: earnedMarks,
            total_marks: totalMarks,
          })
          .eq("id", sid);

        if (isAutoSubmit) {
          setExamEnded(true);
        } else {
          navigate(`/exam/${accessCode}/complete`);
        }
      } catch (error: any) {
        toast({
          title: "Error submitting",
          description: error.message,
          variant: "destructive",
        });
        setSubmitting(false);
      }
    },
    [submitting, sessionId, examId, answers, questions, navigate, accessCode, toast]
  );

  // ── Eject handler ────────────────────────────────────────────────────────────
  const handleEject = useCallback(() => {
    warningOpenRef.current = false;
    handleSubmit(true);
    setEjected(true);
    setTimeout(() => navigate("/"), 5000);
  }, [handleSubmit, navigate]);

  // ── Cheat event handler ──────────────────────────────────────────────────────
  const handleCheatWarning = useCallback(
    (event: CheatEventType, _perEventCount: number) => {
      // If a warning is already showing, ignore new events until dismissed
      if (warningOpenRef.current) return;

      totalViolationsRef.current += 1;
      const total = totalViolationsRef.current;

      if (total > MAX_VIOLATIONS) {
        // Already past limit — eject immediately
        handleEject();
        return;
      }

      warningOpenRef.current = true;
      setActiveWarning({ event, total });
    },
    [handleEject]
  );

  const { requestFullscreen } = useCheatPrevention({
    sessionId,
    securityLevel,
    onWarning: handleCheatWarning,
    enabled: !loading && !examEnded && !ejected && !!sessionId,
  });

  // ── Load exam ────────────────────────────────────────────────────────────────
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

      if (!exam || exam.status !== "active") {
        setExamEnded(true);
        setLoading(false);
        return;
      }

      setExamId(exam.id);
      setSecurityLevel(((exam as any).security_level as SecurityLevel) || "low");

      const startedAt = exam.started_at
        ? new Date(exam.started_at).getTime()
        : Date.now();
      const endTime = startedAt + exam.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

      if (remaining <= 0) { setExamEnded(true); setLoading(false); return; }
      setTimeLeft(remaining);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, marks, question_order")
        .eq("exam_id", exam.id)
        .order("question_order");
      setQuestions(qs || []);

      const { data: existingAnswers } = await supabase
        .from("student_answers")
        .select("question_id, selected_answer")
        .eq("session_id", sid);
      if (existingAnswers) {
        const ansMap: Record<string, string> = {};
        existingAnswers.forEach((a) => {
          if (a.selected_answer) ansMap[a.question_id] = a.selected_answer;
        });
        setAnswers(ansMap);
      }
      setLoading(false);
    };
    loadExam();
  }, [accessCode, navigate]);

  // ── Countdown timer ──────────────────────────────────────────────────────────
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

  // ── Auto-save answer ─────────────────────────────────────────────────────────
  const saveAnswer = async (questionId: string, selectedAnswer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedAnswer }));
    const sid = sessionStorage.getItem("session_id");
    if (!sid) return;
    await supabase.from("student_answers").upsert(
      { session_id: sid, question_id: questionId, selected_answer: selectedAnswer },
      { onConflict: "session_id,question_id" }
    );
  };

  // ── Screens ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (examEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <Card className="border-border/50 shadow-xl">
            <CardContent className="pt-10 pb-8">
              <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Exam Completed</h1>
              <p className="text-muted-foreground mb-6">
                Your answers have been submitted. Your teacher will send results via email.
              </p>
              <Button type="button" onClick={() => navigate("/")} variant="outline">Back to Home</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <div className="min-h-screen bg-background select-none">
      {/* Warning / ejection overlay */}
      <AnimatePresence>
        {activeWarning && (
          <CheatWarningOverlay
            event={activeWarning.event}
            totalViolations={activeWarning.total}
            onDismiss={() => {
              warningOpenRef.current = false;
              if (activeWarning.total > MAX_VIOLATIONS) {
                handleEject();
              } else {
                setActiveWarning(null);
                requestFullscreen();
              }
            }}
            onEject={handleEject}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <Progress
              value={questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0}
              className="w-32 h-2"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Violation counter badge */}
            {totalViolations > 0 && (
              <div className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                totalViolations >= MAX_VIOLATIONS
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : totalViolations >= 2
                  ? "bg-orange-100 text-orange-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                <ShieldAlert className="h-3.5 w-3.5" />
                {totalViolations}/{MAX_VIOLATIONS} warnings
              </div>
            )}
            {/* Security level badge */}
            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              securityLevel === "high" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
            }`}>
              {securityLevel === "high"
                ? <ShieldAlert className="h-3.5 w-3.5" />
                : <ShieldCheck className="h-3.5 w-3.5" />}
              {securityLevel === "high" ? "High Security" : "Standard"}
            </div>
            {/* Timer */}
            <div className={`flex items-center gap-2 font-mono text-lg font-bold ${
              isTimeLow ? "text-destructive animate-pulse" : "text-foreground"
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
            transition={{ duration: 0.3 }}
          >
            <Card className="border-border/50 shadow-xl">
              <CardContent className="pt-8 pb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {q.marks} marks
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {answeredCount}/{questions.length} answered
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-6 mt-4">{q.question_text}</h2>
                <RadioGroup
                  value={answers[q.id] || ""}
                  onValueChange={(value) => saveAnswer(q.id, value)}
                  className="space-y-3"
                >
                  {options.map((opt, i) => (
                    <motion.div
                      key={opt.key}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Label
                        htmlFor={`option-${opt.key}`}
                        className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 ${
                          answers[q.id] === opt.key
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={opt.key} id={`option-${opt.key}`} />
                        <span className="font-medium text-sm">{opt.key}.</span>
                        <span>{opt.text}</span>
                      </Label>
                    </motion.div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          {isLastQuestion ? (
            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!allAnswered || submitting}
              className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
              className="gap-2"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!allAnswered && isLastQuestion && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Please answer all questions before submitting.
          </div>
        )}

        {/* Question indicators */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {questions.map((qu, i) => (
            <button
              key={qu.id}
              type="button"
              onClick={() => setCurrentQuestion(i)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                i === currentQuestion
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : answers[qu.id]
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExamPage;
