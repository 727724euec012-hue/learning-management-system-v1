import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SUPABASE_PROJECT_NAME,
  SUPABASE_PROJECT_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SETUP_SQL,
} from '../lib/supabase';

interface SupabaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const SupabaseDrawer: React.FC<SupabaseDrawerProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { supabaseState, refreshFromSupabase, seedSupabase, users } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFromSupabase();
    setIsRefreshing(false);
    onShowToast('Refreshed connection with Supabase backend', 'info');
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    const res = await seedSupabase();
    setIsSyncing(false);
    if (res.success) {
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    onShowToast('Supabase SQL schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div
      id="supabase-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        id="supabase-drawer-panel"
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden transform transition-transform"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Supabase Backend</h2>
              <p className="text-xs text-slate-500">Project: {SUPABASE_PROJECT_NAME}</p>
            </div>
          </div>
          <button
            id="btn-close-supabase-drawer"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Connection Status
              </span>
              {supabaseState.status === 'connected' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  Connected & Synced
                </span>
              ) : supabaseState.status === 'table_missing' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                  Tables Setup Required
                </span>
              ) : supabaseState.status === 'checking' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <RefreshCw className="w-3 h-3 mr-1 text-blue-600 animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                  Connection Error
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              {supabaseState.status === 'connected' && (
                <p className="text-emerald-700">
                  Application is linked to Supabase project <span className="font-semibold">{SUPABASE_PROJECT_NAME}</span>. User directory operations are synchronizing in real time.
                </p>
              )}
              {supabaseState.status === 'table_missing' && (
                <p className="text-amber-700">
                  Successfully connected to Supabase URL. The <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px] font-semibold">public.users</code> table has not been created yet. Copy and run the SQL below in your Supabase SQL Editor.
                </p>
              )}
              {supabaseState.status === 'error' && (
                <p className="text-rose-700">
                  {supabaseState.error || 'Failed to communicate with Supabase REST API.'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                id="btn-recheck-supabase"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                id="btn-sync-to-supabase"
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Server className="w-3.5 h-3.5 text-blue-100" />
                <span>{isSyncing ? 'Syncing...' : `Sync (${users.length}) to Supabase`}</span>
              </button>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Project Configuration (Hardcoded)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block">Project Name</span>
                <span className="font-semibold text-slate-800">{SUPABASE_PROJECT_NAME}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Project ID</span>
                <span className="font-semibold text-slate-800">{SUPABASE_PROJECT_ID}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Project URL</span>
                <a
                  href={SUPABASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center space-x-1 break-all"
                >
                  <span>{SUPABASE_URL}</span>
                  <ExternalLink className="w-3 h-3 inline shrink-0" />
                </a>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Public API Key</span>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-blue-600 hover:text-blue-800"
                  >
                    {showKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <div className="mt-0.5 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700 break-all text-[11px]">
                  {showKey ? SUPABASE_ANON_KEY : `${SUPABASE_ANON_KEY.substring(0, 16)}••••••••••••••••`}
                </div>
              </div>
            </div>
          </div>

          {/* SQL Setup Schema */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Database Tables Schema</h3>
                <p className="text-[11px] text-slate-500">Run this query in your Supabase SQL editor</p>
              </div>
              <button
                type="button"
                id="btn-copy-supabase-sql"
                onClick={handleCopySql}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] overflow-x-auto max-h-56 leading-relaxed">
              <pre><code>{SUPABASE_SETUP_SQL}</code></pre>
            </div>

            <div className="pt-1">
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <span>Open Supabase SQL Editor in browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {users.length} directory accounts managed
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
