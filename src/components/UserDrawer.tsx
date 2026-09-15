import React, { useState, useEffect } from 'react';
import { User, CreateUserData, UpdateUserData, UserStatus, UserRole } from '../types';
import { DEPARTMENTS } from '../mockData';
import {
  X,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  Check,
  Shield,
  User as UserIcon,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  userToEdit?: User | null;
  onSubmitCreate: (data: CreateUserData) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  onSubmitUpdate: (userId: string, data: UpdateUserData) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  userToEdit,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [changePasswordToggle, setChangePasswordToggle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setShowPassword(false);
      setIsSubmitting(false);
      if (mode === 'edit' && userToEdit) {
        setFullName(userToEdit.fullName);
        setEmail(userToEdit.email);
        setPassword('');
        setRole(userToEdit.role || 'USER');
        setDepartment(userToEdit.department || DEPARTMENTS[0]);
        setJobTitle(userToEdit.jobTitle || '');
        setStatus(userToEdit.status);
        setChangePasswordToggle(false);
      } else {
        setFullName('');
        setEmail('');
        setPassword(generateStrongPassword());
        setRole('USER');
        setDepartment(DEPARTMENTS[0]);
        setJobTitle('Team Member');
        setStatus('ACTIVE');
        setChangePasswordToggle(true);
      }
    }
  }, [isOpen, mode, userToEdit]);

  if (!isOpen) return null;

  function generateStrongPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let res = 'Corp@';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid email ID is required.');
      return;
    }

    if (mode === 'create') {
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await onSubmitCreate({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          department,
          jobTitle: jobTitle.trim() || (role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Enterprise Member'),
          status,
        });

        if (!res.success) {
          setErrorMsg(res.message || 'Failed to create user.');
          setIsSubmitting(false);
          return;
        }
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to create user.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (mode === 'edit' && userToEdit) {
      const updatePayload: UpdateUserData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        department: userToEdit.department,
        jobTitle: userToEdit.jobTitle,
        status: userToEdit.status,
      };

      if (changePasswordToggle && password.trim()) {
        if (password.length < 6) {
          setErrorMsg('New password must be at least 6 characters.');
          return;
        }
        updatePayload.password = password;
      }

      setIsSubmitting(true);
      try {
        const res = await onSubmitUpdate(userToEdit.id, updatePayload);
        if (!res.success) {
          setErrorMsg(res.message || 'Failed to update user.');
          setIsSubmitting(false);
          return;
        }
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update user.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div id="user-drawer-root" className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay (flat, semi-transparent) */}
      <div
        id="user-drawer-backdrop"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Right-side Draw Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          id="user-side-drawer-panel"
          className={`w-screen ${
            isExpanded ? 'max-w-xl' : 'max-w-md'
          } bg-white border-l border-slate-200/80 shadow-2xl flex flex-col justify-between transition-all duration-200`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 text-white flex items-center justify-center font-bold rounded-lg shadow-xs">
                {mode === 'create' ? <UserIcon className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  {mode === 'create' ? 'Create User Account' : 'Edit User Profile'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === 'create'
                    ? 'Fill full name, email ID, and password credentials'
                    : `Updating credentials for ${userToEdit?.fullName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                id="btn-toggle-user-drawer-width"
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                title={isExpanded ? 'Collapse width' : 'Expand width'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                id="btn-close-user-drawer"
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Form Body */}
          <form id="form-user-drawer" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <div
                id="drawer-error-alert"
                className="flex items-center space-x-2 bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                id="drawer-input-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jonathan Reynolds"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition-all"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email ID <span className="text-red-600">*</span>
              </label>
              <input
                id="drawer-input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. j.reynolds@enterprise.corp"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition-all"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {mode === 'create' ? (
                    <>
                      User Password <span className="text-red-600">*</span>
                    </>
                  ) : (
                    'User Password'
                  )}
                </label>

                {mode === 'edit' && (
                  <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      id="drawer-checkbox-change-password"
                      type="checkbox"
                      checked={changePasswordToggle}
                      onChange={(e) => setChangePasswordToggle(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Reset Password</span>
                  </label>
                )}
              </div>

              {(mode === 'create' || changePasswordToggle) && (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <input
                      id="drawer-input-password"
                      type={showPassword ? 'text' : 'password'}
                      required={mode === 'create'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'create' ? 'Set user password' : 'Enter new replacement password'}
                      className="w-full pl-3.5 pr-20 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition-all"
                    />
                    <div className="absolute right-2 flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassword(generateStrongPassword())}
                        className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors"
                        title="Generate strong password"
                      >
                        <KeyRound className="w-3 h-3 inline mr-1 text-blue-600" />
                        Auto
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {mode === 'edit' && !changePasswordToggle && (
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-md text-xs text-slate-500 flex items-center justify-between">
                  <span>Current password unchanged</span>
                  <span className="text-slate-400">••••••••••••</span>
                </div>
              )}
            </div>

            {/* Account Role Option */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Role <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="drawer-btn-role-user"
                  onClick={() => setRole('USER')}
                  className={`p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-all ${
                    role === 'USER'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                      : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      role === 'USER'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-400 bg-white'
                    }`}
                  >
                    {role === 'USER' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center space-x-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>User</span>
                    </div>

                  </div>
                </button>

                <button
                  type="button"
                  id="drawer-btn-role-superadmin"
                  onClick={() => setRole('SUPER_ADMIN')}
                  className={`p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-all ${
                    role === 'SUPER_ADMIN'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                      : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      role === 'SUPER_ADMIN'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-400 bg-white'
                    }`}
                  >
                    {role === 'SUPER_ADMIN' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Super Admin</span>
                    </div>

                  </div>
                </button>
              </div>
            </div>

            {/* Information Notice */}

          </form>

          {/* Drawer Footer Actions */}
          <div className="p-5 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="drawer-btn-cancel"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="form-user-drawer"
              id="drawer-btn-submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-all flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{mode === 'create' ? 'Create User' : 'Save Changes'}</span>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
