
-- Storage bucket for exam-related images (section + option images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-images', 'exam-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view
CREATE POLICY "Public can view exam images"
ON storage.objects FOR SELECT
USING (bucket_id = 'exam-images');

-- Authenticated users (teachers) can upload
CREATE POLICY "Authenticated can upload exam images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exam-images');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated can update exam images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exam-images');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated can delete exam images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exam-images');

-- Per-option image URLs on questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS option_a_image text,
  ADD COLUMN IF NOT EXISTS option_b_image text,
  ADD COLUMN IF NOT EXISTS option_c_image text,
  ADD COLUMN IF NOT EXISTS option_d_image text;
