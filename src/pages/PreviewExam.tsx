import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Eye, ArrowLeft, ArrowRight, Flag, Send,
  Monitor, Tablet, Smartphone, X, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ExamBlock } from "@/components/ExamBlockEditor";

const PREVIEW_KEY = "exam_preview_snapshot";
const PREVIEW_STATE_KEY = "exam_preview_state";

interface PreviewSnapshot {
  title: string;
  subject: string;
  duration_minutes: number;
  blocks: ExamBlock[];
  returnTo: string; // path to go back to (editor)
}

interface FlatQuestion {
  id: string;
  blockIndex: number;
  blockId: string;
  questionIndex: number;
  text: string;
  options: string[];
  optionImages: string[];
  correctAnswer: string;
  instructions?: string;
  paragraph?: string;
  imageUrl?: string;
  imageCaption?: string;
}

type Device = "desktop" | "tablet" | "mobile";

const PreviewExam = () => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Load snapshot
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY);
      if (!raw) {
        navigate("/teacher");
        return;
      }
      const snap = JSON.parse(raw) as PreviewSnapshot;
      setSnapshot(snap);
      setTimeLeft((snap.duration_minutes || 30) * 60);

      // Restore preview state if any
      const savedState = sessionStorage.getItem(PREVIEW_STATE_KEY);
      if (savedState) {
        try {
          const s = JSON.parse(savedState);
          if (s.answers) setAnswers(s.answers);
          if (s.flagged) setFlagged(s.flagged);
          if (s.visited) setVisited(s.visited);
          if (typeof s.currentIdx === "number") setCurrentIdx(s.currentIdx);
          if (typeof s.timeLeft === "number") setTimeLeft(s.timeLeft);
          if (s.device) setDevice(s.device);
        } catch { /* ignore */ }
      }
    } catch {
      navigate("/teacher");
    }
  }, [navigate]);

  // Flatten blocks → questions
  const questions = useMemo<FlatQuestion[]>(() => {
    if (!snapshot) return [];
    const out: FlatQuestion[] = [];
    snapshot.blocks.forEach((b, bi) => {
      b.questions.forEach((q, qi) => {
        out.push({
          id: q.id || `${bi}-${qi}`,
          blockIndex: bi,
          blockId: b.id,
          questionIndex: qi,
          text: q.text,
          options: q.options,
          optionImages: q.optionImages || ["", "", "", ""],
          correctAnswer: q.correctAnswer,
          instructions: qi === 0 ? b.instructions : undefined,
          paragraph: qi === 0 ? b.paragraph : undefined,
          imageUrl: qi === 0 ? b.imageUrl : undefined,
          imageCaption: qi === 0 ? b.imageCaption : undefined,
        });
      });
    });
    return out;
  }, [snapshot]);

  // Mark visited
  useEffect(() => {
    if (!questions.length) return;
    const q = questions[currentIdx];
    if (q && !visited[q.id]) {
      setVisited((prev) => ({ ...prev, [q.id]: true }));
    }
  }, [currentIdx, questions, visited]);

  // Persist preview state
  useEffect(() => {
    if (!snapshot) return;
    sessionStorage.setItem(
      PREVIEW_STATE_KEY,
      JSON.stringify({ answers, flagged, visited, currentIdx, timeLeft, device }),
    );
  }, [answers, flagged, visited, currentIdx, timeLeft, device, snapshot]);

  // Timer
  useEffect(() => {
    if (!snapshot || submitted || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { clearInterval(t); setSubmitted(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [snapshot, submitted, timeLeft]);

  const exitPreview = useCallback(() => {
    const back = snapshot?.returnTo || "/teacher";
    sessionStorage.removeItem(PREVIEW_KEY);
    sessionStorage.removeItem(PREVIEW_STATE_KEY);
    navigate(back);
  }, [snapshot, navigate]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">No questions to preview</h2>
            <p className="text-slate-500 mb-6">Add some questions in the editor first.</p>
            <Button onClick={exitPreview}>Back to Editor</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentIdx];
  const opts = ["A", "B", "C", "D"].map((k, i) => ({
    key: k,
    text: q.options[i],
    image: q.optionImages[i],
  }));
  const isLow = timeLeft < 300;
  const answeredCount = Object.keys(answers).length;
  const isLast = currentIdx === questions.length - 1;

  // Device frame max widths
  const deviceWidth: Record<Device, string> = {
    desktop: "max-w-none",
    tablet: "max-w-[820px]",
    mobile: "max-w-[420px]",
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── Preview banner ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-amber-100 border-b-2 border-amber-300 shadow-sm">
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-amber-900">
            <div className="h-7 w-7 rounded-full bg-amber-200 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <span className="font-semibold">Preview Mode</span>
              <span className="hidden sm:inline text-amber-800/80"> — Results will not be recorded.</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Device toggle */}
            <div className="hidden sm:flex items-center bg-white/80 border border-amber-300 rounded-lg p-0.5">
              {([
                { d: "desktop" as Device, Icon: Monitor },
                { d: "tablet" as Device, Icon: Tablet },
                { d: "mobile" as Device, Icon: Smartphone },
              ]).map(({ d, Icon }) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={`p-1.5 rounded-md transition-all ${
                    device === d ? "bg-amber-500 text-white" : "text-amber-800 hover:bg-amber-100"
                  }`}
                  title={d}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={exitPreview}
              className="bg-white border-amber-400 text-amber-900 hover:bg-amber-50 gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Return to Edit
            </Button>
          </div>
        </div>
      </div>

      {/* ── Device-framed exam shell ───────────────────────────────────── */}
      <div className="flex-1 flex justify-center p-3 sm:p-6">
        <div
          className={`w-full ${deviceWidth[device]} bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col`}
        >
          {/* Top bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">E</span>
              </div>
              <div className="text-sm font-semibold text-slate-800 truncate">
                {snapshot.title || "Untitled Exam"}
                {snapshot.subject && (
                  <span className="text-slate-400 font-normal ml-2">· {snapshot.subject}</span>
                )}
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-mono font-semibold ${
                isLow
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-slate-300 bg-slate-50 text-slate-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Body — adaptive layout */}
          <div className={`flex-1 ${device === "mobile" ? "flex flex-col" : "flex flex-col lg:flex-row"}`}>
            {/* Question area */}
            <div className="flex-1 p-5 sm:p-8 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-3xl mx-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                      Section {q.blockIndex + 1} · Question {currentIdx + 1} of {questions.length}
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        setFlagged((p) => ({ ...p, [q.id]: !p[q.id] }))
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                        flagged[q.id]
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {flagged[q.id] ? "Flagged" : "Flag for review"}
                    </button>
                  </div>

                  {/* Section context */}
                  {(q.instructions || q.paragraph || q.imageUrl) && (
                    <div className="mb-5 space-y-3">
                      {q.instructions && (
                        <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-amber-900">
                          <strong>Instructions:</strong> {q.instructions}
                        </div>
                      )}
                      {q.paragraph && (
                        <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-900 whitespace-pre-wrap">
                          {q.paragraph}
                        </div>
                      )}
                      {q.imageUrl && (
                        <div>
                          <img
                            src={q.imageUrl}
                            alt={q.imageCaption || "Section image"}
                            className="max-w-full h-auto border border-slate-200 rounded-lg"
                          />
                          {q.imageCaption && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">{q.imageCaption}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question */}
                  <div className="mb-6">
                    <p className="text-base sm:text-lg text-slate-900 font-medium leading-relaxed mb-5">
                      <span className="text-slate-400 mr-2">{currentIdx + 1}.</span>
                      {q.text || <span className="italic text-slate-400">No question text</span>}
                    </p>

                    {/* Options */}
                    <div className="space-y-2.5">
                      {opts.map((opt) => {
                        const selected = answers[q.id] === opt.key;
                        return (
                          <label
                            key={opt.key}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                              selected
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                              }`}
                            >
                              {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex gap-2">
                                <span className="font-semibold text-slate-700">{opt.key}.</span>
                                {opt.text && <span className="text-slate-800">{opt.text}</span>}
                              </div>
                              {opt.image && (
                                <img
                                  src={opt.image}
                                  alt={`Option ${opt.key}`}
                                  className="mt-2 max-h-32 object-contain rounded border border-slate-200 bg-white"
                                />
                              )}
                            </div>
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={selected}
                              onChange={() =>
                                setAnswers((p) => ({ ...p, [q.id]: opt.key }))
                              }
                              className="sr-only"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                      disabled={currentIdx === 0}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                    {isLast ? (
                      <Button
                        onClick={() => setShowSubmitConfirm(true)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Send className="h-4 w-4" /> Submit Exam
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Next <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Question palette */}
            <div
              className={`bg-slate-50 border-slate-200 ${
                device === "mobile"
                  ? "border-t p-4"
                  : "border-t lg:border-t-0 lg:border-l p-4 lg:p-5 lg:w-72"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Question Palette
                </h3>
                <span className="text-xs text-slate-500">
                  {answeredCount}/{questions.length}
                </span>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-white border border-slate-300" /> Not visited
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-white border-2 border-slate-500" /> Visited
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-green-600" /> Answered
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative h-3 w-3 rounded bg-white border border-slate-300 overflow-hidden">
                    <span className="absolute top-0 right-0 h-0 w-0 border-t-[6px] border-l-[6px] border-t-red-500 border-l-transparent" />
                  </span>{" "}
                  Flagged
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((qu, i) => {
                  const isAnswered = !!answers[qu.id];
                  const isVisited = !!visited[qu.id];
                  const isFlagged = !!flagged[qu.id];
                  const isCurrent = i === currentIdx;

                  let cls = "bg-white text-slate-600 border border-slate-300";
                  if (isAnswered) cls = "bg-green-600 text-white border border-green-700";
                  else if (isVisited) cls = "bg-white text-slate-700 border-2 border-slate-500";

                  return (
                    <button
                      key={qu.id}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      className={`relative h-9 w-9 text-xs font-semibold rounded-md transition-all overflow-hidden ${cls} ${
                        isCurrent ? "ring-2 ring-blue-500 ring-offset-1" : "hover:scale-105"
                      }`}
                    >
                      {i + 1}
                      {isFlagged && (
                        <span className="absolute top-0 right-0 h-0 w-0 border-t-[10px] border-l-[10px] border-t-red-500 border-l-transparent" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="sm"
              >
                <Send className="h-4 w-4" /> Submit Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "Back to Editor" button */}
      <button
        type="button"
        onClick={exitPreview}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium shadow-2xl hover:bg-slate-800 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Editor
      </button>

      {/* Submit / completion dialog */}
      <AlertDialog
        open={showSubmitConfirm || submitted}
        onOpenChange={(o) => {
          if (!o && !submitted) setShowSubmitConfirm(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {submitted ? "Preview submitted" : "Submit preview exam?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {submitted
                ? "This was a preview — nothing has been saved or recorded. You can return to the editor to keep building."
                : `You have answered ${answeredCount} of ${questions.length} questions. This is a preview, so nothing will be recorded.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!submitted && (
              <AlertDialogCancel>Continue Preview</AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={() => {
                if (submitted) {
                  exitPreview();
                } else {
                  setSubmitted(true);
                  setShowSubmitConfirm(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitted ? "Back to Editor" : "Submit Preview"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PreviewExam;
