import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, BarChart3, Settings, LayoutDashboard,
  UserPlus, TrendingUp, Activity, Loader2, Trash2,
  ChevronDown, ChevronUp, Pencil, Download, Search,
  RefreshCw, ShieldCheck, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { useExamAutoStatus } from "@/hooks/useExamAutoStatus";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import type { Tables } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

type Exam = Tables<"exams">;
interface TeacherRow { id: string; full_name: string; email: string; examCount: number; studentCount: number; }
interface SessionRow { id: string; exam_id: string; student_name: string; student_email: string; score: number | null; total_marks: number | null; status: string; submitted_at: string | null; exam_title: string; exam_subject: string; }
type Tab = "overview" | "teachers" | "students" | "exams" | "results" | "settings";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  published: "bg-blue-100 text-blue-600",
  active: "bg-green-100 text-green-600",
  completed: "bg-slate-100 text-slate-500",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<SessionRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  // activeExams derived from exams state — no separate state needed
  // Teacher dialog
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState(() => Math.random().toString(36).slice(2, 10));
  const [showPassword, setShowPassword] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [deleteTeacher, setDeleteTeacher] = useState<TeacherRow | null>(null);
  // Results sort/filter
  const [sortField, setSortField] = useState<"score" | "student_name">("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [resultSearch, setResultSearch] = useState("");
  const [resultExamFilter, setResultExamFilter] = useState("all");
  // Students
  const [students, setStudents] = useState<any[]>([]);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentGender, setStudentGender] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [showStudentPw, setShowStudentPw] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  // Exams search
  const [examSearch, setExamSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data: teacherRoles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      const teacherIds = (teacherRoles || []).map((r) => r.user_id);
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds);
        const { data: allExamIds } = await supabase.from("exams").select("id, teacher_id");
        const { data: allSessions } = await supabase.from("exam_sessions").select("exam_id");
        const rows: TeacherRow[] = (profiles || []).map((p) => {
          const tExams = (allExamIds || []).filter((e) => e.teacher_id === p.id);
          const tExamIds = new Set(tExams.map((e) => e.id));
          const sc = (allSessions || []).filter((s) => tExamIds.has(s.exam_id)).length;
          return { id: p.id, full_name: p.full_name || "—", email: p.email, examCount: tExams.length, studentCount: sc };
        });
        setTeachers(rows);
      } else {
        setTeachers([]);
      }
      const { data: allExams } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
      setExams(allExams || []);
      const { data: sessions } = await supabase.from("exam_sessions").select("id, student_name, student_email, score, total_marks, status, submitted_at, exam_id");
      setTotalStudents(sessions?.length || 0);
      const examMap = new Map<string, { title: string; subject: string }>((allExams || []).map((e) => [e.id, { title: e.title, subject: e.subject || "" }]));
      setResults((sessions || []).map((s: any) => ({ ...s, exam_title: examMap.get(s.exam_id)?.title || "—", exam_subject: examMap.get(s.exam_id)?.subject || "—" })));
      const { data: studs } = await supabase.from("students").select("*").order("student_id");
      setStudents(studs || []);
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    }
    setDataLoading(false);
  }, [toast]);

  useEffect(() => {
    let adminUserId = "";

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      adminUserId = session.user.id;

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      const isTeacher = roles?.some((r) => r.role === "teacher");
      if (!isAdmin && !isTeacher) { navigate("/login"); return; }
      if (!isAdmin && isTeacher) { navigate("/teacher"); return; }
      await loadData();
      setLoading(false);
    };
    init();

    // Guard: if session changes to a different user (e.g. signUp auto-login),
    // sign them out and redirect admin back to login to re-authenticate
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && adminUserId && session?.user.id !== adminUserId) {
        // A different user was signed in — sign them out immediately
        supabase.auth.signOut().then(() => navigate("/login"));
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [navigate, loadData]);

  // Real-time: refresh on exam changes, update status in-place for updates
  useEffect(() => {
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "exams" }, loadData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "exams" }, loadData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams" }, (payload) => {
        setExams((prev) => prev.map((e) => e.id === payload.new.id ? { ...e, ...(payload.new as Exam) } : e));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  useExamAutoStatus(exams, (examId, newStatus) => {
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: newStatus } : e));
  });

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const openAddTeacher = () => {
    setEditingTeacher(null); setTeacherName(""); setTeacherEmail("");
    setTeacherPassword(Math.random().toString(36).slice(2, 10)); setShowPassword(false);
    setShowTeacherDialog(true);
  };
  const openEditTeacher = (t: TeacherRow) => {
    setEditingTeacher(t); setTeacherName(t.full_name === "—" ? "" : t.full_name);
    setTeacherEmail(t.email); setTeacherPassword(""); setShowPassword(false);
    setShowTeacherDialog(true);
  };

  const handleSaveTeacher = async () => {
    if (!teacherEmail.trim()) return;
    setSavingTeacher(true);
    try {
      if (editingTeacher) {
        // UPDATE: profile name only
        const { error } = await supabase.from("profiles")
          .update({ full_name: teacherName.trim() })
          .eq("id", editingTeacher.id);
        if (error) throw error;
        setTeachers((prev) => prev.map((t) =>
          t.id === editingTeacher.id ? { ...t, full_name: teacherName.trim() } : t
        ));
        setShowTeacherDialog(false);
        toast({ title: "Teacher updated successfully." });
      } else {
        // CREATE new teacher via Edge Function (preserves admin session)
        if (teacherPassword.length < 6) throw new Error("Password must be at least 6 characters.");

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) throw new Error("Admin session not found");

        const { data, error: fnError } = await supabase.functions.invoke("create-teacher", {
          body: {
            email: teacherEmail.trim(),
            password: teacherPassword,
            full_name: teacherName.trim() || "",
          },
        });

        if (fnError) throw new Error(fnError.message || "Failed to create teacher");
        if (data?.error) throw new Error(data.error);

        setShowTeacherDialog(false);
        toast({
          title: "Teacher account created!",
          description: `Email: ${teacherEmail.trim()} · Password: ${teacherPassword} · Please share these credentials manually with the teacher.`,
        });
        await loadData();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSavingTeacher(false);
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTeacher) return;
    // Optimistic UI removal immediately
    setTeachers((prev) => prev.filter((t) => t.id !== deleteTeacher.id));
    const removed = deleteTeacher;
    setDeleteTeacher(null);
    try {
      const teacherId = removed.id;

      // 1. Delete all exam data cascaded
      const { data: teacherExams } = await supabase
        .from("exams").select("id").eq("teacher_id", teacherId);

      if (teacherExams?.length) {
        const examIds = teacherExams.map((e) => e.id);
        const { data: sessions } = await supabase
          .from("exam_sessions").select("id").in("exam_id", examIds);
        if (sessions?.length) {
          const sessionIds = sessions.map((s) => s.id);
          await supabase.from("student_answers").delete().in("session_id", sessionIds);
          await supabase.from("cheat_logs").delete().in("session_id", sessionIds);
          await supabase.from("exam_sessions").delete().in("exam_id", examIds);
        }
        await supabase.from("questions").delete().in("exam_id", examIds);
        await supabase.from("exams").delete().eq("teacher_id", teacherId);
      }

      // 2. Remove role and profile — teacher can no longer log in or be identified
      await supabase.from("user_roles").delete().eq("user_id", teacherId);
      await supabase.from("profiles").delete().eq("id", teacherId);

      toast({ title: "Teacher deleted successfully.", description: "All data removed from the system." });
      await loadData();
    } catch (error: any) {
      // Rollback on failure
      setTeachers((prev) => [...prev, removed].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      toast({ title: "Error deleting teacher", description: error.message, variant: "destructive" });
    }
  };

  const openAddStudent = () => { setEditingStudent(null); setStudentName(""); setStudentEmail(""); setStudentGrade(""); setStudentGender("Male"); setStudentPassword("pass1234"); setShowStudentPw(false); setShowStudentDialog(true); };
  const openEditStudent = (s: any) => { setEditingStudent(s); setStudentName(s.full_name); setStudentEmail(s.email || ""); setStudentGrade(s.grade || ""); setStudentGender(s.gender || ""); setStudentPassword(""); setShowStudentPw(false); setShowStudentDialog(true); };

  const handleSaveStudent = async () => {
    if (!studentName.trim()) return;
    setSavingStudent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (editingStudent) {
        // UPDATE
        const updateData: any = { full_name: studentName.trim(), email: studentEmail.trim(), grade: studentGrade.trim(), gender: studentGender };
        if (studentPassword.trim()) {
          updateData.password = studentPassword.trim();
          updateData.must_change_password = true;
        }
        const { error } = await supabase.from("students").update(updateData).eq("id", editingStudent.id);
        if (error) throw error;
        setStudents((prev) => prev.map((s) =>
          s.id === editingStudent.id
            ? { ...s, full_name: studentName.trim(), email: studentEmail.trim(), grade: studentGrade.trim(), gender: studentGender }
            : s
        ));
        toast({ title: "Student updated successfully." });
      } else {
        // CREATE — generate ID based on current max to avoid collisions
        const { data: lastStudent } = await supabase
          .from("students")
          .select("student_id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastNum = lastStudent
          ? parseInt(lastStudent.student_id.replace("STU-", ""), 10) || 0
          : 0;
        const newId = `STU-${String(lastNum + 1).padStart(4, "0")}`;

        const { data: inserted, error } = await supabase.from("students")
          .insert({
            student_id: newId,
            full_name: studentName.trim(),
            email: studentEmail.trim(),
            grade: studentGrade.trim(),
            gender: studentGender,
            password: studentPassword || "pass1234",
            must_change_password: true,
            created_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        // Optimistic UI insert
        setStudents((prev) => [...prev, inserted]);
        toast({ title: "Student added!", description: `Student ID: ${newId}` });
      }
      setShowStudentDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingStudent(false);
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;
    // Optimistic removal first
    const removed = students.find((s) => s.id === deleteStudentId);
    setStudents((prev) => prev.filter((s) => s.id !== deleteStudentId));
    setDeleteStudentId(null);
    try {
      const { error } = await supabase.from("students").delete().eq("id", deleteStudentId);
      if (error) throw error;
      toast({ title: "Student removed successfully." });
    } catch (err: any) {
      // Rollback on failure
      if (removed) setStudents((prev) => [...prev, removed].sort((a, b) => a.student_id.localeCompare(b.student_id)));
      toast({ title: "Error removing student", description: err.message, variant: "destructive" });
    }
  };

  const handleExportStudents = (format: "csv" | "xlsx") => {
    const data = filteredStudents.map((s) => ({ "Student ID": s.student_id, "Full Name": s.full_name, Email: s.email || "", Grade: s.grade || "" }));
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "students.xlsx");
    } else {
      const header = ["Student ID", "Full Name", "Email", "Grade"].join(",");
      const rows = data.map((r) => [r["Student ID"], r["Full Name"], r.Email, r.Grade].map((v) => `"${v}"`).join(","));
      const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: "Exported!" });
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter((s) => s.full_name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q));
  }, [students, studentSearch]);

  const filteredExams = useMemo(() => {
    if (!examSearch.trim()) return exams;
    const q = examSearch.toLowerCase();
    return exams.filter((e) => e.title.toLowerCase().includes(q) || (e.subject || "").toLowerCase().includes(q) || e.access_code.toLowerCase().includes(q));
  }, [exams, examSearch]);

  const sortedResults = useMemo(() => [...results].filter((r) => {
    if (r.status !== "submitted") return false;
    if (resultExamFilter !== "all" && r.exam_id !== resultExamFilter) return false;
    if (resultSearch.trim()) {
      const q = resultSearch.toLowerCase();
      if (!r.student_name.toLowerCase().includes(q) && !r.student_email.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortField === "score") return sortAsc ? (a.score ?? 0) - (b.score ?? 0) : (b.score ?? 0) - (a.score ?? 0);
    return sortAsc ? a.student_name.localeCompare(b.student_name) : b.student_name.localeCompare(a.student_name);
  }), [results, resultExamFilter, resultSearch, sortField, sortAsc]);

  const toggleSort = (field: "score" | "student_name") => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(false); } };
  const SortIcon = ({ field }: { field: string }) => sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const handleExportResults = () => {
    if (!sortedResults.length) return;
    const data = sortedResults.map((r, i) => ({
      Rank: i + 1, Student: r.student_name, Email: r.student_email,
      Exam: r.exam_title, Subject: r.exam_subject,
      Score: r.score ?? 0, "Total Marks": r.total_marks ?? 0,
      "%": r.total_marks && r.total_marks > 0 ? Math.round(((r.score ?? 0) / r.total_marks) * 100) : 0,
      "Submitted At": r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "exam_results.xlsx");
    toast({ title: "Exported!" });
  };

  // Derived — always in sync with exams state
  const activeExams = exams.filter((e) => e.status === "active").length;

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", tab: "overview" },
    { icon: Users, label: "Teachers", tab: "teachers" },
    { icon: UserPlus, label: "Students", tab: "students" },
    { icon: FileText, label: "All Exams", tab: "exams" },
    { icon: BarChart3, label: "Results", tab: "results" },
    { icon: Settings, label: "Settings", tab: "settings" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a8fe3] to-[#1565c0]">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );

  return (
    <DashboardLayout
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
      navItems={navItems}
      onLogout={handleLogout}
      userName="Admin"
      userEmail=""
      role="admin"
      headerTitle={
        tab === "overview" ? "Dashboard" : tab === "teachers" ? "Teachers"
        : tab === "students" ? "Students" : tab === "exams" ? "All Exams"
        : tab === "results" ? "Results" : "Settings"
      }
      headerAction={
        tab === "teachers" ? (
          <button type="button" onClick={openAddTeacher}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a8fe3] text-white text-xs font-semibold hover:bg-[#1a7fd4] transition-colors">
            <UserPlus className="h-3.5 w-3.5" /> Add Teacher
          </button>
        ) : tab === "students" ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleExportStudents("csv")} disabled={!filteredStudents.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 transition-colors">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={() => handleExportStudents("xlsx")} disabled={!filteredStudents.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button type="button" onClick={openAddStudent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a8fe3] text-white text-xs font-semibold hover:bg-[#1a7fd4] transition-colors">
              <UserPlus className="h-3.5 w-3.5" /> Add Student
            </button>
          </div>
        ) : tab === "results" ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadData} disabled={dataLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button type="button" onClick={handleExportResults} disabled={!sortedResults.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        ) : undefined
      }
    >

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Teachers" value={String(teachers.length)} icon={Users} accent="border-l-blue-400" iconBg="bg-blue-50" iconColor="text-blue-500" index={0} />
            <StatCard label="Total Exams" value={String(exams.length)} icon={FileText} accent="border-l-green-400" iconBg="bg-green-50" iconColor="text-green-500" index={1} />
            <StatCard label="Total Students" value={String(totalStudents)} icon={Activity} accent="border-l-purple-400" iconBg="bg-purple-50" iconColor="text-purple-500" index={2} />
            <StatCard label="Active Exams" value={String(activeExams)} icon={TrendingUp} accent="border-l-amber-400" iconBg="bg-amber-50" iconColor="text-amber-500" index={3} />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => navigate("/admin/analytics")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              <BarChart3 className="h-4 w-4" /> Analytics Dashboard
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-[#1e3a5f]">Teachers</h2>
                <button type="button" onClick={() => setTab("teachers")} className="text-xs text-[#1a8fe3] hover:underline font-medium">View All</button>
              </div>
              {teachers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No teachers yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {teachers.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors">
                      <div>
                        <p className="font-semibold text-[#1e3a5f] text-sm">{t.full_name}</p>
                        <p className="text-xs text-slate-400">{t.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600">{t.examCount} exams</p>
                        <p className="text-xs text-slate-400">{t.studentCount} students</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-[#1e3a5f]">Recent Exams</h2>
                <button type="button" onClick={() => setTab("exams")} className="text-xs text-[#1a8fe3] hover:underline font-medium">View All</button>
              </div>
              {exams.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No exams yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {exams.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/70 transition-colors">
                      <div>
                        <p className="font-semibold text-[#1e3a5f] text-sm">{e.title}</p>
                        <p className="text-xs text-slate-400">{e.subject || "—"}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[e.status] || statusColors.draft}`}>{e.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teachers */}
      {tab === "teachers" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#1e3a5f]">Teachers ({teachers.length})</h2>
          </div>
          {teachers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No teachers yet. Add one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Email</th>
                    <th className="text-center px-4 py-3 font-semibold">Exams</th>
                    <th className="text-center px-4 py-3 font-semibold">Students</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#1e3a5f]">{t.full_name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{t.email}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-[#1e3a5f]">{t.examCount}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-[#1e3a5f]">{t.studentCount}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEditTeacher(t)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setDeleteTeacher(t)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Students */}
      {tab === "students" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Student Registry ({filteredStudents.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by name, ID or email…" value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
            </div>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {students.length === 0 ? "No students yet. Add your first student." : "No students match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Student ID</th>
                    <th className="text-left px-4 py-3 font-semibold">Full Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Email</th>
                     <th className="text-left px-4 py-3 font-semibold">Gender</th>
                    <th className="text-left px-4 py-3 font-semibold">Grade</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-[#1a8fe3] bg-blue-50 px-2 py-0.5 rounded">{s.student_id}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#1e3a5f]">{s.full_name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{s.email || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.gender === "Male" ? "bg-blue-50 text-blue-600" : s.gender === "Female" ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-500"}`}>{s.gender || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{s.grade || "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openEditStudent(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setDeleteStudentId(s.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Exams */}
      {tab === "exams" && (
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
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-[#1e3a5f]">All Exams ({filteredExams.length})</h2>
            </div>
            {filteredExams.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">{exams.length === 0 ? "No exams yet." : "No exams match your search."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Exam Name</th>
                      <th className="text-left px-4 py-3 font-semibold">Subject</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-left px-4 py-3 font-semibold">Code</th>
                      <th className="text-left px-4 py-3 font-semibold">Created</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((e) => (
                      <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-[#1e3a5f]">{e.title}</p>
                          <p className="text-xs text-slate-400">{e.subject || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{e.subject || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500">{e.duration_minutes} min</td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{e.access_code}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[e.status] || statusColors.draft}`}>{e.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {tab === "results" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Student Results ({sortedResults.length})</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={resultExamFilter} onChange={(e) => setResultExamFilter(e.target.value)}
                title="Filter by exam" aria-label="Filter by exam"
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#1a8fe3]">
                <option value="all">All Exams</option>
                {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search student name or email…" value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
              </div>
            </div>
          </div>
          {sortedResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {results.filter((r) => r.status === "submitted").length === 0 ? "No submitted results yet." : "No results match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("student_name")}>
                      <span className="flex items-center gap-1">Student <SortIcon field="student_name" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">Exam</th>
                    <th className="text-center px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("score")}>
                      <span className="flex items-center gap-1 justify-center">Score <SortIcon field="score" /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold">Progress</th>
                    <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((r, i) => {
                    const pct = r.total_marks && r.total_marks > 0 ? Math.round(((r.score ?? 0) / r.total_marks) * 100) : null;
                    return (
                      <tr key={r.id} className={`border-t border-slate-50 hover:bg-slate-50/70 transition-colors ${i === 0 ? "bg-amber-50/40" : i === 1 ? "bg-slate-50/60" : i === 2 ? "bg-orange-50/30" : ""}`}>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-200 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-200 text-orange-600" : "bg-slate-50 text-slate-400"}`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#1e3a5f]">{r.student_name}</p>
                          <p className="text-xs text-slate-400">{r.student_email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-700">{r.exam_title}</p>
                          <p className="text-xs text-slate-400">{r.exam_subject}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {pct !== null ? (
                            <>
                              <span className={`text-base font-bold ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}>{pct}%</span>
                              <p className="text-xs text-slate-400">{r.score ?? 0}/{r.total_marks ?? 0}</p>
                            </>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="w-24 mx-auto">
                            <Progress value={pct ?? 0} className="h-1.5" />
                            <p className="text-xs text-slate-400 text-center mt-0.5">{pct ?? 0}%</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
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

      {/* Settings */}
      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1a8fe3]" />
              <h2 className="font-bold text-[#1e3a5f]">Admin Account</h2>
            </div>
            <p className="text-sm text-slate-500">You are logged in as the system administrator. Use the form below to change your password.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#1e3a5f]">Change Password</h2>
            <ChangePasswordForm />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Sign Out</h2>
            <p className="text-sm text-slate-500">Sign out of the admin dashboard.</p>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Student Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={(o) => !o && setShowStudentDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {editingStudent ? `Editing ${editingStudent.student_id}` : "A unique Student ID will be generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student full name" />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@school.edu" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gender *</Label>
                <select value={studentGender} onChange={(e) => setStudentGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Grade / Class</Label>
                <Input value={studentGrade} onChange={(e) => setStudentGrade(e.target.value)} placeholder="e.g. Grade 10A" />
              </div>
            </div>
            {!editingStudent && (
              <div className="space-y-2">
                <Label>Default Password *</Label>
                <div className="relative">
                  <Input type={showStudentPw ? "text" : "password"} value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)} placeholder="Default login password" className="pr-10" />
                  <button type="button" onClick={() => setShowStudentPw(!showStudentPw)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    {showStudentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Student will be required to change this on first login.</p>
              </div>
            )}
            {editingStudent && (
              <div className="space-y-2">
                <Label>Reset Password</Label>
                <div className="relative">
                  <Input type={showStudentPw ? "text" : "password"} value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)} placeholder="Leave blank to keep current" className="pr-10" />
                  <button type="button" onClick={() => setShowStudentPw(!showStudentPw)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    {showStudentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStudentDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveStudent} disabled={savingStudent || !studentName.trim()} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {savingStudent ? "Saving…" : editingStudent ? "Update" : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Student Confirm */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={(o) => !o && setDeleteStudentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the student from the registry. Their exam sessions will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit Teacher Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={(o) => !o && setShowTeacherDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
            <DialogDescription>{editingTeacher ? "Update teacher profile details." : "Create a new teacher account. You will need to manually share the credentials with the teacher."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Teacher full name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@school.edu" disabled={!!editingTeacher} />
            </div>
            {!editingTeacher && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Share this password with the teacher after creation.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeacherDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTeacher} disabled={savingTeacher || !teacherEmail.trim()} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {savingTeacher ? "Saving…" : editingTeacher ? "Update" : "Add Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirm */}
      <AlertDialog open={!!deleteTeacher} onOpenChange={(o) => !o && setDeleteTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTeacher?.full_name}</strong> ({deleteTeacher?.email}) from the system including their auth account, profile, all exams, questions, and student sessions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default AdminDashboard;
