export type UserRole = 'SUPER_ADMIN' | 'USER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  jobTitle?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  lastPasswordChange?: string;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
  department?: string;
  jobTitle?: string;
  status?: UserStatus;
}

export interface UpdateUserData {
  fullName: string;
  email: string;
  password?: string;
  role?: UserRole;
  department?: string;
  jobTitle?: string;
  status?: UserStatus;
  phone?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'PASSWORD_CHANGED' | 'STATUS_CHANGED' | 'LOGIN';
  targetUserEmail: string;
  details: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type LessonMediaType = 'image' | 'video' | 'none';

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  mediaType: LessonMediaType;
  imageUrl?: string;
  videoUrl?: string;
  orderIndex: number;
  createdAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
  createdAt: string;
}

export type Module = CourseModule;

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  modules: CourseModule[];
  isPublic?: boolean;
  allowStudentRegistration?: boolean;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours?: number;
  certificateEnabled?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped';

export interface CourseEnrollment {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  courseTitle?: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  completedLessons: string[]; // List of lesson IDs
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt: string;
}
