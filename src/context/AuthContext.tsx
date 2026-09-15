import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuditLog, CreateUserData, UpdateUserData, UserRole } from '../types';
import { INITIAL_USERS, INITIAL_AUDIT_LOGS } from '../mockData';
import { supabaseService, SupabaseHealth, mapDbRowToUser } from '../services/supabaseService';
import { supabase, SUPABASE_PROJECT_NAME, SUPABASE_PROJECT_ID, SUPABASE_URL } from '../lib/supabase';

const USERS_STORAGE_KEY = 'enterprise_portal_users_v1';
const AUDIT_STORAGE_KEY = 'enterprise_portal_audit_v1';
const SESSION_STORAGE_KEY = 'enterprise_portal_session_v2';

export type SupabaseConnectionState = 'checking' | 'connected' | 'table_missing' | 'error';

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  auditLogs: AuditLog[];
  supabaseState: {
    status: SupabaseConnectionState;
    projectName: string;
    projectId: string;
    url: string;
    error?: string;
    isTableReady: boolean;
  };
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (
    fullName: string,
    email: string,
    pass: string,
    role?: 'USER' | 'SUPER_ADMIN',
    department?: string
  ) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  createUser: (data: CreateUserData) => Promise<{ success: boolean; message?: string; user?: User }>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (userId: string, newPass: string) => Promise<{ success: boolean; message?: string }>;
  toggleUserStatus: (userId: string) => Promise<void>;
  resetAllData: () => void;
  refreshFromSupabase: () => Promise<void>;
  seedSupabase: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // Clear legacy hardcoded mock session so default page is strictly Login & Sign Up
      localStorage.removeItem('enterprise_portal_session_v1');
      localStorage.removeItem('enterprise_portal_session_v2');
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        return JSON.parse(savedSession);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [supabaseState, setSupabaseState] = useState<{
    status: SupabaseConnectionState;
    projectName: string;
    projectId: string;
    url: string;
    error?: string;
    isTableReady: boolean;
  }>({
    status: 'checking',
    projectName: SUPABASE_PROJECT_NAME,
    projectId: SUPABASE_PROJECT_ID,
    url: SUPABASE_URL,
    isTableReady: false,
  });

  // Sync users to storage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Storage error for users', e);
    }
  }, [users]);

  // Sync audit logs to storage
  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Storage error for audit logs', e);
    }
  }, [auditLogs]);

  // Sync current user session
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Storage error for session', e);
    }
  }, [currentUser]);

  // Fetch users from Supabase and synchronize
  const refreshFromSupabase = useCallback(async () => {
    const health: SupabaseHealth = await supabaseService.checkHealth();

    if (!health.connected) {
      setSupabaseState(prev => ({
        ...prev,
        status: 'error',
        error: health.error || 'Connection failed',
        isTableReady: false,
      }));
      return;
    }

    if (!health.tableExists) {
      setSupabaseState(prev => ({
        ...prev,
        status: 'table_missing',
        error: 'Supabase connected! The "users" table is not yet created in the schema.',
        isTableReady: false,
      }));
      return;
    }

    setSupabaseState(prev => ({
      ...prev,
      status: 'connected',
      error: undefined,
      isTableReady: true,
    }));

    // Fetch from Supabase
    const { users: remoteUsers, error: usersErr } = await supabaseService.fetchUsers();
    if (!usersErr && remoteUsers.length > 0) {
      setUsers(remoteUsers);
    } else if (!usersErr && remoteUsers.length === 0) {
      // If Supabase table exists but is empty, automatically seed initial users
      await supabaseService.seedInitialUsers(INITIAL_USERS);
      setUsers(INITIAL_USERS);
    }

    const { logs: remoteLogs, error: logsErr } = await supabaseService.fetchAuditLogs();
    if (!logsErr && remoteLogs.length > 0) {
      setAuditLogs(remoteLogs);
    }
  }, []);

  // Initial Supabase connection check and real-time subscription
  useEffect(() => {
    refreshFromSupabase();

    // Subscribe to real-time changes on the 'users' table
    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        supabaseService.fetchUsers().then(res => {
          if (!res.error && res.users.length > 0) {
            setUsers(res.users);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshFromSupabase]);

  const addAuditLog = (
    action: AuditLog['action'],
    targetUserEmail: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actorEmail: currentUser ? currentUser.email : 'system@enterprise.corp',
      actorRole: currentUser ? currentUser.role : 'SUPER_ADMIN',
      action,
      targetUserEmail,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Asynchronously sync audit log to Supabase if table exists
    if (supabaseState.isTableReady) {
      supabaseService.logAudit(newLog).catch(console.error);
    }
  };

  const signUp = async (
    fullName: string,
    email: string,
    pass: string,
    role: 'USER' | 'SUPER_ADMIN' = 'USER',
    department: string = 'General'
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
    if (!fullName.trim()) {
      return { success: false, message: 'Full name is required.' };
    }
    if (!email.trim() || !email.includes('@')) {
      return { success: false, message: 'A valid email address is required.' };
    }
    if (!pass || pass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Primary: Register user in Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: pass,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
            department: department,
          },
        },
      });

      if (authError) {
        return { success: false, message: authError.message };
      }

      const authId = authData.user?.id || 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

      const newUser: User = {
        id: authId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: pass,
        role: role,
        status: 'ACTIVE',
        department: department || 'General',
        jobTitle: role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Team Member',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        lastPasswordChange: new Date().toISOString(),
      };

      // Add to local users state
      setUsers(prev => {
        const filtered = prev.filter(u => u.email.toLowerCase() !== normalizedEmail);
        return [newUser, ...filtered];
      });

      // Set current user session immediately
      setCurrentUser(newUser);

      addAuditLog('USER_CREATED', newUser.email, `New user registered: "${newUser.fullName}" (${newUser.role}) via Supabase Auth`);

      // Persist to Supabase public.users table if created
      if (supabaseState.isTableReady) {
        supabaseService.createUser(newUser).catch(console.error);
      }

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, message: err.message || 'Signup failed due to network error.' };
    }
  };

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!email.trim() || !pass) {
      return { success: false, message: 'Corporate Email and password are required.' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Primary: Authenticate with Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pass,
      });

      if (!authError && authData.user) {
        // Authenticated with Supabase Auth!
        let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

        if (!user) {
          // Check if user exists in Supabase public.users table
          if (supabaseState.isTableReady) {
            try {
              const { data: dbRow } = await supabase
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();
              if (dbRow) {
                user = mapDbRowToUser(dbRow);
              }
            } catch (e) {
              console.warn('Error querying users table:', e);
            }
          }

          if (!user) {
            const meta = authData.user.user_metadata || {};
            user = {
              id: authData.user.id,
              fullName: meta.full_name || authData.user.email?.split('@')[0] || 'User',
              email: normalizedEmail,
              password: pass,
              role: meta.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER',
              status: 'ACTIVE',
              department: meta.department || 'General',
              jobTitle: meta.job_title || (meta.role === 'SUPER_ADMIN' ? 'Administrator' : 'Team Member'),
              createdAt: authData.user.created_at || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              lastPasswordChange: new Date().toISOString(),
            };
          }
          setUsers(prev => [user!, ...prev]);

          if (supabaseState.isTableReady) {
            supabaseService.createUser(user).catch(console.error);
          }
        } else {
          user = {
            ...user,
            lastLoginAt: new Date().toISOString(),
          };
          setUsers(prev => prev.map(u => (u.id === user!.id ? user! : u)));

          if (supabaseState.isTableReady) {
            supabaseService.updateUser(user.id, { lastLoginAt: user.lastLoginAt }).catch(console.error);
          }
        }

        if (user.status === 'INACTIVE') {
          return { success: false, message: 'This enterprise account is suspended. Contact administrator.' };
        }

        setCurrentUser(user);
        addAuditLog('LOGIN', user.email, `User ${user.fullName} authenticated via Supabase Auth`);
        return { success: true };
      }

      // If Supabase Auth failed (e.g., pre-seeded demo accounts or local user):
      let localUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

      // If not in local React state, check Supabase database table
      if (!localUser && supabaseState.isTableReady) {
        try {
          const { data: dbRow } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();
          if (dbRow) {
            localUser = mapDbRowToUser(dbRow);
            setUsers(prev => [localUser!, ...prev]);
          }
        } catch (e) {
          console.warn('Error finding user in db table:', e);
        }
      }

      if (localUser && localUser.password === pass) {
        if (localUser.status === 'INACTIVE') {
          return { success: false, message: 'This enterprise account is suspended. Contact Super Administrator.' };
        }

        // Auto-register into Supabase Auth in background so future logins hit Supabase directly
        supabase.auth.signUp({
          email: normalizedEmail,
          password: pass,
          options: {
            data: {
              full_name: localUser.fullName,
              role: localUser.role,
              department: localUser.department,
            },
          },
        }).catch(() => {});

        const updatedUser = {
          ...localUser,
          lastLoginAt: new Date().toISOString(),
        };

        setUsers(prev => prev.map(u => (u.id === localUser!.id ? updatedUser : u)));
        setCurrentUser(updatedUser);
        addAuditLog('LOGIN', localUser.email, `User ${localUser.fullName} successfully authenticated`);

        if (supabaseState.isTableReady) {
          supabaseService.updateUser(localUser.id, { lastLoginAt: updatedUser.lastLoginAt }).catch(console.error);
        }

        return { success: true };
      }

      // Return Supabase error or invalid credentials
      return {
        success: false,
        message: authError?.message || 'Invalid email or password. Please verify credentials.',
      };
    } catch (err: any) {
      // Fallback to local directory
      let localUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!localUser && supabaseState.isTableReady) {
        try {
          const { data: dbRow } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();
          if (dbRow) {
            localUser = mapDbRowToUser(dbRow);
            setUsers(prev => [localUser!, ...prev]);
          }
        } catch {}
      }

      if (localUser && localUser.password === pass) {
        if (localUser.status === 'INACTIVE') {
          return { success: false, message: 'This enterprise account is suspended. Contact administrator.' };
        }
        setCurrentUser(localUser);
        return { success: true };
      }
      return { success: false, message: err.message || 'Authentication failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut notice:', e);
    }
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('enterprise_portal_session_v1');
  };

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const createUser = async (data: CreateUserData): Promise<{ success: boolean; message?: string; user?: User }> => {
    if (!data.fullName.trim()) {
      return { success: false, message: 'Full name is required.' };
    }
    if (!data.email.trim() || !data.email.includes('@')) {
      return { success: false, message: 'A valid email ID is required.' };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const exists = users.some(u => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (exists) {
      return { success: false, message: 'A user with this email address already exists.' };
    }

    const assignedRole: UserRole = data.role || 'USER';
    const newUser: User = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: assignedRole,
      status: data.status || 'ACTIVE',
      department: data.department || 'Engineering',
      jobTitle: data.jobTitle || (assignedRole === 'SUPER_ADMIN' ? 'Super Administrator' : 'Team Member'),
      createdAt: new Date().toISOString(),
      lastPasswordChange: new Date().toISOString(),
    };

    // Register in Supabase Auth so this user can log in with their credentials
    try {
      const { data: authData } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
            role: newUser.role,
            department: newUser.department,
          },
        },
      });
      if (authData?.user?.id) {
        newUser.id = authData.user.id;
      }
    } catch (err) {
      console.warn('Background Supabase Auth signup notice:', err);
    }

    // Update local state
    setUsers(prev => [newUser, ...prev]);
    addAuditLog('USER_CREATED', newUser.email, `Created user account for "${newUser.fullName}" (${newUser.role}) with status ${newUser.status}`);

    // Persist to Supabase if table is ready
    if (supabaseState.isTableReady) {
      const res = await supabaseService.createUser(newUser);
      if (!res.success) {
        console.warn('Supabase sync warning:', res.error);
      }
    }

    return { success: true, user: newUser };
  };

  const updateUser = async (userId: string, data: UpdateUserData): Promise<{ success: boolean; message?: string }> => {
    const existing = users.find(u => u.id === userId);
    if (!existing) {
      return { success: false, message: 'User not found.' };
    }

    if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = users.some(u => u.id !== userId && u.email.toLowerCase() === data.email.toLowerCase());
      if (emailTaken) {
        return { success: false, message: 'Email address is already in use by another user.' };
      }
    }

    const updated: User = {
      ...existing,
      fullName: data.fullName.trim() || existing.fullName,
      email: data.email ? data.email.trim().toLowerCase() : existing.email,
      password: data.password ? data.password : existing.password,
      role: data.role !== undefined ? data.role : existing.role,
      department: data.department !== undefined ? data.department : existing.department,
      jobTitle: data.jobTitle !== undefined ? data.jobTitle : existing.jobTitle,
      status: data.status !== undefined ? data.status : existing.status,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      lastPasswordChange: data.password ? new Date().toISOString() : existing.lastPasswordChange,
    };

    setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));

    if (currentUser?.id === userId) {
      setCurrentUser(updated);
    }

    addAuditLog('USER_UPDATED', updated.email, `Modified profile details for user "${updated.fullName}"`);

    // Sync to Supabase
    if (supabaseState.isTableReady) {
      await supabaseService.updateUser(userId, updated);
    }

    return { success: true };
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }

    if (target.role === 'SUPER_ADMIN') {
      return { success: false, message: 'The primary Super Administrator account cannot be deleted.' };
    }

    setUsers(prev => prev.filter(u => u.id !== userId));

    if (currentUser?.id === userId) {
      const sa = users.find(u => u.role === 'SUPER_ADMIN') || INITIAL_USERS[0];
      setCurrentUser(sa);
    }

    addAuditLog('USER_DELETED', target.email, `Permanently removed user account for "${target.fullName}" (${target.email})`);

    // Sync to Supabase
    if (supabaseState.isTableReady) {
      await supabaseService.deleteUser(userId);
    }

    return { success: true };
  };

  const changePassword = async (userId: string, newPass: string): Promise<{ success: boolean; message?: string }> => {
    if (!newPass || newPass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const updated = {
      ...user,
      password: newPass,
      lastPasswordChange: new Date().toISOString(),
    };

    setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));

    if (currentUser?.id === userId) {
      setCurrentUser(updated);
    }

    addAuditLog('PASSWORD_CHANGED', user.email, `Password updated for user "${user.fullName}"`);

    // Sync to Supabase
    if (supabaseState.isTableReady) {
      await supabaseService.updateUser(userId, {
        password: updated.password,
        lastPasswordChange: updated.lastPasswordChange,
      });
    }

    return { success: true };
  };

  const toggleUserStatus = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target || target.role === 'SUPER_ADMIN') return;

    const newStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...target, status: newStatus as User['status'] };

    setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(updated);
    }

    addAuditLog('STATUS_CHANGED', target.email, `Changed status from ${target.status} to ${newStatus}`);

    // Sync to Supabase
    if (supabaseState.isTableReady) {
      await supabaseService.updateUser(userId, { status: updated.status });
    }
  };

  const seedSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const success = await supabaseService.seedInitialUsers(users);
    if (success) {
      await refreshFromSupabase();
      return { success: true, message: `Successfully synced ${users.length} users to Supabase!` };
    }
    return {
      success: false,
      message: 'Failed to sync users. Ensure the "users" table has been created in your Supabase SQL editor.',
    };
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    refreshFromSupabase();
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        auditLogs,
        supabaseState,
        login,
        signUp,
        logout,
        switchUser,
        createUser,
        updateUser,
        deleteUser,
        changePassword,
        toggleUserStatus,
        resetAllData,
        refreshFromSupabase,
        seedSupabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
