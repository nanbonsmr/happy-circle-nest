import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FileText, BarChart3, Settings,
  LayoutDashboard, UserPlus, TrendingUp, Activity, Loader2,
  Trash2, ChevronDown, ChevronUp, Pencil, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import type { Tables } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

type Exam = Tables<"exams">;
interface TeacherRow { id: string; full_name: string; email: string; examCount: number; studentCount: number; }
interface SessionRow { id: string; student_name: string; student_email: string; score: number | null; total_marks: number | null; status: string; submitted_at: string | null; exam_title: string; exam_subject: string; }
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
    const examMap = new Map((allExams || []).map((e) => [e.id, e]));
    setResults((sessions || []).map((s) => ({ ...s, exam_title: examMap.get(s.exam_id)?.title || "—", exam_subject: examMap.get(s.exam_id)?.subject || "—" })));
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
    const data = sortedResults.map((r, i) => ({ Rank: i + 1, Student: r.student_name, Email: r.student_email, Exam: r.exam_title, Subject: r.exam_subject, Score: r.score ?? 0, "Total Marks": r.total_marks ?? 0, "%": r.total_marks && r.total_marks > 0 ? Math.round(((r.score ?? 0) / r.total_marks) * 100) : 0, "Submitted At": r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "exam_results.xlsx");
    toast({ title: "Exported!" });
  };

  const sortedResults = [...results].filter((r) => r.status === "submitted").sort((a, b) => {
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
