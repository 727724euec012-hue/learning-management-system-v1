import React, { useState } from 'react';
import { X, Copy, Check, Database, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { LMS_BUCKET_NAME } from '../services/lmsService';

interface SupabaseLmsSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_LMS_SETUP_SQL = `-- ==============================================================================
-- 1. Create Public Storage Bucket for LMS ('lms_bucket')
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '${LMS_BUCKET_NAME}',
  '${LMS_BUCKET_NAME}',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Storage Security Policies for 'lms_bucket'
DROP POLICY IF EXISTS "Public Access for lms_bucket" ON storage.objects;
CREATE POLICY "Public Access for lms_bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = '${LMS_BUCKET_NAME}');

DROP POLICY IF EXISTS "Allow Uploads to lms_bucket" ON storage.objects;
CREATE POLICY "Allow Uploads to lms_bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = '${LMS_BUCKET_NAME}');

DROP POLICY IF EXISTS "Allow Updates to lms_bucket" ON storage.objects;
CREATE POLICY "Allow Updates to lms_bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = '${LMS_BUCKET_NAME}');

DROP POLICY IF EXISTS "Allow Deletions from lms_bucket" ON storage.objects;
CREATE POLICY "Allow Deletions from lms_bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = '${LMS_BUCKET_NAME}');

-- ==============================================================================
-- 2. Add LMS Course Settings Columns (is_public, allow_student_registration)
-- ==============================================================================
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS allow_student_registration BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'Intermediate';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 4;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT true;

-- ==============================================================================
-- 3. Create LMS Course Enrollments & Learning Progress Tables
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on course_enrollments" ON public.course_enrollments;
CREATE POLICY "Public access on course_enrollments"
  ON public.course_enrollments FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on enrollments" ON public.enrollments;
CREATE POLICY "Public access on enrollments"
  ON public.enrollments FOR ALL
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lesson_progress_user_lesson UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on lesson_progress" ON public.lesson_progress;
CREATE POLICY "Public access on lesson_progress"
  ON public.lesson_progress FOR ALL
  USING (true) WITH CHECK (true);
`;

export const SupabaseLmsSqlModal: React.FC<SupabaseLmsSqlModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_LMS_SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = SUPABASE_LMS_SETUP_SQL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Supabase Bucket & Database SQL Setup
              </h2>
              <p className="text-xs text-slate-500">
                Execute in your Supabase SQL Editor to enable <code className="text-blue-700 font-semibold">{LMS_BUCKET_NAME}</code> and course columns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center space-x-2 font-semibold text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Why run this script?</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              Supabase storage buckets require an entry in <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">storage.buckets</code> with Row-Level Security policies to permit public image uploads. Running this script also ensures <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">is_public</code> and <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">allow_student_registration</code> columns exist on your <code className="bg-blue-100/70 px-1 py-0.5 rounded font-mono text-[11px]">courses</code> table.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                SQL Migration & Storage Script
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Script</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <pre className="p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-64 leading-relaxed">
                {SUPABASE_LMS_SETUP_SQL}
              </pre>
            </div>
          </div>

          {/* Quick steps */}
          <div className="pt-2 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800">Quick 3-step setup:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-500 pl-1">
              <li>Open your Supabase Project Dashboard (<code className="text-slate-700">gzsngexoifultxopuxui</code>)</li>
              <li>Go to <strong>SQL Editor</strong> in the left sidebar</li>
              <li>Paste the copied script and click <strong>Run</strong></li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
