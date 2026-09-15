import { supabase } from '../lib/supabase';
import { Course, Lesson, CourseModule, CourseEnrollment, EnrollmentStatus } from '../types';

export const LMS_STORAGE_KEY = 'enterprise_lms_courses_cache';
export const LMS_ENROLLMENTS_KEY = 'enterprise_lms_enrollments_cache';
export const LMS_BUCKET_NAME = 'lms_bucket';

// Mock/Initial fallback courses
export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Enterprise Security & Compliance Fundamentals',
    description: 'Comprehensive guidelines and protocols for multi-tenant enterprise data governance, access controls, and SOC2 compliance standards.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    isPublic: true,
    allowStudentRegistration: true,
    difficultyLevel: 'Intermediate',
    estimatedHours: 6,
    certificateEnabled: true,
    createdBy: 'Chief Security Officer',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    modules: [
      {
        id: 'mod-101',
        courseId: 'course-1',
        title: 'Module 1: Principles of Zero Trust Architecture',
        orderIndex: 0,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lessons: [
          {
            id: 'les-101-1',
            moduleId: 'mod-101',
            courseId: 'course-1',
            title: 'Identity Verification & Device Attestation',
            description: '<p>Learn how to enforce contextual MFA and biometric signals across client devices.</p><ul><li>Strong credential policies</li><li>Session revocation protocols</li></ul>',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            orderIndex: 0,
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: 'les-101-2',
            moduleId: 'mod-101',
            courseId: 'course-1',
            title: 'Network Segmentation & Least Privilege',
            description: '<p>Understand micro-perimeter firewalls, VPC peering boundaries, and scoped service accounts.</p>',
            mediaType: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
            orderIndex: 1,
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
      },
      {
        id: 'mod-102',
        courseId: 'course-1',
        title: 'Module 2: Audit Logging and Incident Triage',
        orderIndex: 1,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        lessons: [
          {
            id: 'les-102-1',
            moduleId: 'mod-102',
            courseId: 'course-1',
            title: 'SIEM Integration and Real-time Alarms',
            description: '<p>Configuring automated webhooks to alert security operations when privilege escalation is detected.</p>',
            mediaType: 'none',
            orderIndex: 0,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
      },
    ],
  },
];

export const lmsService = {
  // Local cache helpers
  getLocalCourses(): Course[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LMS_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
        localStorage.setItem(LMS_STORAGE_KEY, JSON.stringify(INITIAL_COURSES));
      }
    } catch (e) {
      console.error('Error reading cached courses:', e);
    }
    return INITIAL_COURSES;
  },

  saveLocalCourses(courses: Course[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LMS_STORAGE_KEY, JSON.stringify(courses));
      }
    } catch (e) {
      console.error('Error writing cached courses:', e);
    }
  },

  // Local cache helpers for course enrollments
  getLocalEnrollments(): CourseEnrollment[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LMS_ENROLLMENTS_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.error('Error reading cached enrollments:', e);
    }
    return [];
  },

  saveLocalEnrollments(enrollments: CourseEnrollment[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LMS_ENROLLMENTS_KEY, JSON.stringify(enrollments));
      }
    } catch (e) {
      console.error('Error writing cached enrollments:', e);
    }
  },

  // Check Supabase bucket and schema readiness
  async checkStorageStatus(): Promise<{ bucketExists: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage.getBucket(LMS_BUCKET_NAME);
      if (error || !data) {
        return { bucketExists: false, error: error?.message || 'Bucket not found' };
      }
      return { bucketExists: true };
    } catch (err: any) {
      return { bucketExists: false, error: err.message };
    }
  },

  // Upload image to Supabase 'lms_bucket'
  async uploadLessonImage(file: File): Promise<{ url: string; bucketSaved: boolean; error?: string }> {
    // Generate clean file path
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `lessons/${cleanFileName}`;

    try {
      // 1. Try direct upload to Supabase storage bucket
      const { data, error: uploadError } = await supabase.storage
        .from(LMS_BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError && data) {
        // Upload succeeded! Get public URL from Supabase
        const { data: publicUrlData } = supabase.storage
          .from(LMS_BUCKET_NAME)
          .getPublicUrl(data.path || filePath);

        return {
          url: publicUrlData.publicUrl,
          bucketSaved: true,
        };
      }

      // If bucket does not exist, try to create it if possible
      if (uploadError?.message?.includes('not found') || uploadError?.message?.includes('NoSuchBucket')) {
        try {
          await supabase.storage.createBucket(LMS_BUCKET_NAME, { public: true });
          // Retry upload
          const retry = await supabase.storage.from(LMS_BUCKET_NAME).upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });
          if (!retry.error && retry.data) {
            const { data: pubData } = supabase.storage.from(LMS_BUCKET_NAME).getPublicUrl(retry.data.path || filePath);
            return { url: pubData.publicUrl, bucketSaved: true };
          }
        } catch {
          // creation failed due to RLS, proceed with fallback
        }
      }

      // If upload failed, read as local base64 Data URL so the user's workflow is not blocked
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const failureReason = uploadError?.message || 'Bucket not found';
      return {
        url: dataUrl,
        bucketSaved: false,
        error: `Supabase Storage '${LMS_BUCKET_NAME}' issue: ${failureReason}. The image was saved locally. Please ensure 'lms_bucket' is created in Supabase.`,
      };
    } catch (err: any) {
      console.warn('Storage exception, converting to local preview URL:', err);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return {
        url: dataUrl,
        bucketSaved: false,
        error: err.message || 'Storage error',
      };
    }
  },

  // Fetch all courses from Supabase with local fallback
  async fetchCourses(): Promise<{ courses: Course[]; source: 'supabase' | 'cache'; error?: string }> {
    const local = this.getLocalCourses();
    try {
      // 1. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError || !coursesData) {
        return { courses: local, source: 'cache', error: coursesError?.message };
      }

      if (coursesData.length === 0) {
        return { courses: local, source: 'cache' };
      }

      // 2. Fetch modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .order('order_index', { ascending: true });

      // 3. Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .order('order_index', { ascending: true });

      const parsedCourses: Course[] = coursesData.map((c: any) => {
        const courseModules = (modulesData || [])
          .filter((m: any) => m.course_id === c.id)
          .map((m: any) => {
            const moduleLessons = (lessonsData || [])
              .filter((l: any) => l.module_id === m.id)
              .map((l: any) => ({
                id: l.id,
                moduleId: l.module_id,
                courseId: l.course_id,
                title: l.title,
                description: l.description || '',
                mediaType: (l.media_type || 'none') as Lesson['mediaType'],
                imageUrl: l.image_url || undefined,
                videoUrl: l.video_url || undefined,
                orderIndex: l.order_index ?? 0,
                createdAt: l.created_at || new Date().toISOString(),
              }));

            return {
              id: m.id,
              courseId: m.course_id,
              title: m.title,
              orderIndex: m.order_index ?? 0,
              lessons: moduleLessons,
              createdAt: m.created_at || new Date().toISOString(),
            };
          });

        // Extract metadata config if embedded in description
        let metaConfig: any = {};
        const rawDesc = c.description || '';
        const match = rawDesc.match(/<!-- LMS_CONFIG:([\s\S]*?)-->/);
        if (match && match[1]) {
          try {
            metaConfig = JSON.parse(match[1]);
          } catch {
            // Ignore parse error
          }
        }
        const cleanDescription = rawDesc.replace(/\n?<!-- LMS_CONFIG:[\s\S]*?-->/g, '').trim();

        const isCoursePublic =
          c.is_public !== undefined && c.is_public !== null
            ? Boolean(c.is_public)
            : (metaConfig.isPublic !== undefined ? Boolean(metaConfig.isPublic) : true);

        return {
          id: c.id,
          title: c.title,
          description: cleanDescription,
          thumbnailUrl: c.thumbnail_url || undefined,
          isPublic: isCoursePublic,
          allowStudentRegistration:
            c.allow_student_registration !== undefined && c.allow_student_registration !== null
              ? Boolean(c.allow_student_registration)
              : (metaConfig.allowStudentRegistration !== undefined ? Boolean(metaConfig.allowStudentRegistration) : true),
          difficultyLevel: c.difficulty_level ?? metaConfig.difficultyLevel ?? 'Intermediate',
          estimatedHours: c.estimated_hours ?? metaConfig.estimatedHours ?? 4,
          modules: courseModules,
          createdBy: c.created_by || 'Admin',
          createdAt: c.created_at || new Date().toISOString(),
          updatedAt: c.updated_at || new Date().toISOString(),
        };
      });

      // Update cache
      this.saveLocalCourses(parsedCourses);
      return { courses: parsedCourses, source: 'supabase' };
    } catch (err: any) {
      return { courses: local, source: 'cache', error: err.message };
    }
  },

  // Save course (create or update) in both Supabase and Local Cache
  async saveCourse(course: Course): Promise<{ success: boolean; error?: string }> {
    // 1. Update local cache immediately so UI is always responsive and never loses data
    const existing = this.getLocalCourses();
    const index = existing.findIndex((c) => c.id === course.id);
    let updatedCourses: Course[];
    if (index >= 0) {
      updatedCourses = [...existing];
      updatedCourses[index] = course;
    } else {
      updatedCourses = [course, ...existing];
    }
    this.saveLocalCourses(updatedCourses);

    // 2. Persist to Supabase
    try {
      const metaTag = `\n<!-- LMS_CONFIG:${JSON.stringify({
        isPublic: course.isPublic !== false,
        allowStudentRegistration: course.allowStudentRegistration !== false,
        difficultyLevel: course.difficultyLevel || 'Intermediate',
        estimatedHours: course.estimatedHours || 4,
      })} -->`;

      const cleanDesc = (course.description || '').replace(/\n?<!-- LMS_CONFIG:[\s\S]*?-->/g, '').trim();

      // Build full payload with all columns and embed config in description for bulletproof compatibility
      const fullPayload = {
        id: course.id,
        title: course.title,
        description: cleanDesc + metaTag,
        thumbnail_url: course.thumbnailUrl || null,
        is_public: course.isPublic !== false,
        allow_student_registration: course.allowStudentRegistration !== false,
        difficulty_level: course.difficultyLevel || 'Intermediate',
        estimated_hours: course.estimatedHours || 4,
        created_by: course.createdBy,
        created_at: course.createdAt,
        updated_at: new Date().toISOString(),
      };

      // Try upserting full payload first
      let { error: courseErr } = await supabase.from('courses').upsert(fullPayload);

      // If PostgREST schema cache error (PGRST204) occurs because user hasn't run the ALTER TABLE migrations yet,
      // fallback to core existing columns and embed settings seamlessly into metadata tag
      if (courseErr && (courseErr.code === 'PGRST204' || courseErr.message?.includes('column'))) {
        console.warn('Extended columns not present in Supabase courses table, falling back to core schema:', courseErr.message);
        const corePayload = {
          id: course.id,
          title: course.title,
          description: cleanDesc + metaTag,
          thumbnail_url: course.thumbnailUrl || null,
          created_by: course.createdBy,
          created_at: course.createdAt,
          updated_at: new Date().toISOString(),
        };

        const retryRes = await supabase.from('courses').upsert(corePayload);
        courseErr = retryRes.error;
      }

      if (courseErr) {
        console.error('Supabase course upsert error:', courseErr);
        return { success: false, error: `Failed to save course to Supabase: ${courseErr.message}` };
      }

      // Delete existing lessons and modules for this course before reinserting
      await supabase.from('lessons').delete().eq('course_id', course.id);
      await supabase.from('modules').delete().eq('course_id', course.id);

      // Insert modules
      if (course.modules.length > 0) {
        const modulesPayload = course.modules.map((m, idx) => ({
          id: m.id,
          course_id: course.id,
          title: m.title,
          order_index: idx,
          created_at: m.createdAt || new Date().toISOString(),
        }));

        const { error: modErr } = await supabase.from('modules').insert(modulesPayload);
        if (modErr) {
          console.error('Supabase modules insert error:', modErr);
          return { success: false, error: `Failed to save modules to Supabase: ${modErr.message}` };
        }

        // Insert lessons
        const allLessons: any[] = [];
        course.modules.forEach((mod) => {
          mod.lessons.forEach((les, lesIdx) => {
            allLessons.push({
              id: les.id,
              module_id: mod.id,
              course_id: course.id,
              title: les.title,
              description: les.description || '',
              media_type: les.mediaType,
              image_url: les.imageUrl || null,
              video_url: les.videoUrl || null,
              order_index: lesIdx,
              created_at: les.createdAt || new Date().toISOString(),
            });
          });
        });

        if (allLessons.length > 0) {
          const { error: lesErr } = await supabase.from('lessons').insert(allLessons);
          if (lesErr) {
            console.error('Supabase lessons insert error:', lesErr);
            return { success: false, error: `Failed to save lessons to Supabase: ${lesErr.message}` };
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Database exception while saving course to Supabase:', err);
      return { success: false, error: err.message || 'Database connection error' };
    }
  },

  // Delete course from Supabase and local cache
  async deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
    const existing = this.getLocalCourses().filter((c) => c.id !== courseId);
    this.saveLocalCourses(existing);

    try {
      await supabase.from('lessons').delete().eq('course_id', courseId);
      await supabase.from('modules').delete().eq('course_id', courseId);
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------
  // USER ENROLLMENT & PROGRESS METHODS
  // -------------------------------------------------------------

  // Fetch all enrollments for a specific user
  async fetchUserEnrollments(userId: string): Promise<{
    enrollments: CourseEnrollment[];
    source: 'supabase' | 'cache';
    error?: string;
  }> {
    const local = this.getLocalEnrollments().filter((e) => e.userId === userId);

    try {
      // 1. Try querying 'course_enrollments'
      let queryRes = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId);

      // Fallback to 'enrollments' if named 'enrollments'
      if (
        queryRes.error &&
        (queryRes.error.code === 'PGRST204' ||
          queryRes.error.code === 'PGRST200' ||
          queryRes.error.message.includes('not find the table'))
      ) {
        queryRes = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId);
      }

      if (queryRes.error || !queryRes.data) {
        return { enrollments: local, source: 'cache', error: queryRes.error?.message };
      }

      const parsed: CourseEnrollment[] = queryRes.data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        courseId: row.course_id,
        courseTitle: row.course_title,
        enrolledAt: row.enrolled_at || new Date().toISOString(),
        status: (row.status as EnrollmentStatus) || 'enrolled',
        progressPercentage: Number(row.progress_percentage || 0),
        completedLessons: Array.isArray(row.completed_lessons)
          ? row.completed_lessons
          : typeof row.completed_lessons === 'string'
          ? JSON.parse(row.completed_lessons)
          : [],
        lastAccessedAt: row.last_accessed_at,
        completedAt: row.completed_at,
      }));

      // Merge into local cache
      const allLocal = this.getLocalEnrollments().filter((e) => e.userId !== userId);
      this.saveLocalEnrollments([...allLocal, ...parsed]);

      return { enrollments: parsed, source: 'supabase' };
    } catch (err: any) {
      return { enrollments: local, source: 'cache', error: err.message };
    }
  },

  // Fetch all enrollments across all students (for Super Admin dashboard)
  async fetchAllEnrollments(): Promise<{
    enrollments: CourseEnrollment[];
    source: 'supabase' | 'cache';
    error?: string;
  }> {
    const local = this.getLocalEnrollments();
    try {
      let queryRes = await supabase.from('course_enrollments').select('*');
      if (
        queryRes.error &&
        (queryRes.error.code === 'PGRST204' ||
          queryRes.error.code === 'PGRST200' ||
          queryRes.error.message?.includes('not find the table'))
      ) {
        queryRes = await supabase.from('enrollments').select('*');
      }

      if (queryRes.error || !queryRes.data) {
        return { enrollments: local, source: 'cache', error: queryRes.error?.message };
      }

      const parsed: CourseEnrollment[] = queryRes.data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        courseId: row.course_id,
        courseTitle: row.course_title,
        enrolledAt: row.enrolled_at || new Date().toISOString(),
        status: (row.status as EnrollmentStatus) || 'enrolled',
        progressPercentage: Number(row.progress_percentage || 0),
        completedLessons: Array.isArray(row.completed_lessons)
          ? row.completed_lessons
          : typeof row.completed_lessons === 'string'
          ? JSON.parse(row.completed_lessons)
          : [],
        lastAccessedAt: row.last_accessed_at,
        completedAt: row.completed_at,
      }));

      this.saveLocalEnrollments(parsed);
      return { enrollments: parsed, source: 'supabase' };
    } catch (err: any) {
      return { enrollments: local, source: 'cache', error: err.message };
    }
  },

  // Enroll user into a course (validating super admin toggle)
  async enrollUser(
    userId: string,
    userEmail: string,
    course: Course
  ): Promise<{ success: boolean; enrollment?: CourseEnrollment; error?: string }> {
    // Check super admin permission toggle
    if (course.allowStudentRegistration === false) {
      return {
        success: false,
        error: 'Self-enrollment is closed for this course by the administrator.',
      };
    }

    const enrollmentId = `enr_${userId}_${course.id}`;
    const newEnrollment: CourseEnrollment = {
      id: enrollmentId,
      userId,
      userEmail,
      courseId: course.id,
      courseTitle: course.title,
      enrolledAt: new Date().toISOString(),
      status: 'enrolled',
      progressPercentage: 0,
      completedLessons: [],
      lastAccessedAt: new Date().toISOString(),
    };

    // 1. Optimistic write to local cache
    const currentList = this.getLocalEnrollments();
    const existingIndex = currentList.findIndex(
      (e) => e.userId === userId && e.courseId === course.id
    );
    if (existingIndex >= 0) {
      currentList[existingIndex] = newEnrollment;
    } else {
      currentList.push(newEnrollment);
    }
    this.saveLocalEnrollments(currentList);

    // 2. Persist to Supabase database
    try {
      const dbRow = {
        id: newEnrollment.id,
        user_id: newEnrollment.userId,
        user_email: newEnrollment.userEmail,
        course_id: newEnrollment.courseId,
        course_title: newEnrollment.courseTitle,
        enrolled_at: newEnrollment.enrolledAt,
        status: newEnrollment.status,
        progress_percentage: 0,
        completed_lessons: [],
        last_accessed_at: newEnrollment.lastAccessedAt,
      };

      let insertRes = await supabase.from('course_enrollments').upsert(dbRow);
      if (insertRes.error && insertRes.error.message.includes('not find the table')) {
        insertRes = await supabase.from('enrollments').upsert(dbRow);
      }

      if (insertRes.error) {
        console.warn(
          'Enrollment persisted to local cache, Supabase table not yet initialized:',
          insertRes.error.message
        );
      }

      return { success: true, enrollment: newEnrollment };
    } catch (err: any) {
      console.warn('Database error on enroll, saved in cache:', err);
      return { success: true, enrollment: newEnrollment };
    }
  },

  // Update course progress and completed lessons
  async updateCourseProgress(
    userId: string,
    userEmail: string,
    course: Course,
    completedLessons: string[]
  ): Promise<{ success: boolean; enrollment?: CourseEnrollment; error?: string }> {
    const totalLessons = course.modules.reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0
    );
    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
    const status: EnrollmentStatus =
      progressPercentage === 100
        ? 'completed'
        : completedLessons.length > 0
        ? 'in_progress'
        : 'enrolled';
    const completedAt = progressPercentage === 100 ? new Date().toISOString() : undefined;

    const enrollmentId = `enr_${userId}_${course.id}`;
    const updatedEnrollment: CourseEnrollment = {
      id: enrollmentId,
      userId,
      userEmail,
      courseId: course.id,
      courseTitle: course.title,
      enrolledAt: new Date().toISOString(),
      status,
      progressPercentage,
      completedLessons,
      lastAccessedAt: new Date().toISOString(),
      completedAt,
    };

    // 1. Update local cache
    const currentList = this.getLocalEnrollments();
    const existingIndex = currentList.findIndex(
      (e) => e.userId === userId && e.courseId === course.id
    );
    if (existingIndex >= 0) {
      updatedEnrollment.enrolledAt = currentList[existingIndex].enrolledAt;
      currentList[existingIndex] = updatedEnrollment;
    } else {
      currentList.push(updatedEnrollment);
    }
    this.saveLocalEnrollments(currentList);

    // 2. Persist to Supabase database
    try {
      const dbRow = {
        id: updatedEnrollment.id,
        user_id: updatedEnrollment.userId,
        user_email: updatedEnrollment.userEmail,
        course_id: updatedEnrollment.courseId,
        course_title: updatedEnrollment.courseTitle,
        enrolled_at: updatedEnrollment.enrolledAt,
        status: updatedEnrollment.status,
        progress_percentage: updatedEnrollment.progressPercentage,
        completed_lessons: updatedEnrollment.completedLessons,
        last_accessed_at: updatedEnrollment.lastAccessedAt,
        completed_at: updatedEnrollment.completedAt || null,
      };

      let updateRes = await supabase.from('course_enrollments').upsert(dbRow);
      if (updateRes.error && updateRes.error.message.includes('not find the table')) {
        updateRes = await supabase.from('enrollments').upsert(dbRow);
      }

      return { success: true, enrollment: updatedEnrollment };
    } catch (err: any) {
      return { success: true, enrollment: updatedEnrollment };
    }
  },

  // Toggle single lesson completion status
  async toggleLessonCompletion(
    userId: string,
    userEmail: string,
    course: Course,
    lessonId: string
  ): Promise<{
    success: boolean;
    enrollment?: CourseEnrollment;
    isCompleted: boolean;
    error?: string;
  }> {
    const enrollments = this.getLocalEnrollments();
    const existing = enrollments.find(
      (e) => e.userId === userId && e.courseId === course.id
    );
    const completedList = existing ? [...existing.completedLessons] : [];

    const isCurrentlyCompleted = completedList.includes(lessonId);
    let updatedCompleted: string[];
    if (isCurrentlyCompleted) {
      updatedCompleted = completedList.filter((id) => id !== lessonId);
    } else {
      updatedCompleted = [...completedList, lessonId];
    }

    const res = await this.updateCourseProgress(
      userId,
      userEmail,
      course,
      updatedCompleted
    );
    return {
      success: res.success,
      enrollment: res.enrollment,
      isCompleted: !isCurrentlyCompleted,
      error: res.error,
    };
  },
};
