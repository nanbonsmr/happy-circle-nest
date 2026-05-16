
-- Allow teachers to update sessions for their own exams (needed for setting result_published_at on submitted sessions)
CREATE POLICY "Teachers can update own exam sessions"
ON public.exam_sessions
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_sessions.exam_id AND exams.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_sessions.exam_id AND exams.teacher_id = auth.uid()));

-- Allow teachers to update student_answers for own exams (snapshot writes)
CREATE POLICY "Teachers can update answers for own exams"
ON public.student_answers
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  JOIN public.exams e ON e.id = es.exam_id
  WHERE es.id = student_answers.session_id AND e.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  JOIN public.exams e ON e.id = es.exam_id
  WHERE es.id = student_answers.session_id AND e.teacher_id = auth.uid()
));

-- Allow admins to delete exam sessions, student answers and cheat logs
CREATE POLICY "Admins can delete exam sessions"
ON public.exam_sessions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete student answers"
ON public.student_answers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cheat logs"
ON public.cheat_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Backfill: published exams with submitted sessions missing result_published_at
UPDATE public.exam_sessions s
SET result_published_at = COALESCE(s.submitted_at, now())
FROM public.exams e
WHERE s.exam_id = e.id
  AND e.results_published = true
  AND s.status = 'submitted'
  AND s.result_published_at IS NULL;
