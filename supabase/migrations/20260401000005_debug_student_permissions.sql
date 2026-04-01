-- Debug function to check and fix student password update permissions
-- This function can be called by admins to diagnose and fix permission issues

CREATE OR REPLACE FUNCTION debug_student_permissions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  test_student_id UUID;
  test_result TEXT;
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
  
  -- Test if we can update (this will work because of SECURITY DEFINER)
  IF test_student_id IS NOT NULL THEN
    BEGIN
      UPDATE public.students 
      SET password = password  -- No-op update
      WHERE id = test_student_id;
      test_result := 'UPDATE test successful';
    EXCEPTION
      WHEN OTHERS THEN
        test_result := 'UPDATE test failed: ' || SQLERRM;
    END;
  ELSE
    test_result := 'No students found for testing';
  END IF;
  
  RETURN json_build_object(
    'rls_enabled', rls_enabled,
    'policy_count', policy_count,
    'test_student_exists', test_student_id IS NOT NULL,
    'update_test', test_result,
    'recommendations', CASE 
      WHEN NOT rls_enabled THEN 'RLS is disabled - this should allow updates'
      WHEN policy_count = 0 THEN 'No policies found - need to create update policy'
      ELSE 'RLS enabled with ' || policy_count || ' policies'
    END
  );
END;
$$;

-- Grant execute to authenticated users (admins)
GRANT EXECUTE ON FUNCTION debug_student_permissions() TO authenticated;

-- Also create a simple function to force-enable student password updates
CREATE OR REPLACE FUNCTION enable_student_password_updates()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing conflicting policies
  DROP POLICY IF EXISTS "Anonymous can update student passwords" ON public.students;
  DROP POLICY IF EXISTS "Authenticated can update student passwords" ON public.students;
  
  -- Create a simple, permissive policy for password updates
  CREATE POLICY "Allow password updates"
    ON public.students FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Student password update policy created'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION enable_student_password_updates() TO authenticated;