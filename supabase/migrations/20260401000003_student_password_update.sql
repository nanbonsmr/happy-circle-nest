-- Fix student password update permissions deeply
-- This migration resolves RLS policy conflicts and ensures students can update passwords

-- First, drop any existing conflicting policies on students table
DROP POLICY IF EXISTS "Students can update own password" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Teachers can read students" ON public.students;
DROP POLICY IF EXISTS "Public can lookup students" ON public.students;

-- Recreate policies with clear hierarchy and no conflicts
-- 1. Admins can do everything
CREATE POLICY "Admins can manage all students"
  ON public.students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Teachers can read students
CREATE POLICY "Teachers can read students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- 3. Public (including students) can read students for lookup
CREATE POLICY "Public can read students"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. CRITICAL: Allow anonymous users (students) to update their password
-- This is the key policy that was missing/conflicting
CREATE POLICY "Anonymous can update student passwords"
  ON public.students FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow authenticated users (in case student somehow gets auth)
CREATE POLICY "Authenticated can update student passwords"
  ON public.students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create the database function for password updates (bypasses RLS entirely)
CREATE OR REPLACE FUNCTION update_student_password(
  student_db_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
  student_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF student_db_id IS NULL THEN
    RETURN json_build_object('error', 'Student ID is required');
  END IF;
  
  IF new_password IS NULL OR LENGTH(TRIM(new_password)) < 4 THEN
    RETURN json_build_object('error', 'Password must be at least 4 characters');
  END IF;
  
  -- Check if student exists first
  SELECT EXISTS(SELECT 1 FROM public.students WHERE id = student_db_id) INTO student_exists;
  
  IF NOT student_exists THEN
    RETURN json_build_object('error', 'Student not found');
  END IF;
  
  -- Update the student password (this bypasses RLS because of SECURITY DEFINER)
  UPDATE public.students 
  SET 
    password = TRIM(new_password),
    must_change_password = false
  WHERE id = student_db_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count = 0 THEN
    RETURN json_build_object('error', 'No changes made - student may not exist');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully',
    'updated_count', updated_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$$;

-- Grant execute permission on the function to anonymous users
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO authenticated;