import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Course, CourseEnrollment } from '../types';
import { lmsService } from '../services/lmsService';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';

interface SuperAdminDashboardProps {
  activeView?: 'admin_dashboard' | 'user_management' | 'audit_logs' | 'user_dashboard';
  onOpenCreateUser: () => void;
  onOpenEditUser: (user: User) => void;
  onOpenDeleteUser: (user: User) => void;
  onViewUserDashboard?: (userId: string) => void;
  activeSubTab?: 'overview' | 'users' | 'audit';
  setActiveSubTab?: (tab: 'overview' | 'users' | 'audit') => void;
  onNavigateToUserManagement?: () => void;
  onNavigateToLMS?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  activeView = 'admin_dashboard',
  onOpenCreateUser,
  onOpenEditUser,
  onOpenDeleteUser,
  onNavigateToUserManagement,
  onNavigateToLMS,
}) => {
  const { users } = useAuth();

  // Search state for user management
  const [searchTerm, setSearchTerm] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  // LMS Data for Super Admin Dashboard
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loadingLms, setLoadingLms] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLmsData = async () => {
      setLoadingLms(true);
      try {
        const [crsRes, enrRes] = await Promise.all([
          lmsService.fetchCourses(),
          lmsService.fetchAllEnrollments(),
        ]);
        if (isMounted) {
          setCourses(crsRes.courses || []);
          setEnrollments(enrRes.enrollments || []);
        }
      } catch (err) {
        console.error('Failed to load LMS data for Super Admin:', err);
      } finally {
        if (isMounted) setLoadingLms(false);
      }
    };

    fetchLmsData();
    return () => {
      isMounted = false;
    };
  }, []);

  // -------------------------------------------------------------
  // STATS COMPUTATION
  // -------------------------------------------------------------
  // 1. Number of courses
  const totalCourses = courses.length;

  // 2. Number of students enrolled (unique users enrolled & total enrollments)
  const uniqueStudentsEnrolled = new Set(enrollments.map((e) => e.userId)).size;
  const totalEnrollmentsCount = enrollments.length;

  // 3. Number of courses in progress
  const coursesInProgressCount = enrollments.filter(
    (e) =>
      (e.status === 'in_progress' || (e.progressPercentage > 0 && e.progressPercentage < 100)) &&
      e.status !== 'completed'
  ).length;

  // 4. Number of courses completed
  const coursesCompletedCount = enrollments.filter(
    (e) => e.status === 'completed' || e.progressPercentage === 100
  ).length;

  // Enrolled / not started
  const notStartedCount = Math.max(
    0,
    totalEnrollmentsCount - coursesInProgressCount - coursesCompletedCount
  );

  // -------------------------------------------------------------
  // GRAPHS DATA PREPARATION
  // -------------------------------------------------------------
  // Graph 1: Enrollment & Completion Breakdown per Course
  const perCourseGraphData = useMemo(() => {
    return courses.map((course) => {
      const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
      const enrolled = courseEnrollments.length;
      const completed = courseEnrollments.filter(
        (e) => e.status === 'completed' || e.progressPercentage === 100
      ).length;
      const inProgress = courseEnrollments.filter(
        (e) =>
          (e.status === 'in_progress' ||
            (e.progressPercentage > 0 && e.progressPercentage < 100)) &&
          e.status !== 'completed'
      ).length;

      return {
        name:
          course.title.length > 20 ? course.title.substring(0, 18) + '...' : course.title,
        fullTitle: course.title,
        enrolled,
        inProgress,
        completed,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
      };
    });
  }, [courses, enrollments]);

  // Graph 2: Global Learning Status Distribution
  const globalStatusDistribution = useMemo(() => {
    return [
      { name: 'Completed', value: coursesCompletedCount, color: '#10b981' },
      { name: 'In Progress', value: coursesInProgressCount, color: '#f59e0b' },
      { name: 'Not Started', value: notStartedCount, color: '#2563eb' },
    ].filter((item) => item.value > 0);
  }, [coursesCompletedCount, coursesInProgressCount, notStartedCount]);

  // Graph 3: Course Completion Rates
  const courseCompletionRates = useMemo(() => {
    return courses
      .map((c) => {
        const cEnr = enrollments.filter((e) => e.courseId === c.id);
        const comp = cEnr.filter(
          (e) => e.status === 'completed' || e.progressPercentage === 100
        ).length;
        const rate = cEnr.length > 0 ? Math.round((comp / cEnr.length) * 100) : 0;
        return {
          name: c.title.length > 22 ? c.title.substring(0, 20) + '...' : c.title,
          fullTitle: c.title,
          rate,
          students: cEnr.length,
          completed: comp,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [courses, enrollments]);

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Filtered Users for user management
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.role.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, searchTerm]);

  // =========================================================================
  // VIEW: SUPER ADMIN DASHBOARD (Overview with 4 Stat Cards + Graphs)
  // =========================================================================
  if (activeView === 'admin_dashboard') {
    return (
      <div id="super-admin-dashboard-root" className="space-y-6">
        {/* Top Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Super Admin Executive Dashboard
            </h1>

          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            {onNavigateToLMS && (
              <button
                type="button"
                id="btn-dash-manage-lms"
                onClick={onNavigateToLMS}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-600" />
                <span>Manage LMS Courses</span>
              </button>
            )}
            {onNavigateToUserManagement && (
              <button
                type="button"
                id="btn-dash-manage-users"
                onClick={onNavigateToUserManagement}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>User Directory</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 STAT CARDS */}
        <div id="sa-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Number of Courses */}
          <div
            id="kpi-card-total-courses"
            onClick={onNavigateToLMS}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-blue-600 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold tracking-wider">
                Total Courses
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                {loadingLms ? '...' : totalCourses}
              </span>
            </div>
          </div>

          {/* Card 2: Number of Students Enrolled */}
          <div
            id="kpi-card-students-enrolled"
            onClick={onNavigateToUserManagement}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold tracking-wider">
                Students Enrolled
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                {loadingLms ? '...' : uniqueStudentsEnrolled}
              </span>
            </div>
          </div>

          {/* Card 3: Number of Courses in Progress */}
          <div
            id="kpi-card-courses-in-progress"
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-amber-500 hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold tracking-wider">
                Courses in Progress
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                {loadingLms ? '...' : coursesInProgressCount}
              </span>
            </div>
          </div>

          {/* Card 4: Number of Courses Completed */}
          <div
            id="kpi-card-courses-completed"
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-emerald-600 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold tracking-wider">
                Courses Completed
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                {loadingLms ? '...' : coursesCompletedCount}
              </span>
            </div>
          </div>
        </div>

        {/* GRAPHS SECTION */}
        <div id="sa-graphs-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph 1: Enrollment & Completion Breakdown by Course (Bar Chart - 2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Course Enrollment & Completion Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparing enrolled students, active learners in progress, and completions per course
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                {totalCourses} Courses
              </span>
            </div>

            {courses.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                No courses published in catalog yet.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={perCourseGraphData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 max-w-xs">
                              <p className="font-bold text-white leading-snug">{item.fullTitle}</p>
                              <div className="space-y-1 pt-1 border-t border-slate-800 text-[11px]">
                                <div className="flex items-center justify-between text-blue-400">
                                  <span>Total Enrolled:</span>
                                  <span className="font-bold">{item.enrolled}</span>
                                </div>
                                <div className="flex items-center justify-between text-amber-400">
                                  <span>In Progress:</span>
                                  <span className="font-bold">{item.inProgress}</span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-400">
                                  <span>Completed:</span>
                                  <span className="font-bold">{item.completed}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                                  <span>Completion Rate:</span>
                                  <span className="font-bold text-white">{item.completionRate}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                    />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Graph 2: Global Learning Status Distribution (Donut Chart) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Global Status Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proportion of curriculum completion
                  </p>
                </div>
              </div>
            </div>

            {totalEnrollmentsCount === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                No course enrollments recorded yet.
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={globalStatusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {globalStatusDistribution.map((entry, idx) => (
                        <Cell key={`sa-donut-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          const count = Number(item.value);
                          const pct = Math.round((count / totalEnrollmentsCount) * 100);
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-md shadow-md text-xs">
                              <span className="font-semibold">{item.name}:</span> {count} (
                              {pct}%)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Custom Legend */}
                <div className="w-full flex items-center justify-center space-x-3 pt-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Completed ({coursesCompletedCount})</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>In Progress ({coursesInProgressCount})</span>
                  </div>
                  {notStartedCount > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span>Not Started ({notStartedCount})</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Course Completion Rate Performance Table */}
        {courseCompletionRates.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Course Completion Performance Summary
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Sorted by highest completion rate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseCompletionRates.map((c, i) => (
                <div
                  key={`rate-card-${i}`}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={c.fullTitle}>
                      {c.fullTitle}
                    </h4>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        c.rate >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.rate >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.rate}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        c.rate >= 80
                          ? 'bg-emerald-500'
                          : c.rate >= 40
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{c.students} total enrolled</span>
                    <span className="font-semibold text-slate-700">
                      {c.completed} completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: USER MANAGEMENT (Table, Credentials, Role Actions)
  // =========================================================================
  return (
    <div id="super-admin-dashboard-root" className="space-y-6">
      {/* User Management Header */}
      <div
        id="sa-usermgmt-header"
        className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage directory users, credentials, roles, and account statuses.
          </p>
        </div>

        {/* Global CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-create-user-primary"
            onClick={onOpenCreateUser}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Main Container inside SA view */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 space-y-4">
          {/* Filter & Search Bar */}
          <div
            id="user-table-filter-bar"
            className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3.5"
          >
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="input-search-users"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by full name, email, or role..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800 tabular-nums font-semibold">{filteredUsers.length}</strong> of{' '}
              <strong className="text-slate-800 tabular-nums font-semibold">{users.length}</strong> registered enterprise users
            </span>
          </div>

          {/* Enterprise Table */}
          <div className="border border-slate-200/80 rounded-lg overflow-x-auto shadow-xs">
            <table id="table-user-directory" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold tracking-wider text-[11px]">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Password Credential</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No users match your search</p>
                        <p className="text-xs text-slate-400">Try adjusting your search query.</p>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuperAdminAccount = u.role === 'SUPER_ADMIN';
                    const isPasswordRevealed = revealedPasswords[u.id];

                    return (
                      <tr
                        key={u.id}
                        id={`user-row-${u.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* User Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 flex items-center justify-center font-semibold text-xs shrink-0 rounded-full ${
                              isSuperAdminAccount
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate flex items-center space-x-1.5">
                                <span>{u.fullName}</span>
                                {isSuperAdminAccount && (
                                  <span className="text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-sm">
                                    PRIMARY SA
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {u.email}
                              </div>
                              {u.phone && (
                                <div className="text-[10px] text-slate-400">{u.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                              isSuperAdminAccount
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        {/* Password Credential */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] text-slate-700 font-medium font-mono">
                              {isPasswordRevealed ? u.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              id={`btn-reveal-pass-${u.id}`}
                              onClick={() => togglePasswordReveal(u.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                              title={isPasswordRevealed ? 'Hide credential' : 'Show credential'}
                            >
                              <KeyRound className="w-3 h-3 text-slate-600" />
                            </button>
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3 px-4 text-slate-600">
                          <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                        </td>

                        {/* Actions: Edit and Delete */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              id={`btn-edit-user-${u.id}`}
                              onClick={() => onOpenEditUser(u)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Edit user"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`btn-delete-user-${u.id}`}
                              disabled={isSuperAdminAccount}
                              onClick={() => onOpenDeleteUser(u)}
                              className={`p-1.5 border rounded-md transition-colors ${
                                isSuperAdminAccount
                                  ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                                  : 'text-red-600 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 cursor-pointer'
                              }`}
                              title={isSuperAdminAccount ? 'Cannot delete primary Super Administrator' : 'Permanently delete user'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
