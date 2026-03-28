import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, FileText, Users, BarChart3, Settings, LogOut,
  LayoutDashboard, Play, Loader2, Pencil, Trash2, Mail,
  Activity, UserCheck, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import type { Tables } from "@/integrations/supabase/types";

type Exam = Tables<"exams">;
type ActiveTab = "dashboard" | "exams" | "reports" | "settings";

interface SessionCounts { total: number; waiting: number; in_progress: number; submitted: number; }
interface StudentReport {
  sessionId: string; studentName: string; studentEmail: string;
  examTitle: string; examSubject: string; score: number | null;
  totalMarks: number | null; status: string; submittedAt: string | null;
  correct: number; incorrect: number; unanswered: number;
  totalQuestions: number; percentage: number | null;
  tabSwitches: number; fullscreenExits: number;
  suspiciousScore: "Low" | "Medium" | "High";
}

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

  const loadCounts = async (list: Exam[]) => {
    if (!list.length) return;
    const counts: Record<string, SessionCounts> = {};
    for (const exam of list) {
      const { data } = await supabase.from("exam_sessions").select("status").eq("exam_id", exam.id);
      const s = data || [];
      counts[exam.id] = {
        total: s.length,
        waiting: s.filter((x) => x.status === "waiting").length,
        in_progress: s.filter((x) => x.status === "in_progress").length,
        submitted: s.filter((x) => x.status === "submitted").length,
      };
    }
    setSessionCounts(counts);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", session.user.id).single();
      if (profile) {
        setUserName(profile.full_name || profile.email || "Teacher");
        setProfileName(profile.full_name || "");
        setProfileEmail(profile.email || "");
      }
      const { data } = await supabase.from("exams").select("*").eq("teacher_id", session.user.id).order("created_at", { ascending: false });
      setExams(data || []);
      await loadCounts(data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);
