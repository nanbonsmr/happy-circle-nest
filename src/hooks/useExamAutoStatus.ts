import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Exam {
  id: string;
  status: string;
  started_at: string | null;
  duration_minutes: number;
}

/**
 * Polls every 30s and auto-closes exams whose time has expired.
 * Calls onStatusChange when any exam status is updated.
 */
export function useExamAutoStatus(
  exams: Exam[],
  onStatusChange: (examId: string, newStatus: string) => void
) {
  const checkAndClose = useCallback(async () => {
    const now = Date.now();
    for (const exam of exams) {
      if (exam.status !== "active" || !exam.started_at) continue;
      const endTime =
        new Date(exam.started_at).getTime() + exam.duration_minutes * 60 * 1000;
      if (now >= endTime) {
        const { error } = await supabase
          .from("exams")
          .update({ status: "completed" })
          .eq("id", exam.id)
          .eq("status", "active"); // guard: only update if still active
        if (!error) {
          onStatusChange(exam.id, "completed");
        }
      }
    }
  }, [exams, onStatusChange]);

  useEffect(() => {
    if (!exams.length) return;
    checkAndClose(); // run immediately
    const interval = setInterval(checkAndClose, 30_000);
    return () => clearInterval(interval);
  }, [checkAndClose, exams]);
}
