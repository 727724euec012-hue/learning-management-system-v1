import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { UserDrawer } from './components/UserDrawer';
import { DeleteDrawer } from './components/DeleteDrawer';
import { SupabaseDrawer } from './components/SupabaseDrawer';
import { LoginView } from './components/LoginView';
import { User, CreateUserData, UpdateUserData, Course } from './types';
import { CheckCircle2, Info, X } from 'lucide-react';
import { LMSManagement } from './components/LMSManagement';
import { LMSCourseEditor } from './components/LMSCourseEditor';
import { UserCoursesView } from './components/UserCoursesView';
import { AppView } from './components/SidebarDrawer';

function AppContent() {
  const { currentUser, switchUser, createUser, updateUser, deleteUser, users } = useAuth();

  // Navigation state - strictly defaults to dashboard and overview
  const [activeView, setActiveView] = useState<AppView>('admin_dashboard');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'audit'>('overview');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Ensure user always lands on their primary dashboard page fresh after logging in
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') {
        setActiveView('admin_dashboard');
        setActiveSubTab('overview');
      } else {
        setActiveView('user_dashboard');
        setActiveSubTab('overview');
      }
      setEditingCourse(null);
      setIsCreateDrawerOpen(false);
      setIsEditDrawerOpen(false);
      setIsDeleteDrawerOpen(false);
      setUserToEdit(null);
      setUserToDelete(null);
      setIsSupabaseDrawerOpen(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Drawer states (replaces all modal popups with right side drawers)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [isDeleteDrawerOpen, setIsDeleteDrawerOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [isSupabaseDrawerOpen, setIsSupabaseDrawerOpen] = useState(false);

  // System toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // If no user is logged in, show enterprise login screen
  if (!currentUser) {
    return (
      <LoginView
        onSuccessfulLogin={() => {
          setActiveView('admin_dashboard');
          setActiveSubTab('overview');
          setEditingCourse(null);
          setIsCreateDrawerOpen(false);
          setIsEditDrawerOpen(false);
          setIsDeleteDrawerOpen(false);
          setUserToEdit(null);
          setUserToDelete(null);
          setIsSupabaseDrawerOpen(false);
          showToast('Successfully authenticated.', 'success');
        }}
      />
    );
  }

  // Handlers for right side drawer triggers
  const handleOpenCreateUser = () => {
    setIsCreateDrawerOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setUserToEdit(user);
    setIsEditDrawerOpen(true);
  };

  const handleOpenDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDrawerOpen(true);
  };

  const handleViewUserDashboard = (userId: string) => {
    switchUser(userId);
    setActiveView('user_dashboard');
    const u = users.find((x) => x.id === userId);
    showToast(`Switched view to personal dashboard for "${u?.fullName}".`, 'info');
  };

  const handleCreateSubmit = async (data: CreateUserData) => {
    const res = await createUser(data);
    if (res.success && res.user) {
      showToast(`User "${res.user.fullName}" successfully created with corporate password!`, 'success');
    }
    return res;
  };

  const handleUpdateSubmit = async (userId: string, data: UpdateUserData) => {
    const res = await updateUser(userId, data);
    if (res.success) {
      showToast(`User profile "${data.fullName}" successfully updated.`, 'success');
    }
    return res;
  };

  const handleDeleteConfirm = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    const res = await deleteUser(userId);
    if (res.success) {
      showToast(`User account "${target?.fullName || 'User'}" permanently deleted.`, 'info');
    }
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <div id="enterprise-portal-app" className="min-h-screen bg-slate-100 flex">
      {/* Collapsible Left Side Drawer Navigation */}
      <SidebarDrawer
        activeView={activeView}
        setActiveView={setActiveView}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* Main View Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar with strictly nothing on it per user directive */}
        <Navbar />

        {/* Floating System Alert / Toast */}
        {toastMessage && (
          <div
            id="toast-notification"
            className={`fixed top-16 right-6 z-50 flex items-center space-x-3 px-4 py-3 border text-xs font-semibold max-w-md rounded-lg shadow-lg backdrop-blur-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                : toastMessage.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900'
                : 'bg-blue-50/95 border-blue-300 text-blue-900'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <X className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="flex-1">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-0.5 hover:opacity-70 text-slate-500 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* LMS Management View */}
          {isSuperAdmin && activeView === 'lms_management' && (
            <LMSManagement
              onCreateCourse={() => {
                setEditingCourse(null);
                setActiveView('lms_create_course');
              }}
              onEditCourse={(course) => {
                setEditingCourse(course);
                setActiveView('lms_create_course');
              }}
            />
          )}

          {/* LMS Create/Edit Course Page (with Back option) */}
          {isSuperAdmin && activeView === 'lms_create_course' && (
            <LMSCourseEditor
              initialCourse={editingCourse}
              currentUserEmail={currentUser.email}
              onBack={() => {
                setEditingCourse(null);
                setActiveView('lms_management');
              }}
              onSaveSuccess={(savedCourse) => {
                showToast(`Course "${savedCourse.title}" successfully saved to database!`, 'success');
                setEditingCourse(null);
                setActiveView('lms_management');
              }}
            />
          )}

          {/* If user is Super Admin and in admin_dashboard, user_management, audit_logs */}
          {isSuperAdmin &&
            activeView !== 'user_dashboard' &&
            activeView !== 'user_courses' &&
            activeView !== 'lms_management' &&
            activeView !== 'lms_create_course' && (
              <SuperAdminDashboard
                activeView={activeView}
                onOpenCreateUser={handleOpenCreateUser}
                onOpenEditUser={handleOpenEditUser}
                onOpenDeleteUser={handleOpenDeleteUser}
                onViewUserDashboard={handleViewUserDashboard}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                onNavigateToUserManagement={() => {
                  setActiveView('user_management');
                  setActiveSubTab('users');
                }}
                onNavigateToLMS={() => {
                  setActiveView('lms_management');
                }}
              />
            )}

          {/* User Dashboard View */}
          {activeView === 'user_dashboard' && (
            <UserDashboard
              onNavigateToCourses={() => setActiveView('user_courses')}
            />
          )}

          {/* User Courses & Learning View */}
          {activeView === 'user_courses' && (
            <UserCoursesView
              currentUser={currentUser}
              onBackToDashboard={() => setActiveView('user_dashboard')}
            />
          )}
        </main>

      </div>

      {/* Right Side Drawers (Replacing all modal popups) */}
      {/* 1. Create User Right-Side Drawer */}
      <UserDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        mode="create"
        onSubmitCreate={handleCreateSubmit}
        onSubmitUpdate={handleUpdateSubmit}
      />

      {/* 2. Edit User Right-Side Drawer */}
      <UserDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setUserToEdit(null);
        }}
        mode="edit"
        userToEdit={userToEdit}
        onSubmitCreate={handleCreateSubmit}
        onSubmitUpdate={handleUpdateSubmit}
      />

      {/* 3. Delete User Right-Side Drawer */}
      <DeleteDrawer
        isOpen={isDeleteDrawerOpen}
        user={userToDelete}
        onClose={() => {
          setIsDeleteDrawerOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* 4. Supabase Backend Connection Right-Side Drawer */}
      <SupabaseDrawer
        isOpen={isSupabaseDrawerOpen}
        onClose={() => setIsSupabaseDrawerOpen(false)}
        onShowToast={showToast}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
