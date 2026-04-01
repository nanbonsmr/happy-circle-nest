import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle2, XCircle, Minus, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface AnswerDetail {
  questionId: string;
  questionText: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  marks: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

const StudentResultDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [rank, setRank] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    if (!sessionStorage.getItem("student_logged_in")) {
      navigate("/student");
      return;
    }
    loadResult();
  }, [sessionId]);

  const loadResult = async () => {
    if (!sessionId) return;
    try {
      // Get session
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!sess) { navigate("/student/dashboard"); return; }
      setSession(sess);

      // Check if results are published
      const { data: exam } = await supabase
        .from("exams")
        .select("title, subject, results_published")
        .eq("id", sess.exam_id)
        .single();
      if (!exam?.results_published) { navigate("/student/dashboard"); return; }
      setExamTitle(exam.title);
      setExamSubject(exam.subject || "");

      // Get answers with questions
      const { data: studentAnswers } = await supabase
        .from("student_answers")
        .select("question_id, selected_answer, is_correct")
        .eq("session_id", sessionId);

      if (studentAnswers?.length) {
        const qIds = studentAnswers.map(a => a.question_id);
        const { data: questions } = await supabase
          .from("questions")
          .select("id, question_text, correct_answer, marks, option_a, option_b, option_c, option_d, question_order")
          .in("id", qIds)
          .order("question_order");

        const qMap = new Map(questions?.map(q => [q.id, q]) || []);
        const details: AnswerDetail[] = studentAnswers.map(a => {
          const q: any = qMap.get(a.question_id) || {};
          return {
            questionId: a.question_id,
            questionText: q.question_text || "",
            selectedAnswer: a.selected_answer,
            correctAnswer: q.correct_answer || "",
            isCorrect: a.is_correct,
            marks: q.marks || 0,
            optionA: q.option_a || "",
            optionB: q.option_b || "",
            optionC: q.option_c || "",
            optionD: q.option_d || "",
          };
        }).sort((a, b) => {
          const qa = questions?.find(q => q.id === a.questionId);
          const qb = questions?.find(q => q.id === b.questionId);
          return (qa?.question_order || 0) - (qb?.question_order || 0);
        });
        setAnswers(details);
      }

      // Calculate rank
      const { data: allSessions } = await supabase
        .from("exam_sessions")
        .select("id, score, total_marks, status")
        .eq("exam_id", sess.exam_id)
        .eq("status", "submitted");

      if (allSessions) {
        setTotalStudents(allSessions.length);
        const sorted = allSessions
          .filter(s => s.score !== null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const idx = sorted.findIndex(s => s.id === sessionId);
        if (idx >= 0) setRank(idx + 1);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
    </div>
  );

  const score = session?.score ?? 0;
  const total = session?.total_marks ?? 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const correct = answers.filter(a => a.isCorrect === true).length;
  const incorrect = answers.filter(a => a.isCorrect === false).length;
  const unanswered = answers.filter(a => a.selectedAnswer === null).length;

  const optionLabel = (key: string) => {
    const map: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
    return map[key] || key;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-2 text-slate-600 hover:text-[#2563EB] text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-7 w-7 rounded-full" />
            <span className="font-bold text-sm text-[#0f172a]">NejoExamPrep</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#0f172a]">{examTitle}</h1>
            <p className="text-sm text-slate-500">{examSubject}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-extrabold ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}>{pct}%</div>
              <p className="text-xs text-slate-500 mt-1">Score</p>
              <p className="text-xs text-slate-400">{score}/{total}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-[#2563EB]">{rank ?? "—"}</div>
              <p className="text-xs text-slate-500 mt-1">Rank</p>
              <p className="text-xs text-slate-400">of {totalStudents}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-green-600">{correct}</div>
              <p className="text-xs text-slate-500 mt-1">Correct</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-red-500">{incorrect}</div>
              <p className="text-xs text-slate-500 mt-1">Incorrect</p>
              {unanswered > 0 && <p className="text-xs text-slate-400">{unanswered} skipped</p>}
            </div>
          </div>
        </div>

        {/* Answer breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#0f172a]">Question Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {answers.map((a, i) => (
              <div key={a.questionId} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${a.isCorrect === true ? "bg-green-100" : a.isCorrect === false ? "bg-red-100" : "bg-slate-100"}`}>
                    {a.isCorrect === true ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> :
                     a.isCorrect === false ? <XCircle className="h-3.5 w-3.5 text-red-500" /> :
                     <Minus className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0f172a]">Q{i + 1}. {a.questionText}</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {["A", "B", "C", "D"].map(opt => {
                        const optText = opt === "A" ? a.optionA : opt === "B" ? a.optionB : opt === "C" ? a.optionC : a.optionD;
                        const isSelected = a.selectedAnswer === opt;
                        const isCorrectOpt = a.correctAnswer === opt;
                        let bg = "bg-slate-50 text-slate-600";
                        if (isCorrectOpt) bg = "bg-green-50 text-green-700 border-green-200";
                        if (isSelected && !isCorrectOpt) bg = "bg-red-50 text-red-600 border-red-200";
                        return (
                          <div key={opt} className={`px-3 py-2 rounded-lg border ${bg} flex items-center gap-2`}>
                            <span className="font-bold">{opt}.</span> {optText}
                            {isSelected && <span className="ml-auto text-[10px] font-medium">(Your answer)</span>}
                            {isCorrectOpt && <span className="ml-auto text-[10px] font-medium">✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{a.marks} marks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResultDetail;
