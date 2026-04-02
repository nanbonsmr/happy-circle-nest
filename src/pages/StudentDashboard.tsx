import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, BookOpen, BarChart3, Settings, LogOut, Loader2, Clock, Award, User, KeyRound, Eye, EyeOff, AlertTriangle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface ExamResult {
  sessionId: string;
  examId: string;
  examTitle: string;
  examSubject: string;
  score: number | null;
  totalMarks: number | null;
  status: string;
  submittedAt: string | null;
  resultsPublished: boolean;
}

interface AvailableExam {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  access_code: string;
  status: string;
}

type Tab = "dashboard" | "exams" | "results" | "profile";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [mustChangePw, setMustChangePw] = useState(false);

  // Profile edit
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const studentDbId = sessionStorage.getItem("student_db_id");
  const studentName = sessionStorage.getItem("student_name") || "Student";
  const studentIdCode = sessionStorage.getItem("student_id") || "";

  useEffect(() => {
    if (!sessionStorage.getItem("student_logged_in")) {
      navigate("/student");
      return;
    }
    if (sessionStorage.getItem("student_must_change_pw") === "true") {
      setMustChangePw(true);
      setTab("profile");
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!studentDbId) return;
    try {
      // Get student info
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentDbId)
        .maybeSingle();
      setStudentInfo(student);

      

      // Get exam sessions for this student
      const { data: sessions } = await (supabase
        .from("exam_sessions")
        .select("id, exam_id, score, total_marks, status, submitted_at") as any)
        .eq("student_registry_id", studentDbId);

      if (sessions?.length) {
        const examIds = [...new Set(sessions.map((s: any) => s.exam_id))];
        const { data: exams } = await supabase
          .from("exams")
          .select("id, title, subject, results_published")
          .in("id", examIds as string[]);

        const examMap = new Map(exams?.map((e: any) => [e.id, e]) || []);
        const resultRows: ExamResult[] = sessions.map((s: any) => {
          const exam: any = examMap.get(s.exam_id) || {};
          return {
            sessionId: s.id,
            examId: s.exam_id,
            examTitle: exam.title || "Unknown",
            examSubject: exam.subject || "",
            score: s.score,
            totalMarks: s.total_marks,
            status: s.status,
            submittedAt: s.submitted_at,
            resultsPublished: exam.results_published || false,
          };
        });
        setResults(resultRows);
      }

      // Get available exams (published/active)
      const { data: available } = await supabase
        .from("exams")
        .select("id, title, subject, duration_minutes, access_code, status")
        .in("status", ["published", "active"]);
      setAvailableExams(available || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, [studentDbId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/student");
  };

  

  const handleChangePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      toast({ title: "Password must be at least 4 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!studentDbId) {
      toast({ title: "Error", description: "Student session not found.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const { error: updateError } = await supabase
        .from("students")
        .update({ password: newPassword.trim(), must_change_password: false })
        .eq("id", studentDbId);

      if (updateError) throw updateError;

      sessionStorage.setItem("student_must_change_pw", "false");
      setMustChangePw(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed successfully!" });
    } catch (err: any) {
      toast({ title: "Password Update Failed", description: err.message, variant: "destructive" });
    }
    setSavingPw(false);
  };

  const handleJoinExam = (accessCode: string) => {
    // Set session info for the exam flow
    sessionStorage.setItem("access_code", accessCode);
    navigate(`/exam/${accessCode}`);
  };

  const navItems = [
    { icon: BookOpen, label: "Dashboard", tab: "dashboard" as Tab },
    { icon: Clock, label: "Exams", tab: "exams" as Tab },
    { icon: BarChart3, label: "Results", tab: "results" as Tab },
    { icon: User, label: "Profile", tab: "profile" as Tab },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
    </div>
  );

  const submittedResults = results.filter(r => r.status === "submitted");
  const publishedResults = submittedResults.filter(r => r.resultsPublished);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f1e2e] text-white flex flex-col shrink-0 hidden md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-bold text-sm">NejoExamPrep</span>
        </div>
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {studentInfo?.avatar_url ? (
              <img src={studentInfo.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
                {studentName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{studentName}</p>
              <p className="text-xs text-white/50">{studentIdCode}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.tab} onClick={() => setTab(item.tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === item.tab ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0f1e2e] text-white z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-7 w-7 rounded-full" />
          <span className="font-bold text-sm">NejoExamPrep</span>
        </div>
        <button onClick={handleLogout} className="text-red-400 text-xs">Logout</button>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto md:p-6 p-4 pt-16 md:pt-6">
        {/* Must change password overlay */}
        {mustChangePw && tab !== "profile" && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Password Change Required</p>
              <p className="text-sm text-amber-700">You must change your default password before accessing exams.
                <button onClick={() => setTab("profile")} className="ml-1 text-[#2563EB] underline font-medium">Go to Profile</button>
              </p>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-[#0f172a]">Welcome, {studentName}!</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0f172a]">{availableExams.length}</p>
                    <p className="text-xs text-slate-500">Available Exams</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0f172a]">{submittedResults.length}</p>
                    <p className="text-xs text-slate-500">Exams Taken</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0f172a]">{publishedResults.length}</p>
                    <p className="text-xs text-slate-500">Results Available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-[#0f172a] flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Exam Results
                  </h2>
                  <span className="text-xs text-slate-500">{notifications.filter(n => !n.is_read).length} new</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {notifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markNotificationAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-[#0f172a] mb-1">{notification.title}</h3>
                          <p className="text-xs text-slate-600 mb-2">{notification.message}</p>
                          {notification.score !== null && notification.total_marks !== null && (
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-slate-500">
                                Score: <span className="font-semibold text-[#0f172a]">{notification.score}/{notification.total_marks}</span>
                              </span>
                              {notification.percentage !== null && (
                                <span className={`font-semibold ${
                                  notification.percentage >= 70 ? 'text-green-600' : 
                                  notification.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {notification.percentage}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {notifications.length > 3 && (
                  <div className="px-5 py-3 bg-slate-50 text-center">
                    <button 
                      onClick={() => setTab("results")} 
                      className="text-xs text-[#2563EB] hover:underline font-medium"
                    >
                      View All Results
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recent results */}
            {publishedResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-[#0f172a]">Recent Results</h2>
                  <button onClick={() => setTab("results")} className="text-xs text-[#2563EB] hover:underline font-medium">View All</button>
                </div>
                <div className="divide-y divide-slate-50">
                  {publishedResults.slice(0, 3).map((r) => {
                    const pct = r.totalMarks && r.totalMarks > 0 ? Math.round(((r.score ?? 0) / r.totalMarks) * 100) : null;
                    return (
                      <div key={r.sessionId} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => navigate(`/student/results/${r.sessionId}`)}>
                        <div>
                          <p className="font-semibold text-[#0f172a] text-sm">{r.examTitle}</p>
                          <p className="text-xs text-slate-400">{r.examSubject}</p>
                        </div>
                        {pct !== null && (
                          <span className={`text-sm font-bold ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}>
                            {pct}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available Exams */}
        {tab === "exams" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-[#0f172a]">Available Exams</h1>
            {mustChangePw ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-amber-800">Change your password first</p>
                <p className="text-sm text-amber-700 mt-1">You must update your default password before joining exams.</p>
              </div>
            ) : availableExams.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No exams available right now.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {availableExams.map((exam) => {
                  const alreadyTaken = results.some(r => r.examId === exam.id && r.status === "submitted");
                  return (
                    <div key={exam.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-[#0f172a]">{exam.title}</h3>
                        <p className="text-sm text-slate-500">{exam.subject} · {exam.duration_minutes} min</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${exam.status === "active" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                          {exam.status}
                        </span>
                      </div>
                      {alreadyTaken ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">Completed</span>
                      ) : (
                        <button onClick={() => handleJoinExam(exam.access_code)}
                          className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-colors">
                          Join Exam
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {tab === "results" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-[#0f172a]">My Results</h1>
            {submittedResults.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No results yet. Take an exam to see your results here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <th className="text-left px-5 py-3 font-semibold">Exam</th>
                        <th className="text-left px-4 py-3 font-semibold">Subject</th>
                        <th className="text-center px-4 py-3 font-semibold">Score</th>
                        <th className="text-center px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {submittedResults.map((r) => {
                        const pct = r.totalMarks && r.totalMarks > 0 ? Math.round(((r.score ?? 0) / r.totalMarks) * 100) : null;
                        return (
                          <tr key={r.sessionId} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-[#0f172a]">{r.examTitle}</td>
                            <td className="px-4 py-3.5 text-slate-500">{r.examSubject || "—"}</td>
                            <td className="px-4 py-3.5 text-center">
                              {r.resultsPublished && pct !== null ? (
                                <span className={`font-bold ${pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}>{pct}%</span>
                              ) : (
                                <span className="text-slate-400 text-xs">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {r.resultsPublished ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-600">Published</span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Awaiting</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-500">
                              {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              {r.resultsPublished && (
                                <button onClick={() => navigate(`/student/results/${r.sessionId}`)}
                                  className="text-xs text-[#2563EB] hover:underline font-medium">View Details</button>
                              )}
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

        {/* Profile */}
        {tab === "profile" && (
          <div className="max-w-lg space-y-4">
            <h1 className="text-2xl font-bold text-[#0f172a]">My Profile</h1>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-4 mb-6">
                {studentInfo?.avatar_url ? (
                  <img src={studentInfo.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-xl">
                    {studentName.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">{studentName}</h2>
                  <p className="text-sm text-slate-500">{studentIdCode}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-[#0f172a]">{studentInfo?.email || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-medium text-[#0f172a]">{studentInfo?.gender || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Grade</span>
                  <span className="font-medium text-[#0f172a]">{studentInfo?.grade || "—"}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <h2 className="font-bold text-[#0f172a] flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {mustChangePw ? "Change Default Password (Required)" : "Change Password"}
              </h2>
              {mustChangePw && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>Security:</strong> You must change your default password before using the platform.
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">New Password</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 4 characters"
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-2.5 text-slate-400">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <input type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]" />
                </div>
                <button onClick={handleChangePassword} disabled={savingPw || !newPassword.trim()}
                  className="w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-colors disabled:opacity-60">
                  {savingPw ? "Saving…" : "Update Password"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
              <h2 className="font-bold text-[#0f172a]">Sign Out</h2>
              <button onClick={handleLogout}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50">
          {navItems.map((item) => (
            <button key={item.tab} onClick={() => setTab(item.tab)}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${tab === item.tab ? "text-[#2563EB]" : "text-slate-400"}`}>
              <item.icon className="h-4 w-4 mb-0.5" />
              {item.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
