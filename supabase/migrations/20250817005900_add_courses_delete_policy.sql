-- Add RLS policy to allow admins or course instructors to delete courses
-- This fixes failures when deleting courses from the Admin panel

BEGIN;

-- Ensure RLS is enabled (should already be enabled in initial schema)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create a delete policy for courses
CREATE POLICY IF NOT EXISTS "Courses delete by admin or instructor"
  ON public.courses FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR auth.uid() = instructor_id
  );

COMMIT;
