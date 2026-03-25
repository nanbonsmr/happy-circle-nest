import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Users, FileText, BarChart3, Settings, LogOut,
  LayoutDashboard, UserPlus, TrendingUp, Activity, Loader2,
  Trash2, ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Exam = Tables<"exams">;

interface TeacherRow {
  id: string;
  full_name: string;
  email: string;
  examCount: number;
  studentCount: number;
}

interface SessionRow {
  id: string;
  student_name: string;
  student_email: string;
  score: number | null;
  total_marks: number | null;
  status: string;
  submitted_at: string | null;
  exam_title: string;
  exam_subject: string;
}

type Tab = "overview" | "teachers" | "exams" | "results" | "settings";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  // Data
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<SessionRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeExams, setActiveExams] = useState(0);

  // Add teacher dialog
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState(() => Math.random().toString(36).slice(2, 10));
  const [addingTeacher, setAddingTeacher] = useState(false);

  // Results sort
  const [sortField, setSortField] = useState<"score" | "student_name">("score");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isAdmin = roles?.some((r) => r.role === "admin");
      const isTeacher = roles?.some((r) => r.role === "teacher");
      if (!isAdmin && !isTeacher) { navigate("/login"); return; }
      // If only teacher, redirect to teacher dashboard
      if (!isAdmin && isTeacher) { navigate("/teacher"); return; }

      await loadData();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const loadData = async () => {
    // Load all profiles with teacher role
    const { data: teacherRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    const teacherIds = (teacherRoles || []).map((r) => r.user_id);

    if (teacherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", teacherIds);

      // Get exam counts and student counts per teacher
      const teacherRows: TeacherRow[] = [];
      for (const p of profiles || []) {
        const { count: examCount } = await supabase
          .from("exams")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", p.id);

        const { data: teacherExams } = await supabase
          .from("exams")
          .select("id")
          .eq("teacher_id", p.id);

        let studentCount = 0;
        if (teacherExams && teacherExams.length > 0) {
          const { count } = await supabase
            .from("exam_sessions")
            .select("*", { count: "exact", head: true })
            .in("exam_id", teacherExams.map((e) => e.id));
          studentCount = count || 0;
        }

        teacherRows.push({
          id: p.id,
          full_name: p.full_name || "—",
          email: p.email,
          examCount: examCount || 0,
          studentCount,
        });
      }
      setTeachers(teacherRows);
    }

    // Load all exams
    const { data: allExams } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });
    setExams(allExams || []);
    setActiveExams((allExams || []).filter((e) => e.status === "active").length);

    // Load all results (sessions with exam info)
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id, student_name, student_email, score, total_marks, status, submitted_at, exam_id");

    setTotalStudents(sessions?.length || 0);

    // Map exam titles
    const examMap = new Map((allExams || []).map((e) => [e.id, e]));
    const resultRows: SessionRow[] = (sessions || []).map((s) => {
      const exam = examMap.get(s.exam_id);
      return {
        ...s,
        exam_title: exam?.title || "—",
        exam_subject: exam?.subject || "—",
      };
    });
    setResults(resultRows);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleAddTeacher = async () => {
    if (!newEmail.trim()) return;
    setAddingTeacher(true);
    try {
      // Sign up new teacher — they'll get the default 'teacher' role from the trigger
      const { error } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
      });
      if (error) throw error;

      toast({
        title: "Teacher added!",
        description: `Credentials: ${newEmail} / ${newPassword}. Share these securely.`,
      });
      setShowAddTeacher(false);
      setNewEmail("");
      setNewPassword(Math.random().toString(36).slice(2, 10));
      // Reload data
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAddingTeacher(false);
    }
  };

  const sortedResults = [...results]
    .filter((r) => r.status === "submitted")
    .sort((a, b) => {
      if (sortField === "score") {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        return sortAsc ? sa - sb : sb - sa;
      }
      return sortAsc
        ? a.student_name.localeCompare(b.student_name)
        : b.student_name.localeCompare(a.student_name);
    });

  const toggleSort = (field: "score" | "student_name") => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-primary/10 text-primary",
    active: "bg-success/10 text-success",
    completed: "bg-muted text-muted-foreground",
  };

  const stats = [
    { label: "Total Teachers", value: String(teachers.length), icon: Users, change: "" },
    { label: "Total Exams", value: String(exams.length), icon: FileText, change: `${activeExams} active` },
    { label: "Total Students", value: String(totalStudents), icon: TrendingUp, change: "" },
    { label: "Submitted", value: String(results.filter((r) => r.status === "submitted").length), icon: Activity, change: "" },
  ];

  const navItems: { icon: typeof LayoutDashboard; label: string; tab: Tab }[] = [
    { icon: LayoutDashboard, label: "Overview", tab: "overview" },
    { icon: Users, label: "Teachers", tab: "teachers" },
    { icon: FileText, label: "All Exams", tab: "exams" },
    { icon: BarChart3, label: "Results", tab: "results" },
    { icon: Settings, label: "Settings", tab: "settings" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-card">
        <div className="p-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">ExamFlow</span>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium ml-auto">Admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === item.tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold capitalize">{tab === "overview" ? "Admin Dashboard" : tab}</h1>
              <p className="text-sm text-muted-foreground">System overview and management</p>
            </div>
            {tab === "teachers" && (
              <Button onClick={() => setShowAddTeacher(true)} className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
                <UserPlus className="h-4 w-4" /> Add Teacher
              </Button>
            )}
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Overview */}
          {tab === "overview" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <stat.icon className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        {stat.change && <p className="text-xs text-success mt-1">{stat.change}</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Recent results */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-lg">Recent Submissions</CardTitle></CardHeader>
                <CardContent>
                  {sortedResults.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Student</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Exam</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Score</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedResults.slice(0, 10).map((r) => (
                            <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-medium">{r.student_name}</p>
                                <p className="text-xs text-muted-foreground">{r.student_email}</p>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{r.exam_title}</td>
                              <td className="py-3 px-4">
                                <span className="font-semibold">{r.score ?? 0}</span>
                                <span className="text-muted-foreground">/{r.total_marks ?? 0}</span>
                                {r.total_marks && r.total_marks > 0 && (
                                  <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                    ((r.score ?? 0) / r.total_marks) >= 0.7 ? "bg-success/10 text-success" : ((r.score ?? 0) / r.total_marks) >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"
                                  }`}>
                                    {Math.round(((r.score ?? 0) / r.total_marks) * 100)}%
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">
                                {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Teachers tab */}
          {tab === "teachers" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">All Teachers</CardTitle></CardHeader>
              <CardContent>
                {teachers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No teachers registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Name</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Exams</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Students</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t) => (
                          <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium">{t.full_name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{t.email}</td>
                            <td className="py-3 px-4">{t.examCount}</td>
                            <td className="py-3 px-4">{t.studentCount}</td>
                            <td className="py-3 px-4">
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">Active</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Exams tab */}
          {tab === "exams" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">All Exams</CardTitle></CardHeader>
              <CardContent>
                {exams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No exams created yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Title</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Subject</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Code</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exams.map((exam) => (
                          <tr key={exam.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium">{exam.title}</td>
                            <td className="py-3 px-4 text-muted-foreground">{exam.subject}</td>
                            <td className="py-3 px-4">{exam.duration_minutes} min</td>
                            <td className="py-3 px-4 font-mono text-xs">{exam.access_code}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[exam.status] || statusColors.draft}`}>
                                {exam.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">
                              {new Date(exam.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results tab */}
          {tab === "results" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">All Results ({sortedResults.length} submissions)</CardTitle></CardHeader>
              <CardContent>
                {sortedResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No results yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">#</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer select-none" onClick={() => toggleSort("student_name")}>
                            <span className="flex items-center gap-1">Student <SortIcon field="student_name" /></span>
                          </th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Exam</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer select-none" onClick={() => toggleSort("score")}>
                            <span className="flex items-center gap-1">Score <SortIcon field="score" /></span>
                          </th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">%</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedResults.map((r, i) => {
                          const pct = r.total_marks && r.total_marks > 0 ? Math.round(((r.score ?? 0) / r.total_marks) * 100) : 0;
                          return (
                            <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                              <td className="py-3 px-4">
                                <p className="font-medium">{r.student_name}</p>
                                <p className="text-xs text-muted-foreground">{r.student_email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p>{r.exam_title}</p>
                                <p className="text-xs text-muted-foreground">{r.exam_subject}</p>
                              </td>
                              <td className="py-3 px-4 font-semibold">{r.score ?? 0}/{r.total_marks ?? 0}</td>
                              <td className="py-3 px-4">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  pct >= 70 ? "bg-success/10 text-success" : pct >= 40 ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"
                                }`}>{pct}%</span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">
                                {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Settings tab */}
          {tab === "settings" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">Settings</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Platform settings will be available here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Create a teacher account. Share the credentials securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="teacher@school.edu" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Auto-generated Password</Label>
              <div className="flex gap-2">
                <Input value={newPassword} readOnly className="font-mono bg-muted" />
                <Button variant="outline" size="sm" onClick={() => setNewPassword(Math.random().toString(36).slice(2, 10))}>
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeacher(false)}>Cancel</Button>
            <Button onClick={handleAddTeacher} disabled={addingTeacher || !newEmail.trim()} className="gradient-primary border-0 text-primary-foreground hover:opacity-90">
              {addingTeacher ? "Creating..." : "Create Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
