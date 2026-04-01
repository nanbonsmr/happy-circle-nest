-- Restore admin and teacher policies for students table
-- These are separate from student password updates to avoid conflicts

-- Admins can manage all students (but this won't interfere with student password updates)
CREATE POLICY "Admins manage students"
  ON public.students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can read students (for verification during exams)
CREATE POLICY "Teachers read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- Public can read students (for exam entry lookup)
CREATE POLICY "Public read students"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);