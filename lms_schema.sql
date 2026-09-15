

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  allow_student_registration BOOLEAN NOT NULL DEFAULT true,
  difficulty_level TEXT DEFAULT 'Intermediate',
  estimated_hours INTEGER DEFAULT 4,
  certificate_enabled BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations for existing courses table if created prior:
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS allow_student_registration BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'Intermediate';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 4;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true;

-- Indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access on courses" ON public.courses;
CREATE POLICY "Allow public access on courses"
  ON public.courses FOR ALL
  USING (true) WITH CHECK (true);


-- 2. MODULES TABLE
CREATE TABLE IF NOT EXISTS public.modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for modules
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(course_id, order_index ASC);

-- Enable RLS for modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access on modules" ON public.modules;
CREATE POLICY "Allow public access on modules"
  ON public.modules FOR ALL
  USING (true) WITH CHECK (true);


-- 3. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL DEFAULT 'none' CHECK (media_type IN ('image', 'video', 'none')),
  image_url TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lessons
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(module_id, order_index ASC);

-- Enable RLS for lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access on lessons" ON public.lessons;
CREATE POLICY "Allow public access on lessons"
  ON public.lessons FOR ALL
  USING (true) WITH CHECK (true);


-- ==============================================================================
-- 4. STORAGE BUCKET CONFIGURATION: 'lms_bucket'
-- Configures the public storage bucket for lesson and course images
-- ==============================================================================

-- Create public 'lms_bucket' in Supabase storage if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lms_bucket',
  'lms_bucket',
  true,
  52428800, -- 50 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Storage Policies for 'lms_bucket'
-- Allow public downloads/views of uploaded images
DROP POLICY IF EXISTS "Public Access for lms_bucket" ON storage.objects;
CREATE POLICY "Public Access for lms_bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lms_bucket');

-- Allow image uploads to 'lms_bucket'
DROP POLICY IF EXISTS "Allow Uploads to lms_bucket" ON storage.objects;
CREATE POLICY "Allow Uploads to lms_bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lms_bucket');

-- Allow updates to images in 'lms_bucket'
DROP POLICY IF EXISTS "Allow Updates to lms_bucket" ON storage.objects;
CREATE POLICY "Allow Updates to lms_bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lms_bucket');

-- Allow deletions from 'lms_bucket'
DROP POLICY IF EXISTS "Allow Deletions from lms_bucket" ON storage.objects;
CREATE POLICY "Allow Deletions from lms_bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lms_bucket');
