-- Student registry table
CREATE TABLE IF NOT EXISTS public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  TEXT NOT NULL UNIQUE,  -- e.g. STU-0001
  full_name   TEXT NOT NULL,
  email       TEXT DEFAULT '',
  grade       TEXT DEFAULT '',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Admins can manage all students
CREATE POLICY "Admins can manage students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Teachers can read students (for verification)
CREATE POLICY "Teachers can read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

-- Anyone can read students by student_id (for exam entry lookup)
CREATE POLICY "Public can lookup students"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add student_id column to exam_sessions for verified linking
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS student_registry_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
