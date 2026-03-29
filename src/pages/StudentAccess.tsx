import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, KeyRound, AlertCircle, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const StudentAccess = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examNotFound, setExamNotFound] = useState(false);
  const [checkingExam, setCheckingExam] = useState(true);
  
  // New: if no access code in URL, ask for it
  const [manualCode, setManualCode] = useState("");
  const needsCode = !accessCode || accessCode === "undefined";

  // Validate access code on mount
  useEffect(() => {
    if (needsCode) {
      setCheckingExam(false);
      return;
    }
    const checkExam = async () => {
      // Case-insensitive lookup
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, status")
        .ilike("access_code", accessCode || "")
        .maybeSingle();

      if (error || !data) {
        setExamNotFound(true);
      } else if (data.status === "completed") {
        setExamNotFound(true); // treat closed exams as not accessible
      } else {
        setExamTitle(data.title);
      }
      setCheckingExam(false);
    };
    checkExam();
  }, [accessCode, needsCode]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      navigate(`/exam/${manualCode.trim()}`);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .select("id, status, max_participants")
        .ilike("access_code", accessCode || "")
        .in("status", ["published", "active"])
        .maybeSingle();

      if (examError || !exam) throw new Error("Exam not found or not available. Please check your access code.");

      if (exam.max_participants) {
        const { count } = await supabase
          .from("exam_sessions")
          .select("*", { count: "exact", head: true })
          .eq("exam_id", exam.id);
        if ((count || 0) >= exam.max_participants) {
          throw new Error("Maximum number of exam participants reached.");
        }
      }

      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("id")
        .eq("exam_id", exam.id)
        .eq("student_email", email.trim())
        .maybeSingle();

      let sessionId: string;

      if (existing) {
        sessionId = existing.id;
      } else {
        const { data: session, error: sessionError } = await supabase
          .from("exam_sessions")
          .insert({
            exam_id: exam.id,
            student_name: fullName.trim(),
            student_email: email.trim(),
            status: "waiting",
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;
        sessionId = session.id;
      }

      sessionStorage.setItem("session_id", sessionId);
      sessionStorage.setItem("student_name", fullName.trim());
      sessionStorage.setItem("student_email", email.trim());
      sessionStorage.setItem("access_code", accessCode || "");

      navigate(`/exam/${accessCode}/ready`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If no access code provided, redirect to student entry
  if (needsCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1e2e] p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-4 text-[#0f1e2e]" />
          <h2 className="text-xl font-bold text-[#0f1e2e] mb-2">Enter Exam Key</h2>
          <p className="text-sm text-slate-500 mb-5">Please enter your exam key to continue.</p>
          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <Input
              placeholder="Enter exam key"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 h-11"
              autoFocus
            />
            <Button type="submit" className="h-11 px-5 bg-[#0f1e2e] hover:bg-[#1a2e42] text-white border-0 font-semibold">
              Go
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Exam not found or closed
  if (examNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1e2e] p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-[#0f1e2e] mb-2">Exam Not Found</h2>
          <p className="text-sm text-slate-500 mb-5">
            The exam key <span className="font-mono font-semibold text-[#0f1e2e]">{accessCode}</span> is invalid, expired, or not available.
          </p>
          <Button
            type="button"
            onClick={() => navigate("/student")}
            className="w-full h-11 bg-[#0f1e2e] hover:bg-[#1a2e42] text-white border-0 font-semibold"
          >
            Try Another Key
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="Nejo Ifa Boru Logo" className="mx-auto mb-4 h-14 w-14 rounded-full object-cover" />
          <h1 className="text-2xl font-bold">Join Exam</h1>
          <p className="text-muted-foreground mt-1">{examTitle}</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
            <CardDescription>
              Access Code: <span className="font-mono font-semibold text-primary">{accessCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="name" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="student-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={accessCode} disabled className="pl-10 bg-muted" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary border-0 text-primary-foreground hover:opacity-90 h-12 text-base font-semibold">
                {loading ? "Joining..." : "Start Exam"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentAccess;
