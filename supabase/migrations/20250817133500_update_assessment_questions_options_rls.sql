-- Update RLS to allow enrolled students to read assessment questions and options (module-based)

-- Drop old policies that referenced lesson_id or only allowed admin/instructor reads
DROP POLICY IF EXISTS "Read questions by admin or instructor" ON public.assessment_questions;
DROP POLICY IF EXISTS "Read options by admin or instructor" ON public.assessment_options;

-- Read questions: enrolled student OR admin OR instructor of the course
CREATE POLICY "Read questions: enrolled/published or admin/instructor"
  ON public.assessment_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN course_modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assessment_questions.assessment_id
        AND (
          c.is_published = TRUE OR
          EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM assessments a
      JOIN course_modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assessment_questions.assessment_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Read options: enrolled student OR admin OR instructor of the course
CREATE POLICY "Read options: enrolled/published or admin/instructor"
  ON public.assessment_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN course_modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE q.id = assessment_options.question_id
        AND (
          c.is_published = TRUE OR
          EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM assessment_questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN course_modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE q.id = assessment_options.question_id
        AND c.instructor_id = auth.uid()
    )
  );
