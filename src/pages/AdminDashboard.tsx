import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, BarChart3, Settings,
  LayoutDashboard, UserPlus, TrendingUp, Activity, Loader2,
  Trash2, ChevronDown, ChevronUp, Pencil, Download, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
type Tab = "overview" | "teachers" | "exams" | "results" | "settings";

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
  const [activeExams, setActiveExams] = useState(0);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState(() => Math.random().toString(36).slice(2, 10));
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [deleteTeacher, setDeleteTeacher] = useState<TeacherRow | null>(null);
  const [sortField, setSortField] = useState<"score" | "student_name">("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [resultSearch, setResultSearch] = useState("");
  const [resultExamFilter, setResultExamFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      const isTeacher = roles?.some((r) => r.role === "teacher");
      if (!isAdmin && !isTeacher) { navigate("/login"); return; }
      if (!isAdmin && isTeacher) { navigate("/teacher"); return; }
      await loadData();
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Real-time: refresh when sessions or exams change
  useEffect(() => {
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_sessions" }, () => loadData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exams" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Auto-close exams when time expires
  useExamAutoStatus(exams, (examId, newStatus) => {
    setExams((prev) => prev.map((e) => e.id === examId ? { ...e, status: newStatus } : e));
    if (newStatus === "completed") setActiveExams((n) => Math.max(0, n - 1));
  });

  const loadData = async () => {
    const { data: teacherRoles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
    const teacherIds = (teacherRoles || []).map((r) => r.user_id);
    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds);
      const rows: TeacherRow[] = [];
      for (const p of profiles || []) {
        const { count: ec } = await supabase.from("exams").select("*", { count: "exact", head: true }).eq("teacher_id", p.id);
        const { data: te } = await supabase.from("exams").select("id").eq("teacher_id", p.id);
        let sc = 0;
        if (te?.length) { const { count } = await supabase.from("exam_sessions").select("*", { count: "exact", head: true }).in("exam_id", te.map((e) => e.id)); sc = count || 0; }
        rows.push({ id: p.id, full_name: p.full_name || "—", email: p.email, examCount: ec || 0, studentCount: sc });
      }
      setTeachers(rows);
    }
    const { data: allExams } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
    setExams(allExams || []);
    setActiveExams((allExams || []).filter((e) => e.status === "active").length);
    const { data: sessions } = await supabase.from("exam_sessions").select("id, student_name, student_email, score, total_marks, status, submitted_at, exam_id");
    setTotalStudents(sessions?.length || 0);
    const examMap: Map<string, { title: string; subject: string }> = new Map(
      (allExams || []).map((e) => [e.id, { title: e.title, subject: e.subject || "" }])
    );
    setResults((sessions || []).map((s: any) => ({ ...s, exam_title: examMap.get(s.exam_id)?.title || "—", exam_subject: examMap.get(s.exam_id)?.subject || "—" })));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const openAddTeacher = () => { setEditingTeacher(null); setTeacherName(""); setTeacherEmail(""); setTeacherPassword(Math.random().toString(36).slice(2, 10)); setShowTeacherDialog(true); };
  const openEditTeacher = (t: TeacherRow) => { setEditingTeacher(t); setTeacherName(t.full_name === "—" ? "" : t.full_name); setTeacherEmail(t.email); setTeacherPassword(""); setShowTeacherDialog(true); };

  const handleSaveTeacher = async () => {
    setSavingTeacher(true);
    try {
      if (editingTeacher) {
        const { error } = await supabase.from("profiles").update({ full_name: teacherName, email: teacherEmail }).eq("id", editingTeacher.id);
        if (error) throw error;
        toast({ title: "Teacher updated!" });
      } else {
        if (!teacherEmail.trim()) return;
        const { error } = await supabase.auth.signUp({ email: teacherEmail.trim(), password: teacherPassword, options: { data: { full_name: teacherName } } });
        if (error) throw error;
        toast({ title: "Teacher added!", description: `Credentials: ${teacherEmail} / ${teacherPassword}` });
      }
      setShowTeacherDialog(false);
      await loadData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    setSavingTeacher(false);
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTeacher) return;
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", deleteTeacher.id).eq("role", "teacher");
      if (error) throw error;
      toast({ title: "Teacher removed" }); setDeleteTeacher(null); await loadData();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleExportResults = () => {
    if (!sortedResults.length) return;
    const data = sortedResults.map((r, i) => ({ Rank: i + 1, Student: r.student_name, Email: r.student_email, Exam: r.exam_title, Subject: r.exam_subject, Score: r.score ?? 0, "Total Marks": r.total_marks ?? 0, "%": r.total_marks && r.total_marks > 0 ? Math.round(((r.score ?? 0) / r.total_marks) * 100) : 0, "Submitted At": r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "exam_results.xlsx");
    toast({ title: "Exported!" });
  };

  const sortedResults = [...results].filter((r) => {
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
  });

  const toggleSort = (field: "score" | "student_name") => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(false); } };
  const SortIcon = ({ field }: { field: string }) => sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", tab: "overview" },
    { icon: Users, label: "Teachers", tab: "teachers" },
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
      headerTitle={tab === "overview" ? "Dashboard" : tab === "teachers" ? "Teachers" : tab === "exams" ? "All Exams" : tab === "results" ? "Results" : "Settings"}
      headerAction={
        tab === "teachers" ? (
          <button type="button" onClick={openAddTeacher}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a8fe3] text-white text-xs font-semibold hover:bg-[#1a7fd4] transition-colors">
            <UserPlus className="h-3.5 w-3.5" /> Add Teacher
          </button>
        ) : tab === "results" ? (
          <button type="button" onClick={handleExportResults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        ) : undefined
      }
    >

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Teachers" value={String(teachers.length)} icon={Users} accent="border-l-blue-400" iconBg="bg-blue-50" iconColor="text-blue-500" index={0} />
            <StatCard label="Total Exams" value={String(exams.length)} icon={FileText} accent="border-l-green-400" iconBg="bg-green-50" iconColor="text-green-500" index={1} />
            <StatCard label="Total Students" value={String(totalStudents)} icon={Activity} accent="border-l-purple-400" iconBg="bg-purple-50" iconColor="text-purple-500" index={2} />
            <StatCard label="Active Exams" value={String(activeExams)} icon={TrendingUp} accent="border-l-amber-400" iconBg="bg-amber-50" iconColor="text-amber-500" index={3} />
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
                        <p className="text-xs text-slate-400">{e.subject}</p>
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

      {/* Teachers Tab */}
      {tab === "teachers" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#1e3a5f]">Teachers ({teachers.length})</h2>
          </div>
          {teachers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No teachers yet. Add one!</div>
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

      {/* Exams Tab */}
      {tab === "exams" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#1e3a5f]">All Exams ({exams.length})</h2>
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
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#1e3a5f]">{e.title}</td>
                      <td className="px-4 py-3.5 text-slate-500">{e.subject || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{e.duration_minutes} min</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{e.access_code}</td>
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
      )}

      {/* Results Tab */}
      {tab === "results" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1e3a5f]">Student Results ({sortedResults.length})</h2>
              <button type="button" onClick={handleExportResults} disabled={!sortedResults.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={resultExamFilter} onChange={(e) => setResultExamFilter(e.target.value)}
                title="Filter by exam"
                aria-label="Filter by exam"
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#1a8fe3]">
                <option value="all">All Exams</option>
                {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search student..." value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#1a8fe3]" />
              </div>
            </div>
          </div>
          {sortedResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
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
                          <span className={`text-base font-bold ${pct !== null && pct >= 70 ? "text-green-600" : pct !== null && pct >= 40 ? "text-amber-500" : "text-red-500"}`}>
                            {pct !== null ? `${pct}%` : "—"}
                          </span>
                          <p className="text-xs text-slate-400">{r.score ?? 0}/{r.total_marks ?? 0}</p>
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

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#1e3a5f]">Change Password</h2>
            <ChangePasswordForm />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-[#1e3a5f]">Admin Account</h2>
            <p className="text-sm text-slate-500">You are logged in as the system administrator.</p>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleLogout}>
              <Activity className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={(o) => !o && setShowTeacherDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
            <DialogDescription>{editingTeacher ? "Update teacher details." : "Create a new teacher account."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Teacher name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@school.edu" disabled={!!editingTeacher} /></div>
            {!editingTeacher && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} />
                <p className="text-xs text-slate-400">Share this with the teacher.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeacherDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTeacher} disabled={savingTeacher} className="bg-[#1a8fe3] hover:bg-[#1a7fd4] text-white border-0">
              {savingTeacher ? "Saving..." : editingTeacher ? "Update" : "Add Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirm */}
      {deleteTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-[#1e3a5f] mb-2">Remove Teacher</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteTeacher.full_name}</strong> from the system? Their exams will remain.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTeacher(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0" onClick={handleDeleteTeacher}>Remove</Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AdminDashboard;
