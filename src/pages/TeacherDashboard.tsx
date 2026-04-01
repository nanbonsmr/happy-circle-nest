import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, BarChart3, Settings,
  Users, Activity, Loader2, Play, Pencil, Trash2, Mail,
  LogOut, Plus, Search, Download, ChevronUp, ChevronDown,
  Copy, Radio, Square, RefreshCw, ShieldAlert, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { useExamAutoStatus } from "@/hooks/useExamAutoStatus";
import { useReportFilters } from "@/hooks/useReportFilters";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import type { Tables } from "@/integrations/supabase/types";

type Exam = Tables<"exams">;
type ActiveTab = "dashboard" | "exams" | "reports" | "settings" | "monitor";

interface SessionCounts { total: number; waiting: number; in_progress: number; submitted: number; }
interface StudentReport {
  sessionId: string; studentName: string; studentEmail: string;
  examId: string; examTitle: string; examSubject: string;
  score: number | null; totalMarks: number | null; status: string;
  submittedAt: string | null; correct: number; incorrect: number;
  totalQuestions: number; unanswered: number; percentage: number | null;
  tabSwitches: number; fullscreenExits: number;
  suspiciousScore: "Low" | "Medium" | "High"; ejectedByViolation: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  published: "bg-blue-100 text-blue-600",
  active: "bg-green-100 text-green-600",
  completed: "bg-slate-100 text-slate-500",
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionCounts, setSessionCounts] = useState<Record<string, SessionCounts>>({});
  const [userName, setUserName] = useState("Teacher");
  const [userId, setUserId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  // Edit exam
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Delete exam
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Actions
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  // Monitor
  const [monitorExamId, setMonitorExamId] = useState<string>("");
  const [monitorSessions, setMonitorSessions] = useState<any[]>([]);
  // Exams search
  const [examSearch, setExamSearch] = useState("");

  const loadCounts = useCallback(async (list: Exam[]) => {
    if (!list.length) return;
    const ids = list.map((e) => e.id);
    const { data } = await supabase.from("exam_sessions").select("exam_id, status").in("exam_id", ids);
    const counts: Record<string, SessionCounts> = {};
    list.forEach((e) => { counts[e.id] = { total: 0, waiting: 0, in_progress: 0, submitted: 0 }; });
    (data || []).forEach((s) => {
      if (!counts[s.exam_id]) return;
      counts[s.exam_id].total++;
      if (s.status === "waiting") counts[s.exam_id].waiting++;
      else if (s.status === "in_progress") counts[s.exam_id].in_progress++;
      else if (s.status === "submitted") counts[s.exam_id].submitted++;
    });
    setSessionCounts(counts);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", session.user.id).single();
      if (profile) {
        setUserName(profile.full_name || "Teacher");
        setProfileName(profile.full_name || "");
        setProfileEmail(profile.email || "");
      }
      const { data } = await supabase.from("exams").select("*").eq("teacher_id", session.user.id).order("created_at", { ascending: false });
      setExams(data || []);
      await loadCounts(data || []);
      setLoading(false);
    };
    init();
  }, [navigate, loadCounts]);

  // Real-time session counts
  useEffect(() => {
    if (!exams.length) return;
    const ch = supabase.channel("t-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions" }, () => loadCounts(exams))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [exams, loadCounts]);

  // Real-time exam status
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("t-exams-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams", filter: `teacher_id=eq.${userId}` },
        (payload) => setExams((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...(payload.new as Exam) } : e)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useExamAutoStatus(exams, (examId, newStatus) => {
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: newStatus } : e));
  });

  // Live monitor
  useEffect(() => {
    if (activeTab !== "monitor" || !monitorExamId) return;
    const load = async () => {
      const { data } = await supabase.from("exam_sessions")
        .select("id, student_name, student_email, status, submitted_at, score, total_marks, ejected_by_violation")
        .eq("exam_id", monitorExamId).order("created_at");
      setMonitorSessions(data || []);
    };
    load();
    const ch = supabase.channel("monitor-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions", filter: `exam_id=eq.${monitorExamId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeTab, monitorExamId]);

  // Load reports once when tab opens
  useEffect(() => {
    if (activeTab === "reports" && !reportsLoaded && exams.length > 0) loadReports();
  }, [activeTab, exams, reportsLoaded]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const examIds = exams.map((e) => e.id);
      const { data: sessions } = await supabase.from("exam_sessions").select("*").in("exam_id", examIds);
      if (!sessions?.length) { setReports([]); setReportsLoading(false); setReportsLoaded(true); return; }
      const { data: questions } = await supabase.from("questions").select("exam_id").in("exam_id", examIds);
      const sessionIds = sessions.map((s) => s.id);
      const { data: answers } = await supabase.from("student_answers").select("session_id, is_correct, selected_answer").in("session_id", sessionIds);
      const { data: cheatLogs } = await supabase.from("cheat_logs").select("session_id, event_type").in("session_id", sessionIds);
      const examMap = Object.fromEntries(exams.map((e) => [e.id, e]));
      const qPerExam: Record<string, number> = {};
      (questions || []).forEach((q) => { qPerExam[q.exam_id] = (qPerExam[q.exam_id] || 0) + 1; });
      const reps: StudentReport[] = sessions.map((s) => {
        const sa = (answers || []).filter((a) => a.session_id === s.id);
        const totalQ = qPerExam[s.exam_id] || 0;
        const correct = sa.filter((a) => a.is_correct === true).length;
        const incorrect = sa.filter((a) => a.is_correct === false).length;
        const answered = sa.filter((a) => a.selected_answer).length;
        const exam = examMap[s.exam_id];
        const pct = s.total_marks && s.total_marks > 0 ? Math.round(((s.score ?? 0) / s.total_marks) * 100) : (totalQ > 0 ? Math.round((correct / totalQ) * 100) : null);
        const logs = (cheatLogs || []).filter((l) => l.session_id === s.id);
        const tabSwitches = logs.filter((l) => l.event_type === "tab_switch").length;
        const fullscreenExits = logs.filter((l) => l.event_type === "fullscreen_exit").length;
        const suspiciousScore: "Low" | "Medium" | "High" = logs.length >= 8 ? "High" : logs.length >= 3 ? "Medium" : "Low";
        return {
          sessionId: s.id, studentName: s.student_name, studentEmail: s.student_email,
          examId: s.exam_id, examTitle: exam?.title || "Unknown", examSubject: exam?.subject || "",
          score: s.score, totalMarks: s.total_marks, status: s.status, submittedAt: s.submitted_at,
          correct, incorrect, unanswered: totalQ - answered, totalQuestions: totalQ,
          percentage: s.status === "submitted" ? pct : null,
          tabSwitches, fullscreenExits, suspiciousScore,
          ejectedByViolation: s.ejected_by_violation === true,
        };
      });
      setReports(reps);
      setReportsLoaded(true);
    } catch (err: any) {
      toast({ title: "Error loading reports", description: err.message, variant: "destructive" });
    }
    setReportsLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const handleStartExam = async (examId: string) => {
    const startedAt = new Date().toISOString();
    // Optimistic update
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: "active", started_at: startedAt } : e));
    const { error } = await supabase.from("exams").update({ status: "active", started_at: startedAt }).eq("id", examId);
    if (error) {
      // Rollback
      setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: "published", started_at: null } : e));
      toast({ title: "Failed to start exam", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Exam started!", description: "Students can now begin." });
  };

  const handleStopExam = async (examId: string) => {
    setStoppingId(examId);
    // Optimistic update
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: "completed" } : e));
    const { error } = await supabase.from("exams").update({ status: "completed" }).eq("id", examId);
    if (error) {
      // Rollback
      setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: "active" } : e));
      toast({ title: "Failed to stop exam", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Exam stopped." });
    }
    setStoppingId(null);
  };

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam); setEditTitle(exam.title);
    setEditSubject(exam.subject || ""); setEditDuration(String(exam.duration_minutes));
  };

  const handleEditExam = async () => {
    if (!editingExam || !editTitle.trim()) return;
    setEditSaving(true);
    const dur = parseInt(editDuration) || 30;
    // Snapshot for rollback
    const prev = { title: editingExam.title, subject: editingExam.subject, duration_minutes: editingExam.duration_minutes };
    // Optimistic update
    setExams((list) => list.map((e) => e.id === editingExam.id
      ? { ...e, title: editTitle.trim(), subject: editSubject.trim(), duration_minutes: dur } : e));
    setEditingExam(null);
    const { error } = await supabase.from("exams")
      .update({ title: editTitle.trim(), subject: editSubject.trim(), duration_minutes: dur })
      .eq("id", editingExam.id);
    if (error) {
      // Rollback
      setExams((list) => list.map((e) => e.id === editingExam.id ? { ...e, ...prev } : e));
      toast({ title: "Failed to update exam", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Exam updated successfully." });
    }
    setEditSaving(false);
  };

  const handleDeleteExam = async () => {
    if (!deletingExamId) return;
    setDeleteLoading(true);
    // Optimistic removal
    const removed = exams.find((e) => e.id === deletingExamId);
    setExams((prev) => prev.filter((e) => e.id !== deletingExamId));
    setDeletingExamId(null);
    try {
      const { data: sessions } = await supabase.from("exam_sessions").select("id").eq("exam_id", deletingExamId);
      if (sessions?.length) {
        const ids = sessions.map((s) => s.id);
        await supabase.from("student_answers").delete().in("session_id", ids);
        await supabase.from("cheat_logs").delete().in("session_id", ids);
        await supabase.from("exam_sessions").delete().eq("exam_id", deletingExamId);
      }
      await supabase.from("questions").delete().eq("exam_id", deletingExamId);
      const { error } = await supabase.from("exams").delete().eq("id", deletingExamId);
      if (error) throw error;
      setReportsLoaded(false);
      toast({ title: "Exam deleted successfully." });
    } catch (err: any) {
      // Rollback on failure
      if (removed) setExams((prev) => [removed, ...prev]);
      toast({ title: "Error deleting exam", description: err.message, variant: "destructive" });
    }
    setDeleteLoading(false);
  };

  const handleSendResults = async (examId: string) => {
    setSendingId(examId);
    try {
      const { data, error } = await supabase.rpc('send_exam_results_as_notifications', {
        exam_id_param: examId
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      const sent = data?.sent ?? 0;
      const total = data?.total ?? 0;
      
      if (sent > 0) {
        toast({ 
          title: `Results sent to ${sent} student${sent !== 1 ? "s" : ""}!`,
          description: "Students can view their results in their dashboard."
        });
      } else if (total === 0) {
        toast({ 
          title: "No submitted results to send",
          description: "No students have submitted this exam yet."
        });
      } else {
        toast({ 
          title: "No results sent",
          description: "Unable to send results to students."
        });
      }
    } catch (err: any) { 
      toast({ 
        title: "Send failed", 
        description: err.message, 
        variant: "destructive" 
      }); 
    }
    setSendingId(null);
  };

  const handleCloneExam = async (exam: Exam) => {
    setCloningId(exam.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      // Ensure unique code
      const newCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: newExam, error: examErr } = await supabase.from("exams").insert({
        teacher_id: user.id,
        title: `${exam.title} (Copy)`,
        subject: exam.subject,
        duration_minutes: exam.duration_minutes,
        access_code: newCode,
        status: "published",
        max_participants: exam.max_participants,
        security_level: exam.security_level,
      }).select().single();
      if (examErr) throw examErr;
      const { data: qs } = await supabase.from("questions").select("*").eq("exam_id", exam.id).order("question_order");
      if (qs?.length) {
        const cloned = qs.map((q) => ({
          exam_id: newExam.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          marks: q.marks,
          question_order: q.question_order,
          block_id: q.block_id,
          block_order: q.block_order,
          instructions: q.instructions,
          paragraph: q.paragraph,
          image_url: q.image_url,
          image_caption: q.image_caption,
        }));
        const { error: qErr } = await supabase.from("questions").insert(cloned);
        if (qErr) throw qErr;
      }
      // Add cloned exam to local state immediately
      setExams((prev) => [newExam, ...prev]);
      navigate(`/teacher/edit/${newExam.id}`);
      toast({ title: "Exam cloned!", description: "Review and edit before publishing." });
    } catch (err: any) {
      toast({ title: "Clone failed", description: err.message, variant: "destructive" });
    }
    setCloningId(null);
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/exam/${code}`);
    toast({ title: "Link copied!" });
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    const prevName = userName;
    setUserName(profileName.trim());
    const { error } = await supabase.from("profiles").update({ full_name: profileName.trim() }).eq("id", userId);
    if (error) {
      setUserName(prevName);
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated successfully." });
    }
    setSavingProfile(false);
  };

  // Derived stats
  const counts = Object.values(sessionCounts) as SessionCounts[];
  const totalStudents = counts.reduce((a, b) => a + b.total, 0);
  const liveStudents = counts.reduce((a, b) => a + b.waiting + b.in_progress, 0);
  const activeExams = exams.filter((e) => e.status === "active").length;
  const submittedReports = reports.filter((r) => r.percentage !== null);
  const avgScore = submittedReports.length > 0
    ? Math.round(submittedReports.reduce((a, r) => a + (r.percentage || 0), 0) / submittedReports.length) : 0;

  const filteredExams = useMemo(() => {
    if (!examSearch.trim()) return exams;
    const q = examSearch.toLowerCase();
    return exams.filter((e) => e.title.toLowerCase().includes(q) || e.subject?.toLowerCase().includes(q) || e.access_code.toLowerCase().includes(q));
  }, [exams, examSearch]);

  const { examFilter, setExamFilter, statusFilter, setStatusFilter, search, setSearch,
    sortField, sortAsc, toggleSort, filtered: filteredReports, exportXLSX } = useReportFilters(reports);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
    { icon: FileText, label: "My Exams", tab: "exams" },
    { icon: Radio, label: "Live Monitor", tab: "monitor" },
    { icon: BarChart3, label: "Reports", tab: "reports" },
    { icon: Settings, label: "Settings", tab: "settings" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a8fe3] to-[#1565c0]">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(t) => setActiveTab(t as ActiveTab)}
      navItems={navItems}
      onLogout={handleLogout}
      userName={userName}
      userEmail={profileEmail}
      role="teacher"
      headerTitle={
        activeTab === "dashboard" ? "Dashboard"
        : activeTab === "exams" ? "My Exams"
        : activeTab === "monitor" ? "Live Monitor"
        : activeTab === "reports" ? "Reports"
        : "Settings"
      }
      liveCount={liveStudents}
      headerAction={
        (activeTab === "dashboard" || activeTab === "exams") ? (
          <Button asChild size="sm" className="gap-1.5 bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0 text-xs">
            <Link to="/teacher/create"><Plus className="h-3.5 w-3.5" /> Create Exam</Link>
          </Button>
        ) : activeTab === "reports" ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setReportsLoaded(false); loadReports(); }}
              disabled={reportsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${reportsLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button type="button" onClick={() => exportXLSX("reports.xlsx")} disabled={!filteredReports.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        ) : undefined
      }
    >

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Exams" value={String(exams.length)} icon={FileText} accent="border-l-blue-400" iconBg="bg-blue-50" iconColor="text-blue-500" index={0} />
            <StatCard label="Active Exams" value={String(activeExams)} icon={Activity} accent="border-l-green-400" iconBg="bg-green-50" iconColor="text-green-500" sub={liveStudents > 0 ? `${liveStudents} live` : undefined} index={1} />
            <StatCard label="Total Students" value={String(totalStudents)} icon={Users} accent="border-l-purple-400" iconBg="bg-purple-50" iconColor="text-purple-500" index={2} />
            <StatCard label="Avg Score" value={submittedReports.length > 0 ? `${avgScore}%` : "—"} icon={BarChart3} accent="border-l-amber-400" iconBg="bg-amber-50" iconColor="text-amber-500" index={3} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-[#1e3a5f]">Recent Exams</h2>
              <button type="button" onClick={() => setActiveTab("exams")} className="text-xs text-[#1a8fe3] hover:underline font-medium">View All</button>
            </div>
            {exams.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No exams yet. Create your first exam to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Exam</th>
                      <th className="text-left px-4 py-3 font-semibold">Subject</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-left px-4 py-3 font-semibold">Students</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.slice(0, 6).map((exam) => {
                      const c = sessionCounts[exam.id] || { total: 0, waiting: 0, in_progress: 0, submitted: 0 };
                      return (
                        <tr key={exam.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#1e3a5f]">{exam.title}</p>
                            <p className="text-xs text-slate-400 font-mono">{exam.access_code}</p>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{exam.subject || "—"}</td>
                          <td className="px-4 py-3.5 text-slate-500">{exam.duration_minutes} min</td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-[#1e3a5f]">{c.total}</span>
                            {c.waiting + c.in_progress > 0 && <span className="ml-1.5 text-xs text-green-600 font-medium">({c.waiting + c.in_progress} live)</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[exam.status] || STATUS_COLORS.draft}`}>{exam.status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              {exam.status === "published" && <button type="button" onClick={() => handleStartExam(exam.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Start exam"><Play className="h-3.5 w-3.5" /></button>}
                              {exam.status === "active" && <button type="button" onClick={() => handleStopExam(exam.id)} disabled={stoppingId === exam.id} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Stop exam">{stoppingId === exam.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}</button>}
                              <button type="button" onClick={() => navigate(`/teacher/edit/${exam.id}`)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit exam"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => handleSendResults(exam.id)} disabled={sendingId === exam.id} className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Send results">
                                {sendingId === exam.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" onClick={async () => {
                                const newVal = !(exam as any).results_published;
                                await supabase.from("exams").update({ results_published: newVal } as any).eq("id", exam.id);
                                setExams(prev => prev.map(e => e.id === exam.id ? { ...e, results_published: newVal } as any : e));
                                toast({ title: newVal ? "Results published to students" : "Results hidden from students" });
                              }} className={`p-1.5 rounded-lg ${(exam as any).results_published ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`} title={`${(exam as any).results_published ? 'Hide' : 'Publish'} results for students`}>
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => setDeletingExamId(exam.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === "exams" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search exams by title, subject or code…" value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-[#1e3a5f]">All Exams ({filteredExams.length})</h2>
            </div>
            {filteredExams.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">{exams.length === 0 ? "No exams yet." : "No exams match your search."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Exam</th>
                      <th className="text-left px-4 py-3 font-semibold">Subject</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-left px-4 py-3 font-semibold">Code</th>
                      <th className="text-left px-4 py-3 font-semibold">Students</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((exam) => {
                      const c = sessionCounts[exam.id] || { total: 0, waiting: 0, in_progress: 0, submitted: 0 };
                      return (
                        <tr key={exam.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#1e3a5f]">{exam.title}</p>
                            <p className="text-xs text-slate-400">{new Date(exam.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{exam.subject || "—"}</td>
                          <td className="px-4 py-3.5 text-slate-500">{exam.duration_minutes} min</td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{exam.access_code}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs space-y-0.5">
                              <p className="font-medium text-[#1e3a5f]">{c.total} total</p>
                              {c.in_progress > 0 && <p className="text-green-600">{c.in_progress} active</p>}
                              {c.submitted > 0 && <p className="text-blue-600">{c.submitted} done</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[exam.status] || STATUS_COLORS.draft}`}>{exam.status}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {exam.status === "published" && <button type="button" onClick={() => handleStartExam(exam.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Start exam"><Play className="h-3.5 w-3.5" /></button>}
                              {exam.status === "active" && <button type="button" onClick={() => handleStopExam(exam.id)} disabled={stoppingId === exam.id} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Stop exam">{stoppingId === exam.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}</button>}
                              <button type="button" onClick={() => navigate(`/teacher/edit/${exam.id}`)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit questions"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => openEditExam(exam)} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100" title="Quick edit"><Settings className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => handleCopyLink(exam.access_code)} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100" title="Copy exam link"><Eye className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => handleCloneExam(exam)} disabled={cloningId === exam.id} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Clone exam">
                                {cloningId === exam.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" onClick={() => handleSendResults(exam.id)} disabled={sendingId === exam.id} className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Email results">
                                {sendingId === exam.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" onClick={() => setDeletingExamId(exam.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monitor Tab */}
      {activeTab === "monitor" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <select value={monitorExamId} onChange={(e) => setMonitorExamId(e.target.value)}
                title="Select exam to monitor" aria-label="Select exam to monitor"
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]">
                <option value="">Select an exam to monitor…</option>
                {exams.filter((e) => e.status === "active" || e.status === "published").map((e) => (
                  <option key={e.id} value={e.id}>{e.title} — {e.status}</option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold shrink-0">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live
              </div>
            </div>
          </div>

          {!monitorExamId ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-slate-400 text-sm">
              Select an active or published exam above to start monitoring.
            </div>
          ) : monitorSessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-slate-400 text-sm">
              No students have joined yet. Waiting…
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-[#1e3a5f]">Students ({monitorSessions.length})</h2>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Waiting: {monitorSessions.filter((s) => s.status === "waiting").length}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Active: {monitorSessions.filter((s) => s.status === "in_progress").length}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Submitted: {monitorSessions.filter((s) => s.status === "submitted").length}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Student</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Score</th>
                      <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitorSessions.map((s) => {
                      const pct = s.total_marks > 0 ? Math.round((s.score / s.total_marks) * 100) : null;
                      return (
                        <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-[#1e3a5f]">{s.student_name}</p>
                            <p className="text-xs text-slate-400">{s.student_email}</p>
                            {s.ejected_by_violation && <span className="text-xs font-bold text-red-600">⚠ Ejected</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                              s.status === "submitted" ? "bg-blue-100 text-blue-600"
                              : s.status === "in_progress" ? "bg-green-100 text-green-600"
                              : "bg-amber-100 text-amber-600"
                            }`}>{s.status === "in_progress" ? "Active" : s.status}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#1e3a5f]">
                            {s.status === "submitted" && pct !== null ? (
                              <span className={pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}>{pct}%</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Student Reports ({filteredReports.length})</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}
                title="Filter by exam" aria-label="Filter by exam"
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#1a8fe3]">
                <option value="all">All Exams</option>
                {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                title="Filter by status" aria-label="Filter by status"
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#1a8fe3]">
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search student name or email…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
              </div>
            </div>
          </div>

          {reportsLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#1a8fe3]" /></div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {reports.length === 0 ? "No student sessions yet." : "No results match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">#</th>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("studentName")}>
                      <span className="flex items-center gap-1">Student {sortField === "studentName" ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}</span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Exam</th>
                    <th className="text-center px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("percentage")}>
                      <span className="flex items-center gap-1 justify-center">Score {sortField === "percentage" ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}</span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold">Answers</th>
                    <th className="text-center px-4 py-3 font-semibold">Progress</th>
                    <th className="text-center px-4 py-3 font-semibold">Risk</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r, i) => {
                    const isSubmitted = r.status === "submitted";
                    const pct = r.percentage;
                    return (
                      <tr key={r.sessionId} className={`border-t border-slate-50 hover:bg-slate-50/70 transition-colors ${i === 0 && isSubmitted ? "bg-amber-50/40" : i === 1 && isSubmitted ? "bg-slate-50/60" : i === 2 && isSubmitted ? "bg-orange-50/30" : ""}`}>
                        <td className="px-5 py-3.5">
                          {isSubmitted ? (
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-200 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-200 text-orange-600" : "bg-slate-50 text-slate-400"}`}>{i + 1}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#1e3a5f]">{r.studentName}</p>
                          <p className="text-xs text-slate-400">{r.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-700">{r.examTitle}</p>
                          <p className="text-xs text-slate-400">{r.examSubject}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isSubmitted && pct !== null ? (
                            <>
                              <span className={`text-base font-bold ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}>{pct}%</span>
                              <p className="text-xs text-slate-400">{r.score ?? 0}/{r.totalMarks ?? 0} marks</p>
                            </>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <span className="text-green-600 font-semibold">✓{r.correct}</span>
                            <span className="text-red-500 font-semibold">✗{r.incorrect}</span>
                            <span className="text-slate-400">?{r.unanswered}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{r.correct + r.incorrect}/{r.totalQuestions}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="w-20 mx-auto">
                            <Progress value={pct ?? 0} className="h-1.5" />
                            <p className="text-xs text-slate-400 text-center mt-0.5">{pct ?? 0}%</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.suspiciousScore === "High" ? "bg-red-100 text-red-600" : r.suspiciousScore === "Medium" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-700"}`}>{r.suspiciousScore}</span>
                          <p className="text-xs text-slate-400 mt-0.5">{r.tabSwitches}t · {r.fullscreenExits}fs</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${r.status === "submitted" ? "bg-green-100 text-green-600" : r.status === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{r.status === "in_progress" ? "Active" : r.status}</span>
                          {r.ejectedByViolation && <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-0.5 w-fit mt-0.5"><ShieldAlert className="h-2.5 w-2.5" /> Ejected</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#1e3a5f]">Profile</h2>
            <div className="space-y-2">
              <Label htmlFor="pname">Full Name</Label>
              <Input id="pname" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pemail">Email</Label>
              <Input id="pemail" value={profileEmail} disabled className="bg-slate-50 text-slate-400" />
              <p className="text-xs text-slate-400">Email cannot be changed here.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile || !profileName.trim()} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {savingProfile ? "Saving…" : "Save Changes"}
            </Button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#1e3a5f]">Change Password</h2>
            <ChangePasswordForm />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Account</h2>
            <p className="text-sm text-slate-500">Contact your admin for account changes.</p>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Delete Exam Dialog */}
      <AlertDialog open={!!deletingExamId} onOpenChange={(open) => !open && setDeletingExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the exam and all student data including answers and cheat logs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Edit Exam Dialog */}
      <Dialog open={!!editingExam} onOpenChange={(open) => !open && setEditingExam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Edit Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Exam title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input id="edit-subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="Subject" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input id="edit-duration" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} min="1" max="300" />
            </div>
            <p className="text-xs text-slate-400">To edit questions or access code, use the full editor.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExam(null)}>Cancel</Button>
            <Button onClick={handleEditExam} disabled={editSaving || !editTitle.trim()} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default TeacherDashboard;
