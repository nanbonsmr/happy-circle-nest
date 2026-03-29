import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, BarChart3, Settings,
  Users, Activity, Loader2,
  Play, Pencil, Trash2, Mail, LogOut, Plus, Eye,
  Search, Download, ChevronUp, ChevronDown,
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
type ActiveTab = "dashboard" | "exams" | "reports" | "settings";
interface SessionCounts { total: number; waiting: number; in_progress: number; submitted: number; }
interface StudentReport {
  sessionId: string; studentName: string; studentEmail: string;
  examId: string; examTitle: string; examSubject: string; score: number | null;
  totalMarks: number | null; status: string; submittedAt: string | null;
  correct: number; incorrect: number; totalQuestions: number; unanswered: number;
  percentage: number | null; tabSwitches: number; fullscreenExits: number;
  suspiciousScore: "Low" | "Medium" | "High";
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
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadCounts = useCallback(async (list: Exam[]) => {
    if (!list.length) return;
    const counts: Record<string, SessionCounts> = {};
    for (const exam of list) {
      const { data } = await supabase.from("exam_sessions").select("status").eq("exam_id", exam.id);
      const s = (data || []) as { status: string }[];
      counts[exam.id] = {
        total: s.length,
        waiting: s.filter((x) => x.status === "waiting").length,
        in_progress: s.filter((x) => x.status === "in_progress").length,
        submitted: s.filter((x) => x.status === "submitted").length,
      };
    }
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

  useEffect(() => {
    if (!exams.length) return;
    const ch = supabase.channel("t-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions" }, () => loadCounts(exams))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [exams, loadCounts]);

  // Real-time exam status updates (e.g. another teacher starts an exam)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("t-exams-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams", filter: `teacher_id=eq.${userId}` },
        (payload) => {
          setExams((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...(payload.new as Exam) } : e));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Auto-close exams when time expires
  useExamAutoStatus(exams, (examId, newStatus) => {
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: newStatus } : e));
  });

  useEffect(() => {
    if (activeTab === "reports" && exams.length > 0 && reports.length === 0) loadReports();
  }, [activeTab, exams]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const examIds = exams.map((e) => e.id);
      const { data: sessions } = await supabase.from("exam_sessions").select("*").in("exam_id", examIds);
      if (!sessions?.length) { setReports([]); setReportsLoading(false); return; }
      const { data: questions } = await supabase.from("questions").select("*").in("exam_id", examIds);
      const sessionIds = sessions.map((s) => s.id);
      const { data: answers } = await supabase.from("student_answers").select("*").in("session_id", sessionIds);
      const { data: cheatLogs } = await supabase.from("cheat_logs" as any).select("session_id, event_type").in("session_id", sessionIds);
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
        const pct = totalQ > 0 ? Math.round((correct / totalQ) * 100) : null;
        const logs = ((cheatLogs as any[]) || []).filter((l) => l.session_id === s.id);
        const tabSwitches = logs.filter((l) => l.event_type === "tab_switch").length;
        const fullscreenExits = logs.filter((l) => l.event_type === "fullscreen_exit").length;
        const suspiciousScore: "Low" | "Medium" | "High" = logs.length >= 8 ? "High" : logs.length >= 3 ? "Medium" : "Low";
        return {
          sessionId: s.id, studentName: s.student_name, studentEmail: s.student_email,
          examId: s.exam_id, examTitle: exam?.title || "Unknown", examSubject: exam?.subject || "",
          score: s.score, totalMarks: s.total_marks, status: s.status,
          submittedAt: s.submitted_at, correct, incorrect,
          unanswered: totalQ - answered, totalQuestions: totalQ,
          percentage: pct, tabSwitches, fullscreenExits, suspiciousScore,
        };
      });
      setReports(reps);
    } catch (err: any) {
      toast({ title: "Error loading reports", description: err.message, variant: "destructive" });
    }
    setReportsLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const handleStartExam = async (examId: string) => {
    const { error } = await supabase.from("exams").update({ status: "active", started_at: new Date().toISOString() }).eq("id", examId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: "active", started_at: new Date().toISOString() } : e));
    toast({ title: "Exam started!" });
  };

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam); setEditTitle(exam.title);
    setEditSubject(exam.subject); setEditDuration(String(exam.duration_minutes));
  };

  const handleEditExam = async () => {
    if (!editingExam) return;
    setEditSaving(true);
    const { error } = await supabase.from("exams").update({ title: editTitle.trim(), subject: editSubject.trim(), duration_minutes: parseInt(editDuration) || 30 }).eq("id", editingExam.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      setExams((prev) => prev.map((e) => e.id === editingExam.id ? { ...e, title: editTitle.trim(), subject: editSubject.trim(), duration_minutes: parseInt(editDuration) || 30 } : e));
      toast({ title: "Exam updated!" }); setEditingExam(null);
    }
    setEditSaving(false);
  };

  const handleDeleteExam = async () => {
    if (!deletingExamId) return;
    setDeleteLoading(true);
    try {
      const { data: sessions } = await supabase.from("exam_sessions").select("id").eq("exam_id", deletingExamId);
      if (sessions?.length) {
        const ids = sessions.map((s) => s.id);
        await supabase.from("student_answers").delete().in("session_id", ids);
        await supabase.from("exam_sessions").delete().eq("exam_id", deletingExamId);
      }
      await supabase.from("questions").delete().eq("exam_id", deletingExamId);
      const { error } = await supabase.from("exams").delete().eq("id", deletingExamId);
      if (error) throw error;
      setExams((prev) => prev.filter((e) => e.id !== deletingExamId));
      toast({ title: "Exam deleted!" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    setDeleteLoading(false); setDeletingExamId(null);
  };

  const handleSendResults = async (examId: string) => {
    setSendingId(examId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke("send-exam-results", {
        body: { examId, senderEmail: profileEmail || session.user.email, senderName: userName },
      });
      if (error) throw error;
      toast({ title: (data as any)?.sent > 0 ? "Results sent!" : "No results to send" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    setSendingId(null);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: profileName }).eq("id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setUserName(profileName); toast({ title: "Profile updated!" }); }
    setSavingProfile(false);
  };

  const counts = Object.values(sessionCounts) as SessionCounts[];
  const totalStudents = counts.reduce((a, b) => a + b.total, 0);
  const liveStudents = counts.reduce((a, b) => a + b.waiting + b.in_progress, 0);
  const activeExams = exams.filter((e) => e.status === "active").length;
  const submitted = reports.filter((r) => r.percentage !== null);
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((a, r) => a + (r.percentage || 0), 0) / submitted.length) : 0;

  // Report filters
  const {
    examFilter, setExamFilter, search, setSearch,
    sortField, sortAsc, toggleSort, filtered: filteredReports, exportXLSX,
  } = useReportFilters(reports);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
    { icon: FileText, label: "My Exams", tab: "exams" },
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
      headerTitle={activeTab === "dashboard" ? "Dashboard" : activeTab === "exams" ? "My Exams" : activeTab === "reports" ? "Reports" : "Settings"}
      liveCount={liveStudents}
      headerAction={
        (activeTab === "dashboard" || activeTab === "exams") ? (
          <Button asChild size="sm" className="gap-1.5 bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0 text-xs">
            <Link to="/teacher/create"><Plus className="h-3.5 w-3.5" /> Create Exam</Link>
          </Button>
        ) : undefined
      }
    >

      {activeTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Exams" value={String(exams.length)} icon={FileText} accent="border-l-blue-400" iconBg="bg-blue-50" iconColor="text-blue-500" index={0} />
            <StatCard label="Active Exams" value={String(activeExams)} icon={Activity} accent="border-l-green-400" iconBg="bg-green-50" iconColor="text-green-500" sub={liveStudents > 0 ? `${liveStudents} live` : undefined} index={1} />
            <StatCard label="Total Students" value={String(totalStudents)} icon={Users} accent="border-l-purple-400" iconBg="bg-purple-50" iconColor="text-purple-500" index={2} />
            <StatCard label="Avg Score" value={reports.length > 0 ? `${avgScore}%` : "—"} icon={BarChart3} accent="border-l-amber-400" iconBg="bg-amber-50" iconColor="text-amber-500" index={3} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-[#1e3a5f]">Exams Scheduled</h2>
              <button type="button" onClick={() => setActiveTab("exams")} className="text-xs text-[#1a8fe3] hover:underline font-medium">View All</button>
            </div>
            {exams.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No exams yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Exam Name</th>
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
                              {exam.status === "published" && <button type="button" onClick={() => handleStartExam(exam.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Start"><Play className="h-3.5 w-3.5" /></button>}
                              <button type="button" onClick={() => openEditExam(exam)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" onClick={() => handleSendResults(exam.id)} disabled={sendingId === exam.id} className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Send results">
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

      {activeTab === "exams" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#1e3a5f]">All Exams ({exams.length})</h2>
          </div>
          {exams.length === 0 ? <div className="py-12 text-center text-slate-400 text-sm">No exams yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Exam Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Subject</th>
                    <th className="text-left px-4 py-3 font-semibold">Duration</th>
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Students</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => {
                    const c = sessionCounts[exam.id] || { total: 0, waiting: 0, in_progress: 0, submitted: 0 };
                    return (
                      <tr key={exam.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#1e3a5f]">{exam.title}</td>
                        <td className="px-4 py-3.5 text-slate-500">{exam.subject || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500">{exam.duration_minutes} min</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{exam.access_code}</td>
                        <td className="px-4 py-3.5 font-medium text-[#1e3a5f]">{c.total}</td>
                        <td className="px-4 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[exam.status] || STATUS_COLORS.draft}`}>{exam.status}</span></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {exam.status === "published" && <button type="button" onClick={() => handleStartExam(exam.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Start"><Play className="h-3.5 w-3.5" /></button>}
                            <button type="button" onClick={() => openEditExam(exam)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(`https://nejoexamprep.vercel.app/exam/${exam.access_code}`); toast({ title: "Link copied!" }); }} className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100" title="Copy link"><Eye className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => handleSendResults(exam.id)} disabled={sendingId === exam.id} className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Send results">
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
      )}

      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1e3a5f]">Student Reports</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={loadReports} disabled={reportsLoading} className="text-xs text-[#1a8fe3] hover:underline font-medium">{reportsLoading ? "Loading..." : "Refresh"}</button>
                <button type="button" onClick={() => exportXLSX("reports.xlsx")} disabled={!filteredReports.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Exam filter */}
              <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}
                title="Filter by exam"
                aria-label="Filter by exam"
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#1a8fe3]">
                <option value="all">All Exams</option>
                {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search student name or email..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
              </div>
            </div>
          </div>

          {reportsLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#1a8fe3]" /></div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {reports.length === 0 ? "No submissions yet." : "No results match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("studentName")}>
                      <span className="flex items-center gap-1">Student {sortField === "studentName" ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}</span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Exam</th>
                    <th className="text-center px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("percentage")}>
                      <span className="flex items-center gap-1 justify-center">Score {sortField === "percentage" ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}</span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold">Progress</th>
                    <th className="text-center px-4 py-3 font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r, i) => (
                    <tr key={r.sessionId} className={`border-t border-slate-50 hover:bg-slate-50/70 transition-colors ${i === 0 ? "bg-amber-50/40" : i === 1 ? "bg-slate-50/60" : i === 2 ? "bg-orange-50/30" : ""}`}>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-200 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-200 text-orange-600" : "bg-slate-50 text-slate-400"}`}>{i + 1}</span>
                      </td>
                      <td className="px-4 py-3.5"><p className="font-semibold text-[#1e3a5f]">{r.studentName}</p><p className="text-xs text-slate-400">{r.studentEmail}</p></td>
                      <td className="px-4 py-3.5"><p className="font-medium text-slate-700">{r.examTitle}</p><p className="text-xs text-slate-400">{r.examSubject}</p></td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-base font-bold ${r.percentage !== null && r.percentage >= 70 ? "text-green-600" : r.percentage !== null && r.percentage >= 40 ? "text-amber-500" : "text-red-500"}`}>{r.percentage !== null ? `${r.percentage}%` : "—"}</span>
                        <p className="text-xs text-slate-400">{r.correct}/{r.totalQuestions}</p>
                      </td>
                      <td className="px-4 py-3.5"><div className="w-20 mx-auto"><Progress value={r.percentage ?? 0} className="h-1.5" /></div></td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.suspiciousScore === "High" ? "bg-red-100 text-red-600" : r.suspiciousScore === "Medium" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-700"}`}>{r.suspiciousScore}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#1e3a5f]">Profile Settings</h2>
            <div className="space-y-2">
              <Label htmlFor="pname">Full Name</Label>
              <Input id="pname" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pemail">Email</Label>
              <Input id="pemail" value={profileEmail} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-400">Email cannot be changed.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {savingProfile ? "Saving..." : "Save Changes"}
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

      <Dialog open={!!editingExam} onOpenChange={(open) => !open && setEditingExam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Exam</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} /></div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExam(null)}>Cancel</Button>
            <Button onClick={handleEditExam} disabled={editSaving} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingExamId} onOpenChange={(open) => !open && setDeletingExamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the exam and all student data. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default TeacherDashboard;
