import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Minus, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
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
      // Get session — includes per-session publication flag
      const { data: sess } = await (supabase
        .from("exam_sessions")
        .select("*, result_published_at") as any)
        .eq("id", sessionId)
        .single();
      if (!sess) { navigate("/student/dashboard"); return; }
      setSession(sess);

      // Per-session gate: only show if THIS student's result was published
      if (!sess.result_published_at) { navigate("/student/dashboard"); return; }

      const { data: exam } = await supabase
        .from("exams")
        .select("title, subject")
        .eq("id", sess.exam_id)
        .single();
      setExamTitle(exam?.title || "");
      setExamSubject(exam?.subject || "");

      // Get answers — prefer snapshot fields (frozen at publish time)
      const { data: studentAnswers } = await (supabase
        .from("student_answers")
        .select("question_id, selected_answer, is_correct, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, question_order") as any)
        .eq("session_id", sessionId);

      if (studentAnswers?.length) {
        // Fall back to live questions only when snapshot missing (legacy rows)
        const missingSnap = studentAnswers.filter((a: any) => !a.question_text);
        let liveMap = new Map<string, any>();
        if (missingSnap.length) {
          const { data: questions } = await supabase
            .from("questions")
            .select("id, question_text, correct_answer, marks, option_a, option_b, option_c, option_d, question_order")
            .in("id", missingSnap.map((a: any) => a.question_id));
          liveMap = new Map(questions?.map((q: any) => [q.id, q]) || []);
        }

        const details: AnswerDetail[] = studentAnswers.map((a: any) => {
          const live: any = liveMap.get(a.question_id) || {};
          return {
            questionId: a.question_id,
            questionText: a.question_text ?? live.question_text ?? "",
            selectedAnswer: a.selected_answer,
            correctAnswer: a.correct_answer ?? live.correct_answer ?? "",
            isCorrect: a.is_correct,
            marks: a.marks ?? live.marks ?? 0,
            optionA: a.option_a ?? live.option_a ?? "",
            optionB: a.option_b ?? live.option_b ?? "",
            optionC: a.option_c ?? live.option_c ?? "",
            optionD: a.option_d ?? live.option_d ?? "",
            _order: a.question_order ?? live.question_order ?? 0,
          } as any;
        }).sort((a: any, b: any) => (a._order || 0) - (b._order || 0));
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

  const handleExport = () => {
    if (!answers.length) return;
    const studentName = sessionStorage.getItem("student_name") || "Student";
    const studentIdCode = sessionStorage.getItem("student_id") || "";
    const summary = [
      ["Student Name", studentName],
      ["Student ID", studentIdCode],
      ["Exam", examTitle],
      ["Subject", examSubject],
      ["Score", `${score} / ${total}`],
      ["Percentage", `${pct}%`],
      ["Rank", rank ? `${rank} of ${totalStudents}` : "—"],
      ["Correct", correct],
      ["Incorrect", incorrect],
      ["Unanswered", unanswered],
      ["Submitted At", session?.submitted_at ? new Date(session.submitted_at).toLocaleString() : "—"],
    ];
    const breakdown = answers.map((a, i) => ({
      "#": i + 1,
      Question: a.questionText,
      "Option A": a.optionA,
      "Option B": a.optionB,
      "Option C": a.optionC,
      "Option D": a.optionD,
      "Your Answer": a.selectedAnswer ?? "—",
      "Correct Answer": a.correctAnswer,
      Result: a.isCorrect === true ? "Correct" : a.isCorrect === false ? "Incorrect" : "Unanswered",
      Marks: a.marks,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breakdown), "Answers");
    const safeTitle = examTitle.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
    XLSX.writeFile(wb, `${safeTitle}_${studentName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-2 text-slate-600 hover:text-[#2563EB] text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="h-7 w-7 rounded-full" />
              <span className="font-bold text-sm text-[#0f172a]">NejoExamPrep</span>
            </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-slate-400">{unanswered}</div>
              <p className="text-xs text-slate-500 mt-1">Unanswered</p>
            </div>
          </div>
        </div>

        {/* Answer breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-[#0f172a]">Question Breakdown</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-400 inline-block" /> Correct</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" /> Incorrect</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" /> Unanswered</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {answers.map((a, i) => {
              const isUnanswered = a.selectedAnswer === null || a.selectedAnswer === undefined || a.selectedAnswer === "";
              return (
                <div key={a.questionId} className={`px-5 py-4 ${isUnanswered ? "bg-slate-50/60" : ""}`}>
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      a.isCorrect === true ? "bg-green-100"
                      : isUnanswered ? "bg-slate-100"
                      : "bg-red-100"
                    }`}>
                      {a.isCorrect === true
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        : isUnanswered
                        ? <Minus className="h-3.5 w-3.5 text-slate-400" />
                        : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    </div>

                    <div className="flex-1">
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-[#0f172a]">Q{i + 1}. {a.questionText}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUnanswered ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              <Minus className="h-3 w-3" /> Unanswered
                            </span>
                          ) : a.isCorrect === true ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="h-3 w-3" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                              <XCircle className="h-3 w-3" /> Incorrect
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-medium">{a.marks} mark{a.marks !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Unanswered notice */}
                      {isUnanswered && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-500 font-medium">
                          <Minus className="h-3.5 w-3.5 shrink-0" />
                          You did not answer this question. The correct answer is shown below.
                        </div>
                      )}

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {["A", "B", "C", "D"].map(opt => {
                          const optText = opt === "A" ? a.optionA : opt === "B" ? a.optionB : opt === "C" ? a.optionC : a.optionD;
                          const isSelected = !isUnanswered && a.selectedAnswer === opt;
                          const isCorrectOpt = a.correctAnswer === opt;

                          let bg = "bg-white text-slate-600 border-slate-200";
                          if (isCorrectOpt && isSelected) bg = "bg-green-50 text-green-700 border-green-300";
                          else if (isCorrectOpt) bg = "bg-green-50 text-green-700 border-green-200";
                          else if (isSelected) bg = "bg-red-50 text-red-600 border-red-200";

                          return (
                            <div key={opt} className={`px-3 py-2 rounded-lg border ${bg} flex items-center gap-2`}>
                              <span className="font-bold shrink-0">{opt}.</span>
                              <span className="flex-1">{optText}</span>
                              {isSelected && !isCorrectOpt && (
                                <span className="ml-auto text-[10px] font-semibold text-red-500 shrink-0">Your answer</span>
                              )}
                              {isCorrectOpt && (
                                <span className="ml-auto text-[10px] font-semibold text-green-600 shrink-0">
                                  {isSelected ? "✓ Correct" : "✓ Answer"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResultDetail;
