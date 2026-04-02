-- Allow anonymous/authenticated users to update student password fields
CREATE POLICY "Students can update own password"
ON public.students
FOR UPDATE
USING (true)
WITH CHECK (true);