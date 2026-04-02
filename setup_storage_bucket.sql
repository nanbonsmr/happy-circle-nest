-- Create storage bucket for announcement images
-- Run this in your Supabase SQL editor

-- Create the announcements bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcements',
  'announcements',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the announcements bucket
CREATE POLICY "Anyone can view announcement images" ON storage.objects
  FOR SELECT USING (bucket_id = 'announcements');

CREATE POLICY "Admins can upload announcement images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'announcements' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcement images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'announcements' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete announcement images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'announcements' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );