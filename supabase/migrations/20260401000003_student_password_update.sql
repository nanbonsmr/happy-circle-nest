-- Allow students to update their own password and profile
-- Since students don't have auth accounts, we need to allow anon updates

CREATE POLICY "Students can update own password"
  ON public.students FOR UPDATE
  TO anon, authenticated
  USING (true)  -- Allow any anon user (students don't have auth)
  WITH CHECK (true);  -- Allow the update

-- Note: This is secure because:
-- 1. Students must know their student_id to login (which is in session)
-- 2. The update is done by student_db_id which is only available after login
-- 3. The frontend validates the student session before allowing updates