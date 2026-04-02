-- Cleanup script to remove announcements system from database
-- Run this in your Supabase SQL editor to completely remove the announcements system

-- Drop the announcements table and all related objects
DROP TABLE IF EXISTS public.announcements CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Remove storage bucket and all files
DELETE FROM storage.objects WHERE bucket_id = 'announcements';
DELETE FROM storage.buckets WHERE id = 'announcements';

-- Drop any remaining policies (they should be dropped with CASCADE, but just in case)
DROP POLICY IF EXISTS "Anyone can view published announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete announcement images" ON storage.objects;

-- Note: This script will completely remove all announcements data
-- Make sure to backup any important announcements before running this script