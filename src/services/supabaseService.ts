import { supabase } from '../lib/supabase';
import { User, AuditLog } from '../types';

export interface SupabaseHealth {
  connected: boolean;
  tableExists: boolean;
  error?: string;
  count?: number;
}

// Map database record to User model (handles both snake_case and camelCase column formats)
export const mapDbRowToUser = (row: any): User => {
  return {
    id: String(row.id),
    fullName: row.full_name ?? row.fullName ?? 'User',
    email: row.email ?? '',
    password: row.password ?? '',
    role: (row.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER') as User['role'],
    status: (row.status === 'INACTIVE' ? 'INACTIVE' : row.status === 'PENDING' ? 'PENDING' : 'ACTIVE') as User['status'],
    department: row.department ?? 'General',
    jobTitle: row.job_title ?? row.jobTitle ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    lastLoginAt: row.last_login_at ?? row.lastLoginAt ?? undefined,
    lastPasswordChange: row.last_password_change ?? row.lastPasswordChange ?? undefined,
  };
};

// Map User model to database row (snake_case)
export const mapUserToDbRow = (user: User) => {
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email.toLowerCase(),
    password: user.password,
    role: user.role,
    status: user.status,
    department: user.department,
    job_title: user.jobTitle || null,
    phone: user.phone || null,
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt || null,
    last_password_change: user.lastPasswordChange || null,
  };
};

// Map database row to AuditLog
export const mapDbRowToAuditLog = (row: any): AuditLog => {
  return {
    id: String(row.id),
    timestamp: row.timestamp ?? new Date().toISOString(),
    actorEmail: row.actor_email ?? row.actorEmail ?? 'system',
    actorRole: (row.actor_role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER') as AuditLog['actorRole'],
    action: row.action,
    targetUserEmail: row.target_user_email ?? row.targetUserEmail ?? '',
    details: row.details ?? '',
  };
};

// Map AuditLog to database row
export const mapAuditLogToDbRow = (log: AuditLog) => {
  return {
    id: log.id,
    timestamp: log.timestamp,
    actor_email: log.actorEmail,
    actor_role: log.actorRole,
    action: log.action,
    target_user_email: log.targetUserEmail,
    details: log.details,
  };
};

export const supabaseService = {
  // Test connection to Supabase and check if users table exists
  async checkHealth(): Promise<SupabaseHealth> {
    try {
      const { data, error, count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (error) {
        // Table not found code PGRST205 or similar
        const isTableMissing = error.code === 'PGRST205' || error.message?.includes('schema cache');
        return {
          connected: true,
          tableExists: !isTableMissing,
          error: error.message,
        };
      }

      return {
        connected: true,
        tableExists: true,
        count: count ?? data?.length ?? 0,
      };
    } catch (err: any) {
      return {
        connected: false,
        tableExists: false,
        error: err.message || 'Failed to connect to Supabase',
      };
    }
  },

  // Fetch all users from Supabase
  async fetchUsers(): Promise<{ users: User[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { users: [], error: error.message };
      }

      return { users: (data || []).map(mapDbRowToUser) };
    } catch (err: any) {
      return { users: [], error: err.message || 'Network error fetching users' };
    }
  },

  // Insert a new user into Supabase
  async createUser(user: User): Promise<{ success: boolean; error?: string }> {
    try {
      const row = mapUserToDbRow(user);
      const { error } = await supabase
        .from('users')
        .insert(row);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Bulk sync initial sample users if table is empty
  async seedInitialUsers(initialUsers: User[]): Promise<boolean> {
    try {
      const rows = initialUsers.map(mapUserToDbRow);
      const { error } = await supabase
        .from('users')
        .upsert(rows, { onConflict: 'id' });

      return !error;
    } catch {
      return false;
    }
  },

  // Update an existing user in Supabase
  async updateUser(userId: string, partial: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {};
      if (partial.fullName !== undefined) payload.full_name = partial.fullName;
      if (partial.email !== undefined) payload.email = partial.email.toLowerCase();
      if (partial.password !== undefined) payload.password = partial.password;
      if (partial.role !== undefined) payload.role = partial.role;
      if (partial.status !== undefined) payload.status = partial.status;
      if (partial.department !== undefined) payload.department = partial.department;
      if (partial.jobTitle !== undefined) payload.job_title = partial.jobTitle;
      if (partial.phone !== undefined) payload.phone = partial.phone;
      if (partial.lastLoginAt !== undefined) payload.last_login_at = partial.lastLoginAt;
      if (partial.lastPasswordChange !== undefined) payload.last_password_change = partial.lastPasswordChange;

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Delete a user from Supabase
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Fetch audit logs
  async fetchAuditLogs(): Promise<{ logs: AuditLog[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        return { logs: [], error: error.message };
      }

      return { logs: (data || []).map(mapDbRowToAuditLog) };
    } catch (err: any) {
      return { logs: [], error: err.message };
    }
  },

  // Insert audit log
  async logAudit(log: AuditLog): Promise<{ success: boolean; error?: string }> {
    try {
      const row = mapAuditLogToDbRow(log);
      const { error } = await supabase
        .from('audit_logs')
        .insert(row);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
