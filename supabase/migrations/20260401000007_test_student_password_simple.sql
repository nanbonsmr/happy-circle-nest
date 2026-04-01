-- Simple test to verify student password updates work without admin permissions
-- This can be run by anyone to test the functionality

-- Create a test function that students can call to verify their password update capability
CREATE OR REPLACE FUNCTION test_my_password_update(test_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_password TEXT;
  test_password TEXT := 'test1234';
  update_result JSON;
BEGIN
  -- This function tests if a student can update their password
  -- NO ADMIN CHECKS - purely student functionality
  
  IF test_student_id IS NULL THEN
    RETURN json_build_object('error', 'Student ID required for test');
  END IF;
  
  -- Get original password
  SELECT password INTO original_password 
  FROM public.students 
  WHERE id = test_student_id;
  
  IF original_password IS NULL THEN
    RETURN json_build_object('error', 'Student not found');
  END IF;
  
  -- Test the password update function
  SELECT update_student_password(test_student_id, test_password) INTO update_result;
  
  -- Restore original password
  UPDATE public.students 
  SET password = original_password 
  WHERE id = test_student_id;
  
  RETURN json_build_object(
    'test_completed', true,
    'update_function_result', update_result,
    'original_password_restored', true,
    'conclusion', CASE 
      WHEN (update_result->>'success')::boolean THEN 'Student password updates are working correctly'
      ELSE 'Student password updates are not working: ' || (update_result->>'error')
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Try to restore original password even if test failed
    BEGIN
      UPDATE public.students 
      SET password = original_password 
      WHERE id = test_student_id;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    
    RETURN json_build_object(
      'error', 'Test failed: ' || SQLERRM,
      'original_password_restored', 'attempted'
    );
END;
$$;

-- Grant execute to everyone - no admin permissions needed
GRANT EXECUTE ON FUNCTION test_my_password_update(UUID) TO anon;
GRANT EXECUTE ON FUNCTION test_my_password_update(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_my_password_update(UUID) TO public;