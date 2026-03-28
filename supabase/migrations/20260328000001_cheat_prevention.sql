-- Add security_level to exams
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS security_level TEXT NOT NULL DEFAULT 'low'
    CHECK (security_level IN ('low', 'high'));

-- Cheat event logs table
CREATE TABLE IF NOT EXISTS public.cheat_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type  TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cheat_logs ENABLE ROW LEVEL SECURITY;

-- Students (anon) can insert their own logs
CREATE POLICY "Students can insert cheat logs"
  ON public.cheat_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Teachers can read logs for their exams
CREATE POLICY "Teachers can read cheat logs for own exams"
  ON public.cheat_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      JOIN public.exams e ON e.id = es.exam_id
      WHERE es.id = session_id AND e.teacher_id = auth.uid()
    )
  );

-- Admins can read all logs
CREATE POLICY "Admins can read all cheat logs"
  ON public.cheat_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for cheat logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheat_logs;
