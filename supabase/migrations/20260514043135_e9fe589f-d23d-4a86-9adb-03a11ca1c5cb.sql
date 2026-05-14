
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS result_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_email_sent_at timestamptz;

ALTER TABLE public.student_answers
  ADD COLUMN IF NOT EXISTS question_text text,
  ADD COLUMN IF NOT EXISTS option_a text,
  ADD COLUMN IF NOT EXISTS option_b text,
  ADD COLUMN IF NOT EXISTS option_c text,
  ADD COLUMN IF NOT EXISTS option_d text,
  ADD COLUMN IF NOT EXISTS option_a_image text,
  ADD COLUMN IF NOT EXISTS option_b_image text,
  ADD COLUMN IF NOT EXISTS option_c_image text,
  ADD COLUMN IF NOT EXISTS option_d_image text,
  ADD COLUMN IF NOT EXISTS correct_answer text,
  ADD COLUMN IF NOT EXISTS marks integer,
  ADD COLUMN IF NOT EXISTS question_order integer;

-- Backfill: for any exam currently flagged published, mark already-submitted sessions as published now
UPDATE public.exam_sessions es
SET result_published_at = COALESCE(es.submitted_at, now())
WHERE result_published_at IS NULL
  AND status = 'submitted'
  AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = es.exam_id AND e.results_published = true);

-- Backfill snapshot of question content for those sessions where question still exists
UPDATE public.student_answers sa
SET question_text = q.question_text,
    option_a = q.option_a, option_b = q.option_b, option_c = q.option_c, option_d = q.option_d,
    option_a_image = q.option_a_image, option_b_image = q.option_b_image,
    option_c_image = q.option_c_image, option_d_image = q.option_d_image,
    correct_answer = q.correct_answer,
    marks = q.marks,
    question_order = q.question_order
FROM public.questions q, public.exam_sessions es
WHERE sa.question_id = q.id
  AND sa.session_id = es.id
  AND es.result_published_at IS NOT NULL
  AND sa.question_text IS NULL;
