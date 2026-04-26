-- Allow students/public to read questions for exams whose results have been published OR exam status is in any non-draft state.
-- This fixes the bug where after an exam is "completed", students opening their result detail page
-- cannot read the question text/options because the previous policy required exams.status = 'active'.

DROP POLICY IF EXISTS "Public can read active exam questions" ON public.questions;

CREATE POLICY "Public can read questions for non-draft exams"
ON public.questions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = questions.exam_id
      AND exams.status IN ('published', 'active', 'completed')
  )
);