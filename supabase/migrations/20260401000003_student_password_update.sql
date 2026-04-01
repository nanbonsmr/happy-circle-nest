-- Allow students to update their own password and profile
-- Since students don't have auth accounts, we need to allow anon updates

-- Create a function to update student password (bypasses RLS)
CREATE OR REPLACE FUNCTION update_student_password(
  student_db_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Validate inputs
  IF student_db_id IS NULL THEN
    RETURN json_build_object('error', 'Student ID is required');
  END IF;
  
  IF new_password IS NULL OR LENGTH(new_password) < 4 THEN
    RETURN json_build_object('error', 'Password must be at least 4 characters');
  END IF;
  
  -- Update the student password
  UPDATE public.students 
  SET 
    password = new_password,
    must_change_password = false
  WHERE id = student_db_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count = 0 THEN
    RETURN json_build_object('error', 'Student not found or no changes made');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Also create the RLS policy as backup
CREATE POLICY "Students can update own password"
  ON public.students FOR UPDATE
  TO anon, authenticated
  USING (true)  -- Allow any anon user (students don't have auth)
  WITH CHECK (true);  -- Allow the update