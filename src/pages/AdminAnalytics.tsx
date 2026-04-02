import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, TrendingUp, Award, BarChart3, Loader2, Search,
  ArrowLeft, UserCheck, Target, Percent,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface StudentResult {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  gender: string;
  score: number;
  totalMarks: number;
  percentage: number;
  examId: string;
  examTitle: string;
  status: string;
}

const COLORS = {
  blue: "#4f6ef7",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  male: "#3b82f6",
  female: "#ec4899",
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [exams, setExams] = useState<{ id: string; title: string }[]>([]);
  const [examFilter, setExamFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!roles?.some((r) => r.role === "admin")) { navigate("/login"); return; }

      // Load exams
      const { data: allExams } = await supabase.from("exams").select("id, title").order("created_at", { ascending: false });
      setExams(allExams || []);

      // Load submitted sessions
      const { data: sessions } = await supabase.from("exam_sessions")
        .select("id, student_name, student_email, score, total_marks, exam_id, status, student_registry_id")
        .eq("status", "submitted");

      // Load students for gender data
      const { data: students } = await supabase.from("students").select("id, full_name, gender, email");
      const studentMap = new Map((students || []).map((s: any) => [s.id, s]));
      // Also map by email for fallback
      const emailMap = new Map((students || []).map((s: any) => [s.email?.toLowerCase(), s]));

      const examMap = new Map((allExams || []).map((e) => [e.id, e.title]));

      const mapped: StudentResult[] = (sessions || []).map((s: any) => {
        const student = s.student_registry_id ? studentMap.get(s.student_registry_id) : emailMap.get(s.student_email?.toLowerCase());
        const totalMarks = s.total_marks || 0;
        const score = s.score || 0;
        return {
          sessionId: s.id,
          studentName: s.student_name,
          studentEmail: s.student_email,
          gender: student?.gender || "Unknown",
          score,
          totalMarks,
          percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
          examId: s.exam_id,
          examTitle: examMap.get(s.exam_id) || "Unknown",
          status: s.status,
        };
      });

      setResults(mapped);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (examFilter !== "all" && r.examId !== examFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.studentName.toLowerCase().includes(q) && !r.studentEmail.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [results, examFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const above50 = filtered.filter((r) => r.percentage > 50).length;
    const above80 = filtered.filter((r) => r.percentage > 80).length;
    const avg = total > 0 ? Math.round(filtered.reduce((a, r) => a + r.percentage, 0) / total) : 0;
    const males = filtered.filter((r) => r.gender.toLowerCase() === "male");
    const females = filtered.filter((r) => r.gender.toLowerCase() === "female");
    return { total, above50, above80, avg, males, females };
  }, [filtered]);

  const genderPerformance = useMemo(() => {
    const calc = (list: StudentResult[]) => ({
      total: list.length,
      above50: list.length > 0 ? Math.round((list.filter((r) => r.percentage > 50).length / list.length) * 100) : 0,
      above80: list.length > 0 ? Math.round((list.filter((r) => r.percentage > 80).length / list.length) * 100) : 0,
      avg: list.length > 0 ? Math.round(list.reduce((a, r) => a + r.percentage, 0) / list.length) : 0,
    });
    return { male: calc(stats.males), female: calc(stats.females) };
  }, [stats]);

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
    ];
    filtered.forEach((r) => {
      const bucket = ranges.find((b) => r.percentage >= b.min && r.percentage <= b.max);
      if (bucket) bucket.count++;
    });
    return ranges;
  }, [filtered]);

  const genderPieData = useMemo(() => [
    { name: "Male", value: stats.males.length, color: COLORS.male },
    { name: "Female", value: stats.females.length, color: COLORS.female },
  ], [stats]);

  const rankedResults = useMemo(() => {
    return [...filtered].sort((a, b) => b.percentage - a.percentage).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [filtered]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );

  const summaryCards = [
    { label: "Total Students", value: stats.total, icon: Users, bg: "bg-blue-50", color: "text-blue-600", border: "border-blue-200" },
    { label: "Score > 50%", value: stats.above50, icon: TrendingUp, bg: "bg-green-50", color: "text-green-600", border: "border-green-200" },
    { label: "Score > 80%", value: stats.above80, icon: Award, bg: "bg-purple-50", color: "text-purple-600", border: "border-purple-200" },
    { label: "Average Score", value: `${stats.avg}%`, icon: Target, bg: "bg-amber-50", color: "text-amber-600", border: "border-amber-200" },
    { label: "Male Students", value: stats.males.length, icon: UserCheck, bg: "bg-sky-50", color: "text-sky-600", border: "border-sky-200" },
    { label: "Female Students", value: stats.females.length, icon: UserCheck, bg: "bg-pink-50", color: "text-pink-600", border: "border-pink-200" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/admin")} title="Back to admin dashboard" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-sm text-slate-500">Performance insights & student analytics</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            title="Filter by exam"
            aria-label="Filter by exam"
            className="h-10 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="all">All Exams</option>
            {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className={`bg-white rounded-2xl p-4 border ${card.border} hover:shadow-lg transition-all duration-300 cursor-default group`}
            >
              <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <h3 className="text-base font-bold text-slate-900 mb-4">Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value: number) => [value, "Students"]}
                />
                <Bar dataKey="count" fill={COLORS.indigo} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gender Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <h3 className="text-base font-bold text-slate-900 mb-4">Gender Distribution</h3>
            {genderPieData.every((d) => d.value === 0) ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No gender data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={genderPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {genderPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Gender-Based Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Male", data: genderPerformance.male, color: COLORS.male, bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Female", data: genderPerformance.female, color: COLORS.female, bg: "bg-pink-50", border: "border-pink-200" },
          ].map((group) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className={`bg-white rounded-2xl p-6 border ${group.border} shadow-sm`}
            >
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full shrink-0 ${group.label === "Male" ? "bg-blue-500" : "bg-pink-500"}`} />
                {group.label} Performance ({group.data.total})
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Average Score</span>
                    <span className="font-bold text-slate-900">{group.data.avg}%</span>
                  </div>
                  <Progress value={group.data.avg} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Passed (&gt;50%)</span>
                    <span className="font-bold text-green-600">{group.data.above50}%</span>
                  </div>
                  <Progress value={group.data.above50} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Excellent (&gt;80%)</span>
                    <span className="font-bold text-purple-600">{group.data.above80}%</span>
                  </div>
                  <Progress value={group.data.above80} className="h-2" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Student Results ({rankedResults.length})</h3>
          </div>
          {rankedResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No results found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Gender</th>
                    <th className="text-center px-4 py-3 font-semibold">Score</th>
                    <th className="text-center px-4 py-3 font-semibold">%</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedResults.map((r) => (
                    <tr key={r.sessionId} className="border-t border-slate-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          r.rank === 1 ? "bg-amber-100 text-amber-700" :
                          r.rank === 2 ? "bg-slate-200 text-slate-700" :
                          r.rank === 3 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-50 text-slate-400"
                        }`}>{r.rank}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{r.studentName}</p>
                        <p className="text-xs text-slate-400">{r.examTitle}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          r.gender.toLowerCase() === "male" ? "bg-blue-50 text-blue-600" :
                          r.gender.toLowerCase() === "female" ? "bg-pink-50 text-pink-600" :
                          "bg-slate-50 text-slate-500"
                        }`}>{r.gender || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {r.score}/{r.totalMarks}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-sm font-bold ${
                          r.percentage >= 80 ? "text-green-600" :
                          r.percentage >= 50 ? "text-amber-500" :
                          "text-red-500"
                        }`}>{r.percentage}%</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          r.percentage >= 50 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                        }`}>{r.percentage >= 50 ? "Passed" : "Failed"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
