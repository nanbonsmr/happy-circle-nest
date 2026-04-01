
-- Add password and must_change_password to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password text DEFAULT '' NOT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true NOT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add results_published to exams table  
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS results_published boolean DEFAULT false NOT NULL;
