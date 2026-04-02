import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Home, Clock, Hash, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface SubmissionData {
  studentName: string;
  studentEmail: string;
  studentId: string;
  examTitle: string;
  examSubject: string;
  submittedAt: string;
  totalQuestions: number;
}

const ExamComplete = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sid = sessionStorage.getItem("session_id");
      if (!sid) { setLoading(false); return; }

      // Fetch session + exam data
      const { data: session } = await supabase
        .from("exam_sessions")
        .select("student_name, student_email, student_registry_id, submitted_at, exam_id")
        .eq("id", sid)
        .maybeSingle();

      if (!session) { setLoading(false); return; }

      const { data: exam } = await supabase
        .from("exams")
        .select("title, subject")
        .eq("id", session.exam_id)
        .maybeSingle();

      const { count: qCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", session.exam_id);

      let studentId = "";
      if (session.student_registry_id) {
        const { data: reg } = await supabase
          .from("students")
          .select("student_id")
          .eq("id", session.student_registry_id)
          .maybeSingle();
        studentId = reg?.student_id || "";
      }

      setData({
        studentName: session.student_name,
        studentEmail: session.student_email,
        studentId,
        examTitle: exam?.title || "Exam",
        examSubject: exam?.subject || "",
        submittedAt: session.submitted_at || new Date().toISOString(),
        totalQuestions: qCount || 0,
      });

      // Clean up session storage
      sessionStorage.removeItem("session_id");
      sessionStorage.removeItem("student_name");
      sessionStorage.removeItem("student_email");
      sessionStorage.removeItem("access_code");

      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <img src={logo} alt="NejoExamPrep" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">NejoExamPrep</p>
            <p className="text-white/50 text-xs">Exam Submitted</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }} className="w-full max-w-md space-y-4">

          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-5 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </motion.div>
            <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-2">Exam Submitted!</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your answers have been recorded successfully. Your teacher will send you the results via email.
            </p>
          </div>

          {/* Submission details */}
          {!loading && data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Submission Details</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/8 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Student</p>
                    <p className="text-sm font-semibold text-[#1e3a5f]">{data.studentName}</p>
                    {data.studentId && (
                      <p className="text-xs font-mono text-[#1a8fe3]">{data.studentId}</p>
                    )}
                  </div>
                </div>

                {data.studentEmail && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/8 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Results will be sent to</p>
                      <p className="text-sm text-slate-600">{data.studentEmail}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/8 flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Exam</p>
                    <p className="text-sm font-semibold text-[#1e3a5f]">{data.examTitle}</p>
                    {data.examSubject && <p className="text-xs text-slate-500">{data.examSubject}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#1e3a5f]/8 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Submitted at</p>
                    <p className="text-sm text-slate-600">
                      {new Date(data.submittedAt).toLocaleString("en-US", {
                        dateStyle: "medium", timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full gap-2 h-11">
              <Home className="h-4 w-4" /> Back to Home
            </Button>
          </motion.div>
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

export default ExamComplete;
