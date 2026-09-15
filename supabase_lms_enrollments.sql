-- ==============================================================================
-- LMS Course Enrollments & Learning Progress Schema
-- Compatible with PostgreSQL & Supabase
-- Target Tables: public.course_enrollments, public.enrollments, public.lesson_progress
-- ==============================================================================

-- 1. COURSE ENROLLMENTS TABLE
-- Tracks which users are registered for which courses, current status and overall progress
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_title TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_course_enrollments_user_course UNIQUE(user_id, course_id)
);

-- Also support 'public.enrollments' table for compatibility
CREATE TABLE IF NOT EXISTS public.enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_title TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_enrollments_user_course UNIQUE(user_id, course_id)
);

-- Performance Indexes for enrollment queries
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course ON public.course_enrollments(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Allow access for public/authenticated users
DROP POLICY IF EXISTS "Public access on course_enrollments" ON public.course_enrollments;
CREATE POLICY "Public access on course_enrollments"
  ON public.course_enrollments FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on enrollments" ON public.enrollments;
CREATE POLICY "Public access on enrollments"
  ON public.enrollments FOR ALL
  USING (true) WITH CHECK (true);


-- 2. LESSON PROGRESS TABLE (Granular per-lesson tracking)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lesson_progress_user_lesson UNIQUE(user_id, lesson_id)
);

-- Performance Indexes for lesson progress
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON public.lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on lesson_progress" ON public.lesson_progress;
CREATE POLICY "Public access on lesson_progress"
  ON public.lesson_progress FOR ALL
  USING (true) WITH CHECK (true);
