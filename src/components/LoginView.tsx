import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
  Loader2,
  Database,
  UserCheck,
  User,
  ShieldAlert
} from 'lucide-react';
import { UserRole } from '../types';

interface LoginViewProps {
  onSuccessfulLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessfulLogin }) => {
  const { login, signUp, supabaseState } = useAuth();

  // Mode: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('USER');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Sign In submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return;
      }

      if (onSuccessfulLogin) {
        onSuccessfulLogin();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupFullName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }

    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp(
        signupFullName.trim(),
        signupEmail.trim(),
        signupPassword,
        signupRole
      );

      if (!res.success) {
        setErrorMsg(res.message || 'Signup failed. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Account created! Redirecting to dashboard...');
      setTimeout(() => {
        if (onSuccessfulLogin) {
          onSuccessfulLogin();
        }
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected signup error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-view-root"
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">

        <h2 className="mt-4 text-2xl font-bold text-slate-900 tracking-tight">
          Learning Management System
        </h2>



      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          id="auth-card"
          className="bg-white py-7 px-6 border border-slate-200/80 rounded-2xl shadow-sm sm:px-10"
        >
          {/* Segmented Mode Selector: Sign In / Create Account */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              id="tab-auth-signin"
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'signin'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              id="tab-auth-signup"
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'signup'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div
              id="auth-error-alert"
              className="mb-4 bg-red-50 border border-red-200 p-3 text-xs text-red-700 rounded-lg flex items-center space-x-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              id="auth-success-alert"
              className="mb-4 bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 rounded-lg flex items-center space-x-2 animate-in fade-in"
            >
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'signin' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1">
                  Email ID
                </label>
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.corp"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-md shadow-xs transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your corporate password"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-md shadow-xs transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Don't have an account? Sign up with email
                </button>
              </div>
            </form>
          ) : (
            /* 2. SIGN UP FORM */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  id="input-signup-name"
                  type="text"
                  required
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-md shadow-xs transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1">
                  Email ID
                </label>
                <input
                  id="input-signup-email"
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="jane.doe@enterprise.corp"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-md shadow-xs transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                  >
                    {showSignupPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSignupPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  id="input-signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-md shadow-xs transition-all"
                />
              </div>

              {/* User Role Selection Option */}
              <div>
                <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id="btn-signup-role-user"
                    onClick={() => setSignupRole('USER')}
                    className={`p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-all ${
                      signupRole === 'USER'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                        : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        signupRole === 'USER'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {signupRole === 'USER' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>User</span>
                      </div>

                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-signup-role-superadmin"
                    onClick={() => setSignupRole('SUPER_ADMIN')}
                    className={`p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-all ${
                      signupRole === 'SUPER_ADMIN'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600 shadow-xs'
                        : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        signupRole === 'SUPER_ADMIN'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {signupRole === 'SUPER_ADMIN' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Super Admin</span>
                      </div>

                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-signup-submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

