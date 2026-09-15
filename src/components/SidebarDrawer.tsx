import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  GraduationCap,
  BookOpen
} from 'lucide-react';

export type AppView =
  | 'admin_dashboard'
  | 'user_management'
  | 'audit_logs'
  | 'user_dashboard'
  | 'user_courses'
  | 'lms_management'
  | 'lms_create_course';

interface SidebarDrawerProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  activeSubTab: 'overview' | 'users' | 'audit';
  setActiveSubTab: (tab: 'overview' | 'users' | 'audit') => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  activeView,
  setActiveView,
  activeSubTab,
  setActiveSubTab,
}) => {
  const { currentUser, users, switchUser, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const handleNavClick = (view: AppView, subTab?: 'overview' | 'users' | 'audit') => {
    setActiveView(view);
    if (subTab) {
      setActiveSubTab(subTab);
    } else {
      setActiveSubTab('overview');
    }
  };

  const handleLogout = async () => {
    setActiveView('admin_dashboard');
    setActiveSubTab('overview');
    await logout();
  };

  return (
    <aside
      id="enterprise-collapsible-sidebar-drawer"
      className={`h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Header / Branding & Collapse Toggle */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between min-h-[64px]">
        {!isCollapsed ? (
          <div
            id="sidebar-brand"
            className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
            onClick={() => {
              if (isSuperAdmin) {
                handleNavClick('admin_dashboard', 'overview');
              } else {
                handleNavClick('user_dashboard');
              }
            }}
          >

            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                  Learning Management System
                </span>
              </div>

            </div>
          </div>
        ) : (
          <div
            className=""
            onClick={() => setIsCollapsed(false)}
            title="Enterprise IAM Portal - Expand sidebar"
          >
            
          </div>
        )}

        {/* Collapsible Toggle Option */}
        <button
          id="btn-toggle-sidebar-collapse"
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-blue-600" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Middle Section: Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {/* Main Navigation Group */}
        <div className="space-y-1">
          {isSuperAdmin ? (
            <>
              {/* Dashboard */}
              <button
                id="sidebar-nav-overview"
                type="button"
                onClick={() => handleNavClick('admin_dashboard', 'overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'admin_dashboard'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? 'Dashboard' : undefined}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Dashboard</span>}
              </button>

              {/* User Directory & Management */}
              <button
                id="sidebar-nav-usermgmt"
                type="button"
                onClick={() => handleNavClick('user_management', 'users')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'user_management'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? 'User Management' : undefined}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">User Management</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full ml-2">
                    {users.length}
                  </span>
                )}
              </button>

              {/* LMS Management */}
              <button
                id="sidebar-nav-lms"
                type="button"
                onClick={() => handleNavClick('lms_management')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'lms_management' || activeView === 'lms_create_course'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? 'LMS Management' : undefined}
              >
                <div className="flex items-center space-x-3 truncate">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">LMS Management</span>}
                </div>
              </button>
            </>
          ) : (
            /* Normal User Navigation */
            <div className="space-y-1">
              <button
                id="sidebar-nav-userdash-main"
                type="button"
                onClick={() => handleNavClick('user_dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'user_dashboard'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? 'Dashboard' : undefined}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Dashboard</span>}
              </button>

              <button
                id="sidebar-nav-userdash-courses"
                type="button"
                onClick={() => handleNavClick('user_courses')}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'user_courses'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? 'Courses' : undefined}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">Courses</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: User Identity & Sign Out */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 rounded-full shadow-xs">
                {currentUser?.fullName.charAt(0) || 'U'}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.fullName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <button
              id="sidebar-btn-signout"
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div
              className="w-8 h-8 bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 rounded-full shadow-xs"
              title={`${currentUser?.fullName} (${currentUser?.role})`}
            >
              {currentUser?.fullName.charAt(0) || 'U'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
