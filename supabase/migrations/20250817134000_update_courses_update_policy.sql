-- Allow admins to update courses, not just the course instructor

-- Drop the old update policy if it exists
DROP POLICY IF EXISTS "Courses update by instructor" ON public.courses;

-- Recreate update policy to allow either admin or the course instructor to update
CREATE POLICY "Courses update by instructor or admin"
  ON public.courses FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR auth.uid() = instructor_id
  )
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR auth.uid() = instructor_id
  );
