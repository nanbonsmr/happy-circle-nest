-- Fix question count access for published exams
-- Students should be able to see question count on ready page

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public can read active exam questions" ON public.questions;

-- Create new policy that allows reading questions for both published and active exams
CREATE POLICY "Public can read published and active exam questions"
  ON public.questions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND status IN ('published', 'active'))
  );

-- Enable realtime for questions table so question count updates automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;