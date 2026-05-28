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
 * Also auto-submits any in_progress or waiting sessions for expired exams
 * so students who lost connection still get their answers saved.
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
      if (now < endTime) continue;

      // 1. Mark exam as completed
      const { error } = await supabase
        .from("exams")
        .update({ status: "completed" })
        .eq("id", exam.id)
        .eq("status", "active");

      if (!error) {
        onStatusChange(exam.id, "completed");
      }

      // 2. Auto-submit all sessions that are still in_progress or waiting
      //    (students who lost connection or never submitted)
      const { data: pendingSessions } = await supabase
        .from("exam_sessions")
        .select("id")
        .eq("exam_id", exam.id)
        .in("status", ["in_progress", "waiting"]);

      if (!pendingSessions?.length) continue;

      for (const sess of pendingSessions) {
        // Calculate score from whatever answers exist
        const { data: answers } = await supabase
          .from("student_answers")
          .select("question_id, selected_answer, is_correct")
          .eq("session_id", sess.id);

        const { data: questions } = await supabase
          .from("questions")
          .select("id, correct_answer, marks")
          .eq("exam_id", exam.id);

        const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

        // Re-evaluate is_correct for any answers missing it
        const toUpdate: any[] = [];
        let earnedMarks = 0;
        let totalMarks = 0;

        (questions || []).forEach((q: any) => { totalMarks += q.marks; });

        (answers || []).forEach((a: any) => {
          const q: any = qMap.get(a.question_id);
          if (!q) return;
          const isCorrect = a.selected_answer === q.correct_answer;
          if (a.is_correct === null || a.is_correct === undefined) {
            toUpdate.push({ id: a.question_id, session_id: sess.id, is_correct: isCorrect });
          }
          if ((a.is_correct ?? isCorrect)) earnedMarks += q.marks;
        });

        // Patch any answers missing is_correct
        for (const upd of toUpdate) {
          await supabase
            .from("student_answers")
            .update({ is_correct: upd.is_correct })
            .eq("session_id", upd.session_id)
            .eq("question_id", upd.id);
        }

        // Submit the session
        await supabase
          .from("exam_sessions")
          .update({
            status: "submitted",
            submitted_at: new Date().toISOString(),
            score: earnedMarks,
            total_marks: totalMarks,
          })
          .eq("id", sess.id)
          .in("status", ["in_progress", "waiting"]); // guard: only if still pending
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
