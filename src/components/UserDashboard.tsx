import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Course, CourseEnrollment } from '../types';
import { lmsService } from '../services/lmsService';
import {
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  GraduationCap
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

interface UserDashboardProps {
  onNavigateToCourses?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigateToCourses }) => {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const [enrRes, crsRes] = await Promise.all([
          lmsService.fetchUserEnrollments(currentUser.id),
          lmsService.fetchCourses(),
        ]);
        if (isMounted) {
          setEnrollments(enrRes.enrollments || []);
          setCourses(crsRes.courses || []);
        }
      } catch (err) {
        console.error('Failed to load user dashboard analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  if (!currentUser) return null;

  // Compute 3 requested metrics
  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter(
    (e) => e.status === 'completed' || e.progressPercentage === 100
  ).length;
  const inProgressCount = enrollments.filter(
    (e) =>
      (e.status === 'in_progress' || (e.progressPercentage > 0 && e.progressPercentage < 100)) &&
      e.status !== 'completed'
  ).length;
  const notStartedCount = Math.max(0, enrolledCount - completedCount - inProgressCount);

  // Overall average progress across enrolled courses
  const averageProgress =
    enrolledCount > 0
      ? Math.round(
          enrollments.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) /
            enrolledCount
        )
      : 0;

  // Chart Data 1: Progress breakdown per enrolled course
  const courseProgressData = useMemo(() => {
    return enrollments.map((enr) => {
      const fullCourse = courses.find((c) => c.id === enr.courseId);
      const totalLessons =
        fullCourse?.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
      const completedLessons = enr.completedLessons?.length || 0;

      return {
        name:
          enr.courseTitle.length > 24
            ? enr.courseTitle.substring(0, 22) + '...'
            : enr.courseTitle,
        fullTitle: enr.courseTitle,
        progress: enr.progressPercentage || 0,
        completedLessons,
        totalLessons,
        status:
          enr.progressPercentage === 100
            ? 'Completed'
            : (enr.progressPercentage || 0) > 0
            ? 'In Progress'
            : 'Enrolled',
      };
    });
  }, [enrollments, courses]);

  // Chart Data 2: Status distribution (Donut / Pie)
  const statusDistributionData = useMemo(() => {
    return [
      { name: 'Completed', value: completedCount, color: '#10b981' },
      { name: 'In Progress', value: inProgressCount, color: '#2563eb' },
      { name: 'Not Started', value: notStartedCount, color: '#94a3b8' },
    ].filter((item) => item.value > 0);
  }, [completedCount, inProgressCount, notStartedCount]);

  return (
    <div id="user-dashboard-root" className="space-y-6">
      {/* 1. WELCOME HEADER */}
      <div
        id="user-dash-welcome-header"
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 rounded-xl shadow-xs">
            {currentUser.fullName.charAt(0).toUpperCase()}
          </div>
          <div>


            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Welcome, {currentUser.fullName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>{currentUser.email}</span>

            </div>
          </div>
        </div>

        {onNavigateToCourses && (
          <button
            id="btn-dash-goto-courses"
            type="button"
            onClick={onNavigateToCourses}
            className="shrink-0 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center space-x-2 transition-all cursor-pointer self-start md:self-auto"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Courses</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        )}
      </div>

      {/* 2. THREE STAT CARDS */}
      <div id="user-stats-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Courses Enrolled */}
        <div
          id="stat-card-courses-enrolled"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-blue-600"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider">
              Courses Enrolled
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {loading ? '...' : enrolledCount}
            </span>
          </div>
        </div>

        {/* Card 2: Course Progress */}
        <div
          id="stat-card-courses-in-progress"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-amber-500"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider">
              Courses in Progress
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {loading ? '...' : inProgressCount}
            </span>
          </div>
        </div>

        {/* Card 3: Courses Completed */}
        <div
          id="stat-card-courses-completed"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs border-l-4 border-l-emerald-600"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold tracking-wider">
              Courses Completed
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {loading ? '...' : completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3. ANALYTICAL GRAPHS */}
      <div id="user-graphs-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Course Completion Progress Bar Chart (2 columns wide on large screens) */}
        <div
          id="chart-course-progress-container"
          className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Course Completion Progress
                </h3>
                <p className="text-xs text-slate-500">
                  Percentage progress per registered course
                </p>
              </div>
            </div>
            {enrolledCount > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                {enrolledCount} Course{enrolledCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {enrolledCount === 0 ? (
            <div className="py-14 text-center space-y-3">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">
                No courses enrolled yet
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Explore our curriculum library to enroll in courses and begin tracking your skills.
              </p>
              {onNavigateToCourses && (
                <button
                  type="button"
                  onClick={onNavigateToCourses}
                  className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Available Courses</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseProgressData}
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
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1 max-w-xs">
                            <p className="font-bold text-white leading-snug">{item.fullTitle}</p>
                            <p className="text-emerald-400 font-semibold">
                              Progress: {item.progress}%
                            </p>
                            <p className="text-slate-300">
                              Lessons: {item.completedLessons} of {item.totalLessons} completed
                            </p>
                            <span className="inline-block mt-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              Status: {item.status}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="progress"
                    name="Progress %"
                    radius={[6, 6, 0, 0]}
                    fill="#2563eb"
                  >
                    {courseProgressData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.progress === 100
                            ? '#10b981'
                            : entry.progress > 0
                            ? '#2563eb'
                            : '#94a3b8'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Graph 2: Learning Status Distribution Donut Chart */}
        <div
          id="chart-status-distribution-container"
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Status Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Course completion stages
                </p>
              </div>
            </div>
          </div>

          {enrolledCount === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs">
              Enroll in a course to view your progress breakdown.
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, idx) => (
                      <Cell key={`donut-cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        const count = Number(item.value);
                        const pct = Math.round((count / enrolledCount) * 100);
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-md shadow-md text-xs">
                            <span className="font-semibold">{item.name}:</span> {count} course
                            {count !== 1 ? 's' : ''} ({pct}%)
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom Clean Legend */}
              <div className="w-full flex items-center justify-center space-x-4 pt-2 text-xs text-slate-600">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Completed ({completedCount})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>In Progress ({inProgressCount})</span>
                </div>
                {notStartedCount > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>Not Started ({notStartedCount})</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
