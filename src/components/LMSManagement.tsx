import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Layers,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  Clock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Database,
  Globe,
  Lock
} from 'lucide-react';
import { Course } from '../types';
import { lmsService, LMS_BUCKET_NAME } from '../services/lmsService';
import { SupabaseLmsSqlModal } from './SupabaseLmsSqlModal';

interface LMSManagementProps {
  onCreateCourse: () => void;
  onEditCourse: (course: Course) => void;
}

export const LMSManagement: React.FC<LMSManagementProps> = ({
  onCreateCourse,
  onEditCourse,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'cache'>('cache');
  const [showSqlModal, setShowSqlModal] = useState(false);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const res = await lmsService.fetchCourses();
      setCourses(res.courses);
      setDataSource(res.source);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses(lmsService.getLocalCourses());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDeleteCourse = async (course: Course) => {
    if (confirm(`Are you sure you want to delete "${course.title}"? This cannot be undone.`)) {
      await lmsService.deleteCourse(course.id);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    }
  };

  const handleTogglePublic = async (course: Course, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newPublicState = course.isPublic === false ? true : false;
    const updatedCourse: Course = {
      ...course,
      isPublic: newPublicState,
      updatedAt: new Date().toISOString(),
    };

    setCourses((prev) => prev.map((c) => (c.id === course.id ? updatedCourse : c)));

    try {
      await lmsService.saveCourse(updatedCourse);
    } catch (err: any) {
      console.error('Failed to toggle public course status:', err);
    }
  };

  // Filter courses based on search
  const filteredCourses = courses.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.modules.some((m) =>
        m.title.toLowerCase().includes(q) ||
        m.lessons.some((l) => l.title.toLowerCase().includes(q))
      )
    );
  });

  const totalModules = courses.reduce((acc, c) => acc + c.modules.length, 0);
  const totalLessons = courses.reduce(
    (acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5 flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>LMS Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Design and organize structured curriculum paths, modules, drag-and-drop lessons, and multimedia assets.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">




          {/* Primary CTA: Create Course as requested */}
          <button
            id="btn-create-course"
            type="button"
            onClick={onCreateCourse}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wider">
              Total Courses
            </span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{courses.length}</div>
          
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wider">
              Total Modules
            </span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalModules}</div>
          
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wider">
              Total Lessons
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalLessons}</div>
          
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-courses"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search courses by title, description, or module name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No courses found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchTerm
                ? 'No courses match your search query. Try clearing the filter.'
                : 'Get started by creating your first course with modules and draggable lessons.'}
            </p>
            <button
              type="button"
              onClick={onCreateCourse}
              className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Course</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const courseLessonsCount = course.modules.reduce(
              (acc, m) => acc + m.lessons.length,
              0
            );
            const imageLessonsCount = course.modules.reduce(
              (acc, m) => acc + m.lessons.filter((l) => l.mediaType === 'image').length,
              0
            );
            const videoLessonsCount = course.modules.reduce(
              (acc, m) => acc + m.lessons.filter((l) => l.mediaType === 'video').length,
              0
            );

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}

                  {/* Top Left: Public / Private pill & quick toggle */}
                  <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 z-10">
                    <button
                      type="button"
                      id={`btn-toggle-public-${course.id}`}
                      onClick={(e) => handleTogglePublic(course, e)}
                      title={
                        course.isPublic !== false
                          ? 'Public (Visible to users). Click to make Private (hidden).'
                          : 'Private (Hidden from users). Click to make Public (visible).'
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs flex items-center space-x-1 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        course.isPublic !== false
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {course.isPublic !== false ? (
                        <>
                          <Globe className="w-2.5 h-2.5" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5" />
                          <span>Private (Hidden)</span>
                        </>
                      )}
                    </button>
                    {(course.allowStudentRegistration ?? true) && (
                      <span className="bg-blue-600/85 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs hidden sm:inline-block">
                        Open Reg
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                    {imageLessonsCount > 0 && (
                      <span
                        className="bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1"
                        title={`${imageLessonsCount} lessons with image`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>{imageLessonsCount}</span>
                      </span>
                    )}
                    {videoLessonsCount > 0 && (
                      <span
                        className="bg-blue-600/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1"
                        title={`${videoLessonsCount} lessons with video`}
                      >
                        <Video className="w-3 h-3" />
                        <span>{videoLessonsCount}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}
                      </span>
                      <span>
                        {courseLessonsCount} {courseLessonsCount === 1 ? 'Lesson' : 'Lessons'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onEditCourse(course)}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-md flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Course</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCourse(course)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition-colors"
                    title="Delete course"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supabase Bucket & DB SQL Configuration Modal */}
      <SupabaseLmsSqlModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
      />
    </div>
  );
};
