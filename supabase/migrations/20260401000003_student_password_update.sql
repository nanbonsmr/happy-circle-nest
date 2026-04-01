-- Fix student password update permissions - STUDENT FOCUSED, NO ADMIN REQUIRED
-- Students should be able to update their own passwords without any admin involvement

-- First, drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Anonymous can update student passwords" ON public.students;
DROP POLICY IF EXISTS "Authenticated can update student passwords" ON public.students;
DROP POLICY IF EXISTS "Allow password updates" ON public.students;
DROP POLICY IF EXISTS "Students can update own password" ON public.students;

-- Create a simple, direct policy that allows students to update passwords
-- No admin checks, no complex conditions - just allow password updates
CREATE POLICY "Students update passwords"
  ON public.students FOR UPDATE
  TO anon, authenticated
  USING (true)  -- Allow any user (students are anon)
  WITH CHECK (true);  -- Allow the update

-- Create the database function for password updates - NO ADMIN CHECKS
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
  -- Simple validation - NO ADMIN PERMISSION CHECKS
  IF student_db_id IS NULL THEN
    RETURN json_build_object('error', 'Student ID is required');
  END IF;
  
  IF new_password IS NULL OR LENGTH(TRIM(new_password)) < 4 THEN
    RETURN json_build_object('error', 'Password must be at least 4 characters');
  END IF;
  
  -- Check if student exists (simple existence check, no permissions)
  SELECT EXISTS(SELECT 1 FROM public.students WHERE id = student_db_id) INTO student_exists;
  
  IF NOT student_exists THEN
    RETURN json_build_object('error', 'Student not found');
  END IF;
  
  -- Direct update - no permission checks, just update the password
  UPDATE public.students 
  SET 
    password = TRIM(new_password),
    must_change_password = false
  WHERE id = student_db_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count = 0 THEN
    RETURN json_build_object('error', 'Password update failed - no rows affected');
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

-- Grant execute permission to EVERYONE (anon and authenticated)
-- Students don't need special permissions - they just need to call the function
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_student_password(UUID, TEXT) TO public;