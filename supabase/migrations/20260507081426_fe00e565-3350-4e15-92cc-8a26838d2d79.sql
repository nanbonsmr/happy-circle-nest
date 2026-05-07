DROP POLICY IF EXISTS "Public can read published exams" ON public.exams;

CREATE POLICY "Public can read non-draft exams"
ON public.exams
FOR SELECT
TO anon, authenticated
USING (status = ANY (ARRAY['published'::text, 'active'::text, 'completed'::text]));