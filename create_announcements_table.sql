-- Create announcements table manually
-- Run this in your Supabase SQL editor

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    badge TEXT,
    priority INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read published announcements
CREATE POLICY "Anyone can view published announcements" ON public.announcements
    FOR SELECT USING (is_published = true);

-- Allow admins to manage all announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER handle_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample announcements
INSERT INTO public.announcements (title, description, content, badge, priority, image_url) VALUES
(
    'New Exam Schedule Released',
    'The final examination schedule for this semester has been published. Please check your exam dates and times.',
    'Dear Students,

We are pleased to announce that the final examination schedule for the current semester is now available. Please review your exam dates carefully and make necessary preparations.

Key Points:
- Exams start on March 15th
- Each exam is 2 hours long
- Arrive 30 minutes early
- Bring valid student ID

For any questions, contact the academic office.',
    'Important',
    3,
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop'
),
(
    'System Maintenance Notice',
    'Scheduled maintenance will occur this weekend. The exam platform will be temporarily unavailable.',
    'We will be performing scheduled maintenance on our exam platform this weekend to improve performance and add new features.

Maintenance Window:
- Start: Saturday 11:00 PM
- End: Sunday 6:00 AM
- Duration: 7 hours

During this time, the platform will be unavailable. Please plan accordingly.',
    'Notice',
    2,
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop'
),
(
    'Welcome New Students!',
    'We extend a warm welcome to all new students joining our examination platform this semester.',
    'Welcome to NejoExamPrep! We are excited to have you join our community of learners.

Getting Started:
1. Complete your profile setup
2. Familiarize yourself with the exam interface
3. Take the practice exam
4. Contact support if you need help

We wish you success in your academic journey!',
    'New',
    1,
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=400&fit=crop'
);

-- Grant necessary permissions
GRANT ALL ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO anon;