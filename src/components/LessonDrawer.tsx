import React, { useEffect, useState } from 'react';
import { Lesson, CourseModule } from '../types';
import {
  X,
  Check,
  CheckCircle2,
  PlayCircle,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  CheckSquare,
  Square
} from 'lucide-react';

interface LessonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  module: CourseModule | null;
  isCompleted: boolean;
  onToggleComplete: (lessonId: string) => void | Promise<void>;
  onNavigateLesson?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  courseTitle?: string;
}

export const LessonDrawer: React.FC<LessonDrawerProps> = ({
  isOpen,
  onClose,
  lesson,
  module,
  isCompleted,
  onToggleComplete,
  onNavigateLesson,
  hasPrev = false,
  hasNext = false,
  courseTitle,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lesson) return null;

  // Video embed helper
  const getEmbedVideoUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return `https://player.vimeo.com/video/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await onToggleComplete(lesson.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const videoEmbedUrl = lesson.videoUrl ? getEmbedVideoUrl(lesson.videoUrl) : null;
  const isEmbeddableVideo =
    videoEmbedUrl &&
    (videoEmbedUrl.includes('youtube.com') ||
      videoEmbedUrl.includes('youtube-nocookie.com') ||
      videoEmbedUrl.includes('player.vimeo.com'));

  return (
    <div id="lesson-side-drawer-root" className="fixed inset-0 z-50 overflow-hidden">
      {/* Semi-transparent Backdrop Overlay */}
      <div
        id="lesson-side-drawer-backdrop"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Right-aligned Side Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside
          id="lesson-side-drawer-panel"
          className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between transition-all duration-300 animate-in slide-in-from-right"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">

                {courseTitle && module?.title && (
                  <span className="text-slate-300 text-xs">•</span>
                )}
                {module?.title && (
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md truncate max-w-[260px]">
                    {module.title}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Completed</span>
                    </>
                  ) : (
                    <span>In Progress</span>
                  )}
                </span>
              </div>

              <h2
                id="lesson-drawer-title"
                className="text-lg font-medium text-slate-900 leading-snug tracking-tight"
              >
                {lesson.title}
              </h2>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-1 shrink-0 pt-0.5">
              <button
                id="btn-close-lesson-drawer"
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Close lesson drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Media Presentation (Video or Image) */}
            {lesson.mediaType === 'video' && lesson.videoUrl && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  <span>Video Lecture</span>
                </div>
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-sm relative flex items-center justify-center">
                  {isEmbeddableVideo ? (
                    <iframe
                      src={videoEmbedUrl!}
                      title={lesson.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      src={lesson.videoUrl}
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  )}
                </div>
              </div>
            )}

            {lesson.mediaType === 'image' && lesson.imageUrl && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Visual Demonstration / Diagram</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                  <img
                    src={lesson.imageUrl}
                    alt={lesson.title}
                    className="max-h-96 w-full object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Lesson Content / Instructional Body */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Lesson Material</span>
              </div>

              {lesson.description && lesson.description.trim() !== '' ? (
                <div
                  id="lesson-drawer-content"
                  className="text-sm text-slate-700 leading-relaxed space-y-4 font-normal [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:text-blue-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: lesson.description }}
                />
              ) : (
                <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                  <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2 opacity-70" />
                  No text material provided for this lesson yet. Follow along with the media above.
                </div>
              )}
            </div>

            {/* Status Feedback Notice */}
            <div
              className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                isCompleted
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50/60 border-blue-200 text-blue-900'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {isCompleted
                    ? 'Lesson Completed!'
                    : 'Track your curriculum completion'}
                </p>
                <p className="mt-0.5 opacity-80 leading-normal">
                  {isCompleted
                    ? 'Your completion is registered in your profile. Click the button below if you need to mark it as pending.'
                    : 'When you have reviewed the media and content, click "Mark as Complete" to advance your course progress.'}
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Sticky Footer with Mark as Complete and Next/Prev Navigation */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 space-y-3">
            {/* Primary Action Button: Mark as Complete */}
            <div>
              <button
                id="btn-drawer-mark-complete"
                type="button"
                disabled={isUpdating}
                onClick={handleToggle}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
                    : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                } disabled:opacity-50`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Completed (Click to Mark as Incomplete)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mark as Complete</span>
                  </>
                )}
              </button>
            </div>

            {/* Curriculum Navigation (Previous / Next Lesson) */}
            {onNavigateLesson && (hasPrev || hasNext) && (
              <div className="flex items-center justify-between pt-1 text-xs font-semibold text-slate-600">
                <button
                  id="btn-drawer-prev-lesson"
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => onNavigateLesson('prev')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Lesson</span>
                </button>

                <button
                  id="btn-drawer-next-lesson"
                  type="button"
                  disabled={!hasNext}
                  onClick={() => onNavigateLesson('next')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <span>Next Lesson</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
