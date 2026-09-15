import React, { useState } from 'react';
import { User } from '../types';
import {
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  ShieldAlert,
  Calendar,
  Mail,
  Building,
  User as UserIcon
} from 'lucide-react';

interface DeleteDrawerProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: (userId: string) => void;
}

export const DeleteDrawer: React.FC<DeleteDrawerProps> = ({
  isOpen,
  user,
  onClose,
  onConfirm,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen || !user) return null;

  const handleConfirmDelete = () => {
    onConfirm(user.id);
    onClose();
    setConfirmInput('');
  };

  return (
    <div id="delete-drawer-root" className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop overlay (flat, semi-transparent) */}
      <div
        id="delete-drawer-backdrop"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Right-side Draw Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          id="delete-side-drawer-panel"
          className={`w-screen ${
            isExpanded ? 'max-w-xl' : 'max-w-md'
          } bg-white border-l border-slate-200/80 shadow-2xl flex flex-col justify-between transition-all duration-200`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-200/80 bg-red-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-red-600 text-white flex items-center justify-center font-bold rounded-lg shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Delete User Account
                </h2>
                <p className="text-xs text-red-700 font-medium mt-0.5">
                  Irreversible Directory Revocation
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Collapsible / Width Toggle Option */}
              <button
                id="btn-toggle-delete-drawer-width"
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                title={isExpanded ? 'Collapse width' : 'Expand width'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                id="btn-close-delete-drawer"
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Critical Warning Alert */}
            <div
              id="delete-warning-banner"
              className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-800 rounded-lg space-y-1.5"
            >
              <div className="flex items-center space-x-2 font-bold text-red-900">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>Permanent Enterprise De-provisioning</span>
              </div>
              <p className="leading-relaxed">
                Deleting this corporate user permanently removes their access credentials, personal dashboard, and directory profile. This action cannot be undone.
              </p>
            </div>

            {/* Target User Details Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Target User Profile
              </label>
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-500">Full Name:</span>
                  </div>
                  <span className="font-bold text-slate-900">{user.fullName}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Email ID:</span>
                  </div>
                  <span className="text-slate-800 font-medium">{user.email}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Department:</span>
                  </div>
                  <span className="text-slate-800 font-medium">{user.department}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Job Title:</span>
                  <span className="text-slate-800 font-medium">{user.jobTitle || 'Team Member'}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500">Directory Role:</span>
                  <span className="uppercase font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Created:</span>
                  </div>
                  <span className="text-slate-600 text-[11px]">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Safety Confirmation Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Type <span className="text-red-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                id="drawer-delete-confirm-input"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 shadow-xs transition-all"
              />
            </div>

            <div className="p-3.5 bg-slate-100/80 border border-slate-200/80 rounded-lg text-[11px] text-slate-600 leading-relaxed">
              <strong>Audit Record:</strong> This deletion event will be automatically recorded in the enterprise SOC-2 audit logs under Super Admin actions.
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-5 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-end space-x-3">
            <button
              type="button"
              id="drawer-btn-cancel-delete"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="drawer-btn-confirm-delete"
              disabled={confirmInput.trim().toUpperCase() !== 'DELETE'}
              onClick={handleConfirmDelete}
              className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white border rounded-lg shadow-xs flex items-center space-x-2 transition-all ${
                confirmInput.trim().toUpperCase() === 'DELETE'
                  ? 'bg-red-600 border-red-700 hover:bg-red-700 cursor-pointer'
                  : 'bg-red-300 border-red-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Permanently Delete</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
