-- Create student notifications table for exam results
CREATE TABLE IF NOT EXISTS public.student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  score INTEGER,
  total_marks INTEGER,
  percentage INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;

-- Students can read their own notifications
CREATE POLICY "Students can read own notifications"
  ON public.student_notifications FOR SELECT
  TO public
  USING (true); -- Allow public access since students don't have auth accounts

-- Teachers can insert notifications for their exam results
CREATE POLICY "Teachers can create notifications"
  ON public.student_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams e
      JOIN public.user_roles ur ON ur.user_id = e.teacher_id
      WHERE e.id = exam_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'teacher'
    )
  );

-- Teachers can update notifications for their exams
CREATE POLICY "Teachers can update own exam notifications"
  ON public.student_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      JOIN public.user_roles ur ON ur.user_id = e.teacher_id
      WHERE e.id = exam_id 
      AND ur.user_id = auth.uid() 
      AND ur.role = 'teacher'
    )
  );

-- Create function to send results as notifications
CREATE OR REPLACE FUNCTION send_exam_results_as_notifications(exam_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exam_record RECORD;
  session_record RECORD;
  notification_count INTEGER := 0;
  total_sessions INTEGER := 0;
BEGIN
  -- Check if caller is teacher and owns this exam
  SELECT e.* INTO exam_record
  FROM public.exams e
  JOIN public.user_roles ur ON ur.user_id = e.teacher_id
  WHERE e.id = exam_id_param 
  AND ur.user_id = auth.uid() 
  AND ur.role = 'teacher';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Exam not found or unauthorized');
  END IF;

  -- Get all submitted sessions for this exam
  FOR session_record IN
    SELECT 
      es.*,
      (
        SELECT COUNT(*) 
        FROM public.student_answers sa 
        WHERE sa.session_id = es.id AND sa.is_correct = true
      ) as correct_answers,
      (
        SELECT COUNT(*) 
        FROM public.questions q 
        WHERE q.exam_id = exam_id_param
      ) as total_questions
    FROM public.exam_sessions es
    WHERE es.exam_id = exam_id_param 
    AND es.status = 'submitted'
    AND es.student_id IS NOT NULL
  LOOP
    total_sessions := total_sessions + 1;
    
    -- Calculate percentage
    DECLARE
      percentage_score INTEGER := 0;
    BEGIN
      IF session_record.total_marks > 0 THEN
        percentage_score := ROUND((session_record.score::FLOAT / session_record.total_marks::FLOAT) * 100);
      END IF;
    END;

    -- Insert notification (replace existing if any)
    INSERT INTO public.student_notifications (
      student_id,
      exam_id,
      title,
      message,
      score,
      total_marks,
      percentage,
      is_read,
      created_at
    ) VALUES (
      session_record.student_id,
      exam_id_param,
      'Exam Results: ' || exam_record.title,
      'Your results for ' || exam_record.title || ' (' || exam_record.subject || ') are now available. Score: ' || 
      COALESCE(session_record.score, 0) || '/' || COALESCE(session_record.total_marks, 0) || 
      ' (' || percentage_score || '%)',
      session_record.score,
      session_record.total_marks,
      percentage_score,
      false,
      now()
    )
    ON CONFLICT (student_id, exam_id) 
    DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      score = EXCLUDED.score,
      total_marks = EXCLUDED.total_marks,
      percentage = EXCLUDED.percentage,
      updated_at = now();

    notification_count := notification_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'sent', notification_count,
    'total', total_sessions
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Add unique constraint to prevent duplicate notifications
ALTER TABLE public.student_notifications 
ADD CONSTRAINT unique_student_exam_notification 
UNIQUE (student_id, exam_id);