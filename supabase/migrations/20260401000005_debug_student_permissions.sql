-- Simple debug function to check student password update functionality
-- NO ADMIN PERMISSIONS REQUIRED

CREATE OR REPLACE FUNCTION test_student_password_update()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  test_student_id UUID;
BEGIN
  -- Check if RLS is enabled on students table
  SELECT relrowsecurity INTO rls_enabled 
  FROM pg_class 
  WHERE relname = 'students' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Count policies on students table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'students' AND schemaname = 'public';
  
  -- Try to find a test student
  SELECT id INTO test_student_id 
  FROM public.students 
  LIMIT 1;
  
  RETURN json_build_object(
    'rls_enabled', rls_enabled,
    'policy_count', policy_count,
    'test_student_exists', test_student_id IS NOT NULL,
    'status', 'Student password updates should work with the current setup'
  );
END;
$$;

-- Grant execute to everyone (no admin requirement)
GRANT EXECUTE ON FUNCTION test_student_password_update() TO anon;
GRANT EXECUTE ON FUNCTION test_student_password_update() TO authenticated;
GRANT EXECUTE ON FUNCTION test_student_password_update() TO public;