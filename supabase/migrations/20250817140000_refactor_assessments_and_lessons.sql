-- 1. Add description to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Drop the existing foreign key constraint on assessments table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_lesson_id_fkey') THEN
    ALTER TABLE public.assessments DROP CONSTRAINT assessments_lesson_id_fkey;
  END IF;
END $$;

-- 3. Drop policies on assessments that reference lesson_id (must be before dropping column)
DROP POLICY IF EXISTS "Read assessments: published/enrolled or admin/instructor" ON public.assessments;
DROP POLICY IF EXISTS "Instructor write assessments" ON public.assessments;

-- 4. Add module_id to assessments table
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE;

-- 5. Drop the unique constraint on lesson_id if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_lesson_id_key') THEN
    ALTER TABLE public.assessments DROP CONSTRAINT assessments_lesson_id_key;
  END IF;
END $$;

-- 6. Drop the lesson_id column from assessments table
ALTER TABLE public.assessments
DROP COLUMN IF EXISTS lesson_id;

-- 7. Add a unique constraint on module_id to ensure one assessment per module
ALTER TABLE public.assessments
ADD CONSTRAINT assessments_module_id_key UNIQUE (module_id);

-- 8. Re-create policies for assessments using module_id instead of lesson_id
CREATE POLICY "Read assessments: published/enrolled or admin/instructor"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = assessments.module_id
        AND (
          c.is_published = TRUE OR
          EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = assessments.module_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructor write assessments"
  ON public.assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = assessments.module_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = assessments.module_id AND c.instructor_id = auth.uid()
    )
  );
