import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, CourseEnrollment, CourseModule, Lesson } from '../types';
import { lmsService } from '../services/lmsService';
import { LessonDrawer } from './LessonDrawer';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  ArrowLeft,
  PlayCircle,
  FileText,
  Image as ImageIcon,
  Lock,
  ChevronRight,
  ChevronDown,
  Check,
  Database,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface UserCoursesViewProps {
  currentUser: User;
  onBackToDashboard?: () => void;
}

export const UserCoursesView: React.FC<UserCoursesViewProps> = ({
  currentUser,
  onBackToDashboard,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'enrolled' | 'completed'>('all');
  
  // Selected course for dedicated view page (null = show course catalog)
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  // Expanded module IDs for accordion
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

  // Selected lesson for side drawer inspection
  const [selectedLessonData, setSelectedLessonData] = useState<{
    lesson: Lesson;
    module: CourseModule;
  } | null>(null);
  const [isLessonDrawerOpen, setIsLessonDrawerOpen] = useState(false);

  // Notification / Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load courses and user enrollments
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch courses
      const { courses: fetchedCourses } = await lmsService.fetchCourses();
      // Filter public courses or all available courses
      setCourses(fetchedCourses);

      // 2. Fetch user enrollments
      const { enrollments: fetchedEnrollments } = await lmsService.fetchUserEnrollments(currentUser.id);
      setEnrollments(fetchedEnrollments);
    } catch (err: any) {
      console.error('Failed to load courses or enrollments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  // Helper to find enrollment for a course
  const getEnrollment = (courseId: string): CourseEnrollment | undefined => {
    return enrollments.find((e) => e.courseId === courseId);
  };

  // Handle Enrollment Action
  const handleEnroll = async (course: Course, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Check super admin permission toggle
    if (course.allowStudentRegistration === false) {
      showToast('Registration for this course is closed by the administrator.', 'error');
      return;
    }

    setEnrollingCourseId(course.id);
    try {
      const result = await lmsService.enrollUser(currentUser.id, currentUser.email, course);
      if (result.success && result.enrollment) {
        // Update local enrollments list
        setEnrollments((prev) => {
          const filtered = prev.filter((item) => item.courseId !== course.id);
          return [...filtered, result.enrollment!];
        });
        showToast(`Successfully enrolled in "${course.title}"! Your progress will be saved to the database.`, 'success');
      } else {
        showToast(result.error || 'Failed to enroll.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing enrollment.', 'error');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Handle marking lesson as complete / incomplete
  const handleToggleLessonComplete = async (course: Course, lessonId: string) => {
    try {
      const res = await lmsService.toggleLessonCompletion(
        currentUser.id,
        currentUser.email,
        course,
        lessonId
      );

      if (res.success && res.enrollment) {
        setEnrollments((prev) => {
          const filtered = prev.filter((item) => item.courseId !== course.id);
          return [...filtered, res.enrollment!];
        });

        const statusMsg = res.isCompleted
          ? 'Lesson marked as completed! Progress saved to database.'
          : 'Lesson marked as incomplete.';
        showToast(statusMsg, 'info');
      }
    } catch (err: any) {
      showToast('Failed to update lesson progress.', 'error');
    }
  };

  // Open side drawer when enrolled user selects a lesson
  const handleSelectLesson = (lesson: Lesson, module: CourseModule) => {
    if (!viewingCourse) return;
    const userEnrollment = getEnrollment(viewingCourse.id);
    if (!userEnrollment) {
      showToast('Please enroll in this course first to view lesson content and track completion.', 'info');
      return;
    }
    setSelectedLessonData({ lesson, module });
    setIsLessonDrawerOpen(true);
  };

  // Flatten all course lessons for previous / next drawer navigation
  const allCourseLessons = useMemo(() => {
    if (!viewingCourse?.modules) return [];
    const list: { lesson: Lesson; module: CourseModule }[] = [];
    viewingCourse.modules.forEach((mod) => {
      (mod.lessons || []).forEach((les) => {
        list.push({ lesson: les, module: mod });
      });
    });
    return list;
  }, [viewingCourse]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLessonData) return -1;
    return allCourseLessons.findIndex(
      (item) => item.lesson.id === selectedLessonData.lesson.id
    );
  }, [allCourseLessons, selectedLessonData]);

  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allCourseLessons.length - 1;

  const handleNavigateLesson = (direction: 'prev' | 'next') => {
    if (currentLessonIndex < 0) return;
    const targetIdx = direction === 'prev' ? currentLessonIndex - 1 : currentLessonIndex + 1;
    if (targetIdx >= 0 && targetIdx < allCourseLessons.length) {
      setSelectedLessonData(allCourseLessons[targetIdx]);
    }
  };

  // Public courses count
  const publicCoursesCount = courses.filter((c) => c.isPublic !== false).length;

  // Filter courses:
  // - In 'all' tab, strictly display only public courses (isPublic !== false).
  // - Private courses are hidden from the user catalog.
  const filteredCourses = courses.filter((course) => {
    const isPublic = course.isPublic !== false;
    const userEnrollment = getEnrollment(course.id);

    // Private courses must not be visible in public catalog
    if (!isPublic && activeTab === 'all') {
      return false;
    }

    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'enrolled') {
      return matchesSearch && !!userEnrollment;
    }
    if (activeTab === 'completed') {
      return matchesSearch && userEnrollment?.status === 'completed';
    }
    return matchesSearch;
  });

  // Calculate total lessons in course
  const getTotalLessons = (course: Course): number => {
    return course.modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);
  };

  // Open course in full page view with first module expanded by default
  const handleOpenCourse = (course: Course) => {
    if (course.isPublic === false && !getEnrollment(course.id)) {
      showToast('This course is private and not currently open for viewing.', 'error');
      return;
    }
    setViewingCourse(course);
    if (course.modules && course.modules.length > 0) {
      setExpandedModuleIds([course.modules[0].id || 'mod-0']);
    } else {
      setExpandedModuleIds([]);
    }
  };

  // Toggle module accordion expansion
  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Expand all modules in course
  const handleExpandAll = (course: Course) => {
    const allIds = course.modules.map((m, idx) => m.id || `mod-${idx}`);
    setExpandedModuleIds(allIds);
  };

  // Collapse all modules in course
  const handleCollapseAll = () => {
    setExpandedModuleIds([]);
  };

  // SQL Migration Script for Enrollments
  const SQL_SCRIPT = `-- LMS Enrollments & Learning Progress Migration Script
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

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on course_enrollments" ON public.course_enrollments;
CREATE POLICY "Public access on course_enrollments"
  ON public.course_enrollments FOR ALL
  USING (true) WITH CHECK (true);`;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="course-toast-notification"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold flex items-center space-x-2 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {viewingCourse ? (
        /* ========================================================================= */
        /* DEDICATED FULL-PAGE COURSE DETAIL VIEW WITH BACK OPTION */
        /* ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Bar with Back option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
            <button
              id="btn-back-to-courses"
              type="button"
              onClick={() => setViewingCourse(null)}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3.5 py-2 rounded-lg transition-all self-start sm:self-auto cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Courses</span>
            </button>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setViewingCourse(null)}
                className="hover:text-blue-600 font-medium cursor-pointer"
              >
                All Courses
              </button>
              <span>/</span>
              <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-xs">
                {viewingCourse.title}
              </span>
            </div>
          </div>

          {/* Course Overview Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {viewingCourse.thumbnailUrl ? (
                <div className="md:w-72 h-44 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <img
                    src={viewingCourse.thumbnailUrl}
                    alt={viewingCourse.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="md:w-72 h-44 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
                  <GraduationCap className="w-12 h-12 text-blue-400/60" />
                </div>
              )}

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded">
                    {viewingCourse.difficultyLevel || 'Intermediate'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    Instructor: <strong className="text-slate-800">{viewingCourse.createdBy || 'Administrator'}</strong>
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <div className="flex items-center space-x-1 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewingCourse.estimatedHours || 4} Hours</span>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  {viewingCourse.title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {viewingCourse.description || 'No description provided for this course.'}
                </p>

                {/* Enrollment & Action Section */}
                {(() => {
                  const courseEnrollment = getEnrollment(viewingCourse.id);
                  const totalCourseLessons = getTotalLessons(viewingCourse);
                  const completedCount = courseEnrollment?.completedLessons?.length || 0;
                  const progress = courseEnrollment?.progressPercentage || 0;
                  const isCompleted = courseEnrollment?.status === 'completed';

                  return (
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      {courseEnrollment ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-semibold text-xs ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isCompleted ? 'Course Completed' : 'Enrolled'}</span>
                              </span>
                              <span className="text-slate-500 font-medium">
                                {completedCount} of {totalCourseLessons} lessons completed
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{progress}%</span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {viewingCourse.allowStudentRegistration !== false ? (
                            <button
                              id="btn-page-enroll"
                              type="button"
                              disabled={enrollingCourseId === viewingCourse.id}
                              onClick={() => handleEnroll(viewingCourse)}
                              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <GraduationCap className="w-4 h-4" />
                              <span>
                                {enrollingCourseId === viewingCourse.id ? 'Enrolling...' : 'Enroll in this Course'}
                              </span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center space-x-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Registration is closed for this course by the administrator</span>
                            </div>
                          )}

                          <div className="text-xs text-slate-500 flex items-center space-x-3">
                            <span className="font-medium">{viewingCourse.modules?.length || 0} Modules</span>
                            <span>•</span>
                            <span className="font-medium">{totalCourseLessons} Lessons</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Modules Accordion Section (upon open shows the lessons; content is not shown) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Curriculum Modules & Lessons</span>
                </h2>

              </div>

              {/* Accordion Controls */}
              {viewingCourse.modules && viewingCourse.modules.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    id="btn-expand-all-modules"
                    type="button"
                    onClick={() => handleExpandAll(viewingCourse)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <button
                    id="btn-collapse-all-modules"
                    type="button"
                    onClick={handleCollapseAll}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Accordion List */}
            {viewingCourse.modules && viewingCourse.modules.length > 0 ? (
              <div className="space-y-3">
                {viewingCourse.modules.map((module, modIdx) => {
                  const moduleId = module.id || `mod-${modIdx}`;
                  const isExpanded = expandedModuleIds.includes(moduleId);
                  const userEnrollment = getEnrollment(viewingCourse.id);
                  const totalInModule = module.lessons?.length || 0;
                  const completedInModule =
                    module.lessons?.filter((l) =>
                      userEnrollment?.completedLessons?.includes(l.id)
                    ).length || 0;
                  const isModuleAllCompleted = totalInModule > 0 && completedInModule === totalInModule;

                  return (
                    <div
                      key={moduleId}
                      className="border border-slate-200 rounded-lg overflow-hidden transition-all bg-white shadow-2xs"
                    >
                      {/* Accordion Header Button */}
                      <button
                        id={`accordion-toggle-${moduleId}`}
                        type="button"
                        onClick={() => toggleModuleAccordion(moduleId)}
                        className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-50 border-b border-slate-200'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                              isModuleAllCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isModuleAllCompleted ? '✓' : modIdx + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                                {module.title}
                              </h3>
                              <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-full shrink-0">
                                {totalInModule} {totalInModule === 1 ? 'Lesson' : 'Lessons'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          {userEnrollment && totalInModule > 0 && (
                            <span
                              className={`text-xs font-semibold ${
                                isModuleAllCompleted ? 'text-emerald-700' : 'text-slate-600'
                              }`}
                            >
                              {completedInModule}/{totalInModule} completed
                            </span>
                          )}

                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Accordion Body: Lessons List (upon open it shows the lessons) */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {module.lessons && module.lessons.length > 0 ? (
                            module.lessons.map((lesson, lesIdx) => {
                              const isLessonCompleted =
                                userEnrollment?.completedLessons?.includes(lesson.id);

                              return (
                                <div
                                  key={lesson.id || lesIdx}
                                  id={`lesson-item-${lesson.id}`}
                                  onClick={() => handleSelectLesson(lesson, module)}
                                  className={`px-4 py-3.5 flex items-center justify-between transition-all group ${
                                    userEnrollment
                                      ? 'cursor-pointer hover:bg-blue-50/70'
                                      : 'hover:bg-slate-50 opacity-90'
                                  } ${isLessonCompleted ? 'bg-slate-50/40' : 'bg-white'}`}
                                >
                                  <div className="flex items-center space-x-3 min-w-0 pr-3">
                                    {/* Completion toggle (if enrolled) or index badge */}
                                    {userEnrollment ? (
                                      <button
                                        id={`btn-toggle-complete-${lesson.id}`}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleLessonComplete(viewingCourse, lesson.id);
                                        }}
                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                          isLessonCompleted
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-slate-300 hover:border-blue-500 text-transparent'
                                        }`}
                                        title={
                                          isLessonCompleted
                                            ? 'Mark as incomplete'
                                            : 'Mark as completed'
                                        }
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="w-5 h-5 rounded border border-slate-200 text-slate-400 text-[10px] flex items-center justify-center font-medium shrink-0">
                                        {lesIdx + 1}
                                      </span>
                                    )}

                                    {/* Media Type Icon */}
                                    <div className="shrink-0">
                                      {lesson.mediaType === 'video' ? (
                                        <PlayCircle className="w-4 h-4 text-blue-500" />
                                      ) : lesson.mediaType === 'image' ? (
                                        <ImageIcon className="w-4 h-4 text-amber-500" />
                                      ) : (
                                        <FileText className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>

                                    {/* Lesson Title */}
                                    <span
                                      className={`text-xs sm:text-sm truncate transition-colors ${
                                        isLessonCompleted
                                          ? 'text-slate-500 line-through'
                                          : 'text-slate-800 font-medium group-hover:text-blue-700'
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                  </div>

                                  {/* Lesson Tags / Media Badge / Drawer Action Hint */}
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      {lesson.mediaType}
                                    </span>
                                    {userEnrollment && (
                                      <span
                                        className={`text-[11px] font-medium hidden sm:inline-block ${
                                          isLessonCompleted ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                                        }`}
                                      >
                                        {isLessonCompleted ? 'Completed' : 'Pending'}
                                      </span>
                                    )}
                                    {userEnrollment ? (
                                      <div className="flex items-center space-x-1 text-slate-400 group-hover:text-blue-600 pl-1 transition-colors">
                                        <span className="text-[11px] font-medium hidden md:inline-block">Open</span>
                                        <ChevronRight className="w-4 h-4" />
                                      </div>
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-xs text-slate-400 italic text-center">
                              No lessons added to this module yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                No curriculum modules available for this course yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* COURSES CATALOG LIST VIEW */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Library</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Browse and enroll in official courses published. Complete modules, track your lesson milestones.
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md text-xs">
          <button
            id="tab-all-courses"
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Courses ({publicCoursesCount})
          </button>
          <button
            id="tab-enrolled-courses"
            type="button"
            onClick={() => setActiveTab('enrolled')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'enrolled'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Enrolled ({enrollments.length})
          </button>
          <button
            id="tab-completed-courses"
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({enrollments.filter((e) => e.status === 'completed').length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-courses"
            type="text"
            placeholder="Search courses or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Courses Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-72 space-y-4">
              <div className="h-32 bg-slate-200 rounded-lg w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="h-8 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No courses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No courses matching "${searchTerm}". Try a different search query.`
              : activeTab === 'enrolled'
              ? "You haven't enrolled in any courses yet. Browse all courses and click 'Enroll Now'."
              : 'There are currently no courses published by the administrator.'}
          </p>
          {activeTab !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              View All Courses
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = getEnrollment(course.id);
            const isEnrolled = !!enrollment;
            const progress = enrollment?.progressPercentage || 0;
            const isCompleted = enrollment?.status === 'completed';
            const totalLessons = getTotalLessons(course);
            const completedCount = enrollment?.completedLessons?.length || 0;
            const canRegister = course.allowStudentRegistration !== false;

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                {/* Thumbnail / Header */}
                <div>
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
                        <GraduationCap className="w-12 h-12 text-blue-400/60" />
                      </div>
                    )}

                    {/* Top status chips */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs rounded">
                        {course.difficultyLevel || 'Intermediate'}
                      </span>
                      {course.estimatedHours && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-900/80 text-slate-200 backdrop-blur-xs rounded flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{course.estimatedHours}h</span>
                        </span>
                      )}
                    </div>

                    {/* Enrollment Status Indicator */}
                    <div className="absolute top-3 right-3">
                      {isCompleted ? (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-md shadow-xs flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : isEnrolled ? (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded-md shadow-xs flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Enrolled</span>
                        </span>
                      ) : !canRegister ? (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-amber-300 rounded-md shadow-xs flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Registration Closed</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {course.description || 'No description provided.'}
                    </p>

                    {/* Meta stats */}
                    <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.modules?.length || 0} Modules</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{totalLessons} Lessons</span>
                      </div>
                    </div>

                    {/* Progress Bar (if enrolled) */}
                    {isEnrolled && (
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span className="font-semibold">Course Progress</span>
                          <span className="font-bold text-slate-900">
                            {completedCount}/{totalLessons} lessons ({progress}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons: View Course & Enroll */}
                <div className="p-5 pt-0 border-t border-slate-100 flex items-center space-x-2.5">
                  <button
                    id={`btn-view-course-${course.id}`}
                    type="button"
                    onClick={() => handleOpenCourse(course)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Course</span>
                  </button>

                  {/* Enroll / Continue Action */}
                  {isEnrolled ? (
                    <button
                      id={`btn-continue-course-${course.id}`}
                      type="button"
                      onClick={() => handleOpenCourse(course)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                    >
                      <span>{isCompleted ? 'Review' : 'Continue'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : canRegister ? (
                    <button
                      id={`btn-enroll-course-${course.id}`}
                      type="button"
                      disabled={enrollingCourseId === course.id}
                      onClick={(e) => handleEnroll(course, e)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{enrollingCourseId === course.id ? 'Enrolling...' : 'Enroll'}</span>
                    </button>
                  ) : (
                    <button
                      id={`btn-closed-course-${course.id}`}
                      type="button"
                      disabled
                      className="flex-1 px-3 py-2 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg flex items-center justify-center space-x-1.5 cursor-not-allowed"
                      title="Self-registration closed by Super Admin"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Closed</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DATABASE SCHEMA & MIGRATION MODAL */}
      {/* ========================================================================= */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Supabase LMS Enrollments SQL Schema</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Copy and run this SQL script in your{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold underline inline-flex items-center space-x-1"
                >
                  <span>Supabase SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                to ensure the <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">course_enrollments</code> table and RLS policies are deployed. The migration file is also saved at <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">/supabase_lms_enrollments.sql</code>.
              </p>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60">
                  {SQL_SCRIPT}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_SCRIPT);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs flex items-center space-x-1"
                >
                  {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LESSON CONTENT SIDE DRAWER */}
      {/* ========================================================================= */}
      <LessonDrawer
        isOpen={isLessonDrawerOpen}
        onClose={() => setIsLessonDrawerOpen(false)}
        lesson={selectedLessonData?.lesson || null}
        module={selectedLessonData?.module || null}
        courseTitle={viewingCourse?.title}
        isCompleted={
          Boolean(
            viewingCourse &&
              selectedLessonData &&
              getEnrollment(viewingCourse.id)?.completedLessons?.includes(
                selectedLessonData.lesson.id
              )
          )
        }
        onToggleComplete={async (lessonId) => {
          if (viewingCourse) {
            await handleToggleLessonComplete(viewingCourse, lessonId);
          }
        }}
        onNavigateLesson={handleNavigateLesson}
        hasPrev={hasPrevLesson}
        hasNext={hasNextLesson}
      />
    </div>
  );
};
