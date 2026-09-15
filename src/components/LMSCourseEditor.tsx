import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Video,
  Upload,
  Save,
  CheckCircle2,
  MoveUp,
  MoveDown,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  Loader2,
  Settings,
  Globe,
  Lock,
  UserCheck,
  UserX,
  Clock,
  BarChart,
  BookOpen,
  ArrowRight,
  Database
} from 'lucide-react';
import { Course, CourseModule, Lesson, LessonMediaType } from '../types';
import { lmsService, LMS_BUCKET_NAME } from '../services/lmsService';
import { RichTextEditor } from './RichTextEditor';
import { SupabaseLmsSqlModal } from './SupabaseLmsSqlModal';

interface LMSCourseEditorProps {
  initialCourse?: Course | null;
  currentUserEmail?: string;
  onBack: () => void;
  onSaveSuccess: (savedCourse: Course) => void;
}

type EditorTab = 'details' | 'content' | 'settings';

export const LMSCourseEditor: React.FC<LMSCourseEditorProps> = ({
  initialCourse,
  currentUserEmail = 'admin@enterprise.local',
  onBack,
  onSaveSuccess,
}) => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<EditorTab>('details');

  // Course Master State
  const [courseId] = useState<string>(initialCourse?.id || `course-${Date.now()}`);
  const [title, setTitle] = useState<string>(initialCourse?.title || '');
  const [description, setDescription] = useState<string>(initialCourse?.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(
    initialCourse?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'
  );

  // Settings states requested: Public View, Can Students Register, etc.
  const [isPublic, setIsPublic] = useState<boolean>(initialCourse?.isPublic ?? true);
  const [allowStudentRegistration, setAllowStudentRegistration] = useState<boolean>(
    initialCourse?.allowStudentRegistration ?? true
  );
  const [difficultyLevel, setDifficultyLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    initialCourse?.difficultyLevel || 'Intermediate'
  );
  const [estimatedHours, setEstimatedHours] = useState<number>(initialCourse?.estimatedHours || 4);

  // Modules & Lessons hierarchy
  const [modules, setModules] = useState<CourseModule[]>(() => {
    if (initialCourse?.modules && initialCourse.modules.length > 0) {
      return initialCourse.modules;
    }
    // Default initial template with 1 module and 1 lesson
    const firstModId = `mod-${Date.now()}`;
    return [
      {
        id: firstModId,
        courseId,
        title: 'Module 1: Foundations & Core Concepts',
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            moduleId: firstModId,
            courseId,
            title: 'Lesson 1.1: Executive Overview & Learning Objectives',
            description: '<p>Welcome to this foundational course. Review the key operational competencies, risk controls, and security hygiene standards outlined in this module.</p>',
            mediaType: 'none',
            orderIndex: 0,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ];
  });

  // UI interaction states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  // Drag and Drop State for Lessons
  const [draggedLesson, setDraggedLesson] = useState<{
    lessonId: string;
    sourceModuleId: string;
    sourceIndex: number;
  } | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);

  // --- Module Handlers ---
  const handleAddModule = () => {
    const newModId = `mod-${Date.now()}`;
    const nextIndex = modules.length;
    const newModule: CourseModule = {
      id: newModId,
      courseId,
      title: `Module ${nextIndex + 1}: Advanced Topics`,
      orderIndex: nextIndex,
      createdAt: new Date().toISOString(),
      lessons: [
        {
          id: `les-${Date.now()}`,
          moduleId: newModId,
          courseId,
          title: `Lesson ${nextIndex + 1}.1: Deep Dive`,
          description: '<p>Detail the instructional material and technical procedures for this topic.</p>',
          mediaType: 'none',
          orderIndex: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setModules([...modules, newModule]);
  };

  const handleUpdateModuleTitle = (moduleId: string, newTitle: string) => {
    setModules(modules.map((m) => (m.id === moduleId ? { ...m, title: newTitle } : m)));
  };

  const handleDeleteModule = (moduleId: string) => {
    if (modules.length <= 1) {
      alert('A course must have at least one module.');
      return;
    }
    if (confirm('Are you sure you want to delete this module and all its lessons?')) {
      setModules(modules.filter((m) => m.id !== moduleId));
    }
  };

  // --- Lesson Handlers ---
  const handleAddLesson = (moduleId: string) => {
    setModules(
      modules.map((mod) => {
        if (mod.id !== moduleId) return mod;
        const nextIndex = mod.lessons.length;
        const newLesson: Lesson = {
          id: `les-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          moduleId,
          courseId,
          title: `Lesson ${nextIndex + 1}: Core Technique`,
          description: '<p>Enter lesson description, key takeaways, and procedural instructions here.</p>',
          mediaType: 'none',
          orderIndex: nextIndex,
          createdAt: new Date().toISOString(),
        };
        return {
          ...mod,
          lessons: [...mod.lessons, newLesson],
        };
      })
    );
  };

  const handleUpdateLesson = (
    moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>
  ) => {
    setModules(
      modules.map((mod) => {
        if (mod.id !== moduleId) return mod;
        return {
          ...mod,
          lessons: mod.lessons.map((les) =>
            les.id === lessonId ? { ...les, ...updates } : les
          ),
        };
      })
    );
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    setModules(
      modules.map((mod) => {
        if (mod.id !== moduleId) return mod;
        if (mod.lessons.length <= 1) {
          alert('Each module must have at least one lesson.');
          return mod;
        }
        const filtered = mod.lessons.filter((l) => l.id !== lessonId);
        return {
          ...mod,
          lessons: filtered.map((l, idx) => ({ ...l, orderIndex: idx })),
        };
      })
    );
  };

  // Move Lesson Up / Down
  const handleMoveLesson = (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    setModules(
      modules.map((mod) => {
        if (mod.id !== moduleId) return mod;
        const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
        if (targetIndex < 0 || targetIndex >= mod.lessons.length) return mod;

        const newLessons = [...mod.lessons];
        const [movedItem] = newLessons.splice(lessonIndex, 1);
        newLessons.splice(targetIndex, 0, movedItem);

        return {
          ...mod,
          lessons: newLessons.map((l, idx) => ({ ...l, orderIndex: idx })),
        };
      })
    );
  };

  // Drag and Drop event handlers
  const handleDragStart = (
    e: React.DragEvent,
    moduleId: string,
    lessonId: string,
    index: number
  ) => {
    e.dataTransfer.setData('text/plain', lessonId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLesson({
      lessonId,
      sourceModuleId: moduleId,
      sourceIndex: index,
    });
  };

  const handleDragOver = (e: React.DragEvent, targetLessonId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverLessonId !== targetLessonId) {
      setDragOverLessonId(targetLessonId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetModuleId: string, targetLessonId: string) => {
    e.preventDefault();
    setDragOverLessonId(null);

    if (!draggedLesson) return;
    if (draggedLesson.lessonId === targetLessonId) {
      setDraggedLesson(null);
      return;
    }

    setModules((prevModules) => {
      const sourceMod = prevModules.find((m) => m.id === draggedLesson.sourceModuleId);
      const targetMod = prevModules.find((m) => m.id === targetModuleId);
      if (!sourceMod || !targetMod) return prevModules;

      const movingLesson = sourceMod.lessons.find((l) => l.id === draggedLesson.lessonId);
      if (!movingLesson) return prevModules;

      return prevModules.map((m) => {
        if (m.id === sourceMod.id && m.id === targetMod.id) {
          // Reorder within same module
          const lessonsClone = [...m.lessons];
          const fromIdx = lessonsClone.findIndex((l) => l.id === draggedLesson.lessonId);
          const toIdx = lessonsClone.findIndex((l) => l.id === targetLessonId);
          if (fromIdx === -1 || toIdx === -1) return m;

          const [removed] = lessonsClone.splice(fromIdx, 1);
          lessonsClone.splice(toIdx, 0, removed);
          return {
            ...m,
            lessons: lessonsClone.map((l, i) => ({ ...l, orderIndex: i })),
          };
        } else if (m.id === sourceMod.id) {
          // Remove from source module
          return {
            ...m,
            lessons: m.lessons
              .filter((l) => l.id !== draggedLesson.lessonId)
              .map((l, i) => ({ ...l, orderIndex: i })),
          };
        } else if (m.id === targetMod.id) {
          // Add to target module
          const targetIdx = m.lessons.findIndex((l) => l.id === targetLessonId);
          const targetLessonsClone = [...m.lessons];
          const updatedLesson = {
            ...movingLesson,
            moduleId: targetMod.id,
          };
          if (targetIdx !== -1) {
            targetLessonsClone.splice(targetIdx, 0, updatedLesson);
          } else {
            targetLessonsClone.push(updatedLesson);
          }
          return {
            ...m,
            lessons: targetLessonsClone.map((l, i) => ({ ...l, orderIndex: i })),
          };
        }
        return m;
      });
    });

    setDraggedLesson(null);
  };

  const handleDragEnd = () => {
    setDraggedLesson(null);
    setDragOverLessonId(null);
  };

  // Image Upload to Supabase public bucket 'lms_bucket'
  const handleImageFileChange = async (
    moduleId: string,
    lessonId: string,
    file: File | null
  ) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    setUploadingLessonId(lessonId);
    try {
      const result = await lmsService.uploadLessonImage(file);
      handleUpdateLesson(moduleId, lessonId, {
        mediaType: 'image',
        imageUrl: result.url,
      });
      if (result.bucketSaved === false) {
        setStorageNotice(result.error || 'Image stored in local cache. Bucket "lms_bucket" needs initialization in Supabase.');
      } else {
        setStorageNotice(null);
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingLessonId(null);
    }
  };

  // Course Cover Upload to 'lms_bucket'
  const handleCourseCoverUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const result = await lmsService.uploadLessonImage(file);
      setThumbnailUrl(result.url);
      if (result.bucketSaved === false) {
        setStorageNotice(result.error || 'Image stored in local cache. Bucket "lms_bucket" needs initialization in Supabase.');
      } else {
        setStorageNotice(null);
      }
    } catch (err: any) {
      alert('Failed to upload course thumbnail: ' + err.message);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  // Save Full Course to Database
  const handleSaveCourse = async () => {
    setErrorMessage(null);

    // Validation
    if (!title.trim()) {
      setActiveTab('details');
      setErrorMessage('Course Title is required.');
      return;
    }

    if (modules.length === 0) {
      setActiveTab('content');
      setErrorMessage('Please add at least one module in Course Content.');
      return;
    }

    for (let i = 0; i < modules.length; i++) {
      if (!modules[i].title.trim()) {
        setActiveTab('content');
        setErrorMessage(`Module ${i + 1} title cannot be empty.`);
        return;
      }
      if (modules[i].lessons.length === 0) {
        setActiveTab('content');
        setErrorMessage(`Module "${modules[i].title}" must contain at least one lesson.`);
        return;
      }
      for (let j = 0; j < modules[i].lessons.length; j++) {
        if (!modules[i].lessons[j].title.trim()) {
          setActiveTab('content');
          setErrorMessage(`Lesson ${j + 1} in Module "${modules[i].title}" must have a title.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const courseToSave: Course = {
        id: courseId,
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        modules,
        isPublic,
        allowStudentRegistration,
        difficultyLevel,
        estimatedHours: Number(estimatedHours) || 4,
        createdBy: currentUserEmail,
        createdAt: initialCourse?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await lmsService.saveCourse(courseToSave);
      if (res.success) {
        onSaveSuccess(courseToSave);
      } else {
        setErrorMessage(res.error || 'Failed to save course to database.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for embed video
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

  const totalLessonsCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Sticky Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            id="btn-back-to-lms"
            onClick={onBack}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
  
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {modules.length} {modules.length === 1 ? 'Module' : 'Modules'} • {totalLessonsCount} Lessons
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 line-clamp-1">
              {title.trim() || 'Untitled New Course'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end md:self-auto">

          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-course-top"
            type="button"
            onClick={handleSaveCourse}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center space-x-2 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Course</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Storage Notice Banner */}
      {storageNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-start space-x-3 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-amber-950">{storageNotice}</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Your image was cached. To store future images directly in your Supabase bucket <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">lms_bucket</code>, execute the 1-click SQL script in your Supabase SQL editor.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] shadow-2xs transition-colors"
            >
              View SQL
            </button>
            <button
              type="button"
              onClick={() => setStorageNotice(null)}
              className="text-amber-600 hover:text-amber-800 font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs (Course Details | Course Content | Course Settings) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-xs">
        <div className="grid grid-cols-3 gap-1">
          {/* Tab 1: Course Details */}
          <button
            type="button"
            id="tab-course-details"
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'details'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Course Details</span>
          </button>

          {/* Tab 2: Course Content */}
          <button
            type="button"
            id="tab-course-content"
            onClick={() => setActiveTab('content')}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'content'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">Course Content</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                activeTab === 'content'
                  ? 'bg-blue-800 text-blue-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalLessonsCount}
            </span>
          </button>

          {/* Tab 3: Course Settings */}
          <button
            type="button"
            id="tab-course-settings"
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate">Course Settings</span>
            {isPublic && (
              <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-400 ml-1" title="Public" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COURSE DETAILS (Course Overview) */}
      {/* ========================================================================= */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Course Overview & Details</span>
              </h2>

            </div>

            {/* Course Title */}
            <div className="space-y-1.5">
              <label htmlFor="course-title" className="block text-xs font-bold text-slate-800">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="course-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Enterprise Cyber Security & Compliance Standards"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              />
            </div>

            {/* Course Description / Overview */}
            <div className="space-y-1.5">
              <label htmlFor="course-description" className="block text-xs font-bold text-slate-800">
                Course Overview & Description
              </label>
              <textarea
                id="course-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed summary of course scope, learning objectives, required certifications, and organizational policies covered..."
                className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-y"
              />
            </div>

            {/* Thumbnail / Cover Image */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
              {/* Thumbnail Preview Card */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Course Thumbnail Preview
                </label>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt="Course Thumbnail"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px]">No image selected</span>
                    </div>
                  )}
                  {isUploadingThumbnail && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload & Link Controls */}
              <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Upload Cover 
                  </label>
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100/80 rounded-lg transition-colors shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCourseCoverUpload(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400 ml-3">PNG, JPG, WebP supported</span>
                </div>

                <div className="pt-2">
                  <label htmlFor="course-thumbnail-url" className="block text-xs font-bold text-slate-800 mb-1">
                    Or Enter Image URL
                  </label>
                  <input
                    id="course-thumbnail-url"
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Course Metadata (Level & Duration) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Target Proficiency Level
                </label>
                <div className="flex items-center space-x-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficultyLevel(lvl)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        difficultyLevel === lvl
                          ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="estimated-hours" className="block text-xs font-bold text-slate-800">
                  Estimated Completion (Hours)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="estimated-hours"
                    type="number"
                    min={1}
                    max={200}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Next Step */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Cancel & Exit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <span>Next: Course Content</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURSE CONTENT (Curriculum & Lessons with RCE) */}
      {/* ========================================================================= */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Curriculum Modules & Lessons</span>
              </h2>

            </div>
            <button
              id="btn-add-module"
              type="button"
              onClick={handleAddModule}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Module</span>
            </button>
          </div>

          {/* Modules List */}
          <div className="space-y-6">
            {modules.map((module, moduleIndex) => (
              <div
                key={module.id}
                id={`module-block-${module.id}`}
                className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs space-y-4 p-4 sm:p-6"
              >
                {/* Module Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {moduleIndex + 1}
                    </span>
                    <div className="flex-1">
                      <label htmlFor={`mod-title-${module.id}`} className="sr-only">
                        Module Title
                      </label>
                      <input
                        id={`mod-title-${module.id}`}
                        type="text"
                        value={module.title}
                        onChange={(e) => handleUpdateModuleTitle(module.id, e.target.value)}
                        placeholder="Enter Module Title..."
                        className="w-full px-3 py-1.5 text-sm font-bold text-slate-900 bg-slate-50/60 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-md focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddLesson(module.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/70 rounded-md flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Lesson</span>
                    </button>
                    {modules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteModule(module.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lessons within Module */}
                <div className="space-y-4">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isDragging = draggedLesson?.lessonId === lesson.id;
                    const isOver = dragOverLessonId === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        id={`lesson-card-${lesson.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, module.id, lesson.id, lessonIndex)}
                        onDragOver={(e) => handleDragOver(e, lesson.id)}
                        onDrop={(e) => handleDrop(e, module.id, lesson.id)}
                        onDragEnd={handleDragEnd}
                        className={`border rounded-xl p-4 transition-all ${
                          isDragging
                            ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/30'
                            : isOver
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                            : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                        }`}
                      >
                        {/* Lesson Top Row: Drag Handle, Number, Title & Actions */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {/* Drag Handle with tooltip */}
                            <div
                              className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"
                              title="Drag to reorder lesson"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                              {moduleIndex + 1}.{lessonIndex + 1}
                            </span>

                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) =>
                                handleUpdateLesson(module.id, lesson.id, {
                                  title: e.target.value,
                                })
                              }
                              placeholder="Lesson title (e.g. Multi-Factor Authentication)..."
                              className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 focus:border-blue-600 rounded-md focus:outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* Reorder Buttons & Delete */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(module.id, lessonIndex, 'up')}
                              disabled={lessonIndex === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200/50"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(module.id, lessonIndex, 'down')}
                              disabled={lessonIndex === module.lessons.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200/50"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Lesson Body: RCE Description Editor & Media Options */}
                        <div className="pt-3.5 space-y-4">
                          {/* RCE Editor for Lesson Description */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-slate-800">
                                Lesson Description (Rich Content Editor)
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Supports formatting, headings, bullet lists, code blocks & links
                              </span>
                            </div>
                            <RichTextEditor
                              id={`rce-editor-${lesson.id}`}
                              value={lesson.description}
                              onChange={(newHtml) =>
                                handleUpdateLesson(module.id, lesson.id, {
                                  description: newHtml,
                                })
                              }
                              placeholder="Write comprehensive lesson explanations, checklists, steps, or code guidelines..."
                              minHeight="120px"
                            />
                          </div>

                          {/* Media Type Selector */}
                          <div className="space-y-2 pt-2 border-t border-slate-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Lesson Media Attachment
                              </span>
                              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLesson(module.id, lesson.id, {
                                      mediaType: 'none',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md transition-colors ${
                                    lesson.mediaType === 'none'
                                      ? 'bg-white text-slate-900 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  None
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLesson(module.id, lesson.id, {
                                      mediaType: 'image',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-colors ${
                                    lesson.mediaType === 'image'
                                      ? 'bg-white text-blue-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Image Upload</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLesson(module.id, lesson.id, {
                                      mediaType: 'video',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md flex items-center space-x-1 transition-colors ${
                                    lesson.mediaType === 'video'
                                      ? 'bg-white text-indigo-700 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Video className="w-3 h-3" />
                                  <span>Video Link</span>
                                </button>
                              </div>
                            </div>

                            {/* Image Upload Sub-panel */}
                            {lesson.mediaType === 'image' && (
                              <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center space-x-2">
                                    <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors shadow-2xs">
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>Upload to {LMS_BUCKET_NAME}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleImageFileChange(
                                            module.id,
                                            lesson.id,
                                            e.target.files?.[0] || null
                                          )
                                        }
                                        className="hidden"
                                      />
                                    </label>
                                    {uploadingLessonId === lesson.id && (
                                      <span className="text-xs text-blue-600 flex items-center space-x-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Uploading...</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 sm:max-w-xs">
                                    <input
                                      type="url"
                                      value={lesson.imageUrl || ''}
                                      onChange={(e) =>
                                        handleUpdateLesson(module.id, lesson.id, {
                                          imageUrl: e.target.value,
                                        })
                                      }
                                      placeholder="Or paste image URL (https://...)"
                                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>

                                {lesson.imageUrl && (
                                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
                                    <img
                                      src={lesson.imageUrl}
                                      alt={lesson.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-48 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateLesson(module.id, lesson.id, {
                                          imageUrl: undefined,
                                        })
                                      }
                                      className="absolute top-2 right-2 p-1 bg-black/60 text-white hover:bg-rose-600 rounded-full text-xs"
                                      title="Remove image"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Video Link Sub-panel */}
                            {lesson.mediaType === 'video' && (
                              <div className="bg-white border border-indigo-200 rounded-lg p-3 space-y-3">
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-slate-700">
                                    Video Streaming URL (YouTube, Vimeo, or MP4)
                                  </label>
                                  <input
                                    type="url"
                                    value={lesson.videoUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateLesson(module.id, lesson.id, {
                                        videoUrl: e.target.value,
                                      })
                                    }
                                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                                  />
                                </div>

                                {lesson.videoUrl && (
                                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video max-h-56">
                                    {getEmbedVideoUrl(lesson.videoUrl)?.includes('youtube.com') ||
                                    getEmbedVideoUrl(lesson.videoUrl)?.includes('vimeo.com') ? (
                                      <iframe
                                        src={getEmbedVideoUrl(lesson.videoUrl)!}
                                        title={lesson.title}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <video
                                        src={lesson.videoUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Step Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Course Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all"
            >
              <span>Next: Course Settings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COURSE SETTINGS (Public View & Student Registration Toggles) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Course Settings & Visibility</span>
              </h2>

            </div>

            {/* Requested Toggle 1: Public View Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-600" />
                  )}
                  <h3 className="text-sm font-bold text-slate-900">Public View</h3>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      isPublic
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isPublic ? 'Enabled (Visible to Users)' : 'Private (Hidden from Users)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  When enabled, this course is publicly visible and discoverable by all learners across the LMS directory.
                </p>
              </div>

              {/* Modern iOS / Tailwind Toggle Switch */}
              <button
                id="toggle-public-view"
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600/30 ${
                  isPublic ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Requested Toggle 2: Can Students Register Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {allowStudentRegistration ? (
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <UserX className="w-4 h-4 text-slate-500" />
                  )}
                  <h3 className="text-sm font-bold text-slate-900">Can Students Register</h3>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      allowStudentRegistration
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {allowStudentRegistration ? 'Self-Registration Allowed' : 'Admin Enrollment Only'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  Allow learners to freely enroll and register for this course directly from their user dashboard. 
                </p>
              </div>

              {/* Modern iOS / Tailwind Toggle Switch */}
              <button
                id="toggle-student-registration"
                type="button"
                role="switch"
                aria-checked={allowStudentRegistration}
                onClick={() => setAllowStudentRegistration(!allowStudentRegistration)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600/30 ${
                  allowStudentRegistration ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    allowStudentRegistration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom CTA to Save Course */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to Course Content
            </button>
            <button
              id="btn-save-course-bottom"
              type="button"
              onClick={handleSaveCourse}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center space-x-2 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Course</span>
                </>
              )}
            </button>
          </div>
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
