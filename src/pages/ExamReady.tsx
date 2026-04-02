import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const rules = [
  "Press F11 on your keyboard to enter fullscreen mode before the exam starts.",
  "Do not switch tabs or leave the exam window.",
  "Each question must be answered before moving forward.",
  "The exam will auto-submit when the timer runs out.",
  "You cannot go back once the exam is submitted.",
  "Ensure a stable internet connection throughout the exam.",
  "5 violations (tab switching, exiting fullscreen) will result in your score being removed.",
];

const ExamReady = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [examStatus, setExamStatus] = useState<string>("published");
  const [examTitle, setExamTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loadingExam, setLoadingExam] = useState(true);
  const [examError, setExamError] = useState("");

  useEffect(() => {
    const sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) { navigate(`/exam/${accessCode}`); return; }

    const loadExam = async () => {
      // Use ilike for case-insensitive match + maybeSingle to avoid crash
      const { data: exam, error } = await supabase
        .from("exams")
        .select("id, title, status, duration_minutes")
        .ilike("access_code", accessCode || "")
        .maybeSingle();

      if (error || !exam) {
        setExamError("Exam not found. Please check your access code.");
        setLoadingExam(false);
        return;
      }

      setExamTitle(exam.title);
      setExamStatus(exam.status);
      setDuration(exam.duration_minutes);

      // Fetch question count - use select without head to work around RLS
      const { data: questionsData } = await supabase
        .from("questions")
        .select("id")
        .eq("exam_id", exam.id);
      setQuestionCount(questionsData?.length || 0);
      setLoadingExam(false);

      // If already active, go straight to exam
      if (exam.status === "active") {
        await supabase
          .from("exam_sessions")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", sessionId);
        navigate(`/exam/${accessCode}/take`);
        return;
      }

      const channel = supabase
        .channel(`exam-ready-${exam.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${exam.id}` },
          async (payload) => {
            const newExam = payload.new as any;
            const newStatus = newExam.status;
            setExamStatus(newStatus);
            
            if (newStatus === "active") {
              const sid = sessionStorage.getItem("session_id");
              if (sid) {
                await supabase
                  .from("exam_sessions")
                  .update({ status: "in_progress", started_at: new Date().toISOString() })
                  .eq("id", sid);
              }
              navigate(`/exam/${accessCode}/take`);
            } else if (newExam.title !== examTitle) {
              // Exam details were updated
              setExamTitle(newExam.title);
              setDuration(newExam.duration_minutes);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let cleanupChannel: (() => void) | undefined;
    loadExam().then((cleanup) => { cleanupChannel = cleanup; });

    return () => { cleanupChannel?.(); };
  }, [accessCode, navigate]);

  const isWaiting = examStatus !== "active";

  if (loadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (examError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <p className="text-destructive font-semibold mb-4">{examError}</p>
          <button type="button" onClick={() => navigate("/student")}
            className="px-6 py-2 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:bg-[#162d4a] transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{examTitle || "Exam Instructions"}</h1>
          <p className="text-muted-foreground mt-1">Please read carefully before the exam begins</p>
        </div>

        {/* Exam info */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="border-border/50"><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{duration}</p><p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{questionCount}</p><p className="text-xs text-muted-foreground">Questions</p>
          </CardContent></Card>
        </div>

        <Card className="border-border/50 shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Exam Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{rule}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-6">
            {isWaiting ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Waiting for the exam to start...</p>
                  <p className="text-sm text-muted-foreground mt-1">The teacher will start the exam shortly. Please stay on this page.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-success">Exam is starting!</p>
                  <p className="text-sm text-muted-foreground mt-1">Redirecting you to the exam...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ExamReady;
