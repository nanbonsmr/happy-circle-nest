-- Track whether a session was terminated due to violations
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS ejected_by_violation BOOLEAN NOT NULL DEFAULT false;
