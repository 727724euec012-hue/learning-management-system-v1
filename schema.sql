-- ==============================================================================
-- Enterprise IAM & User Management Database Schema
-- Compatible with PostgreSQL & Supabase
-- ==============================================================================

-- 1. USERS TABLE
-- Stores directory user accounts, roles, statuses, and authentication metadata
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'SUPER_ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
  department TEXT DEFAULT 'General',
  job_title TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_password_change TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow access for anon & authenticated roles)
DROP POLICY IF EXISTS "Allow public anon access on users" ON public.users;
CREATE POLICY "Allow public anon access on users"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. AUDIT LOGS TABLE
-- Records enterprise activity, user provisioning, security updates, and logins
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (actor_role IN ('USER', 'SUPER_ADMIN')),
  action TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  details TEXT NOT NULL
);

-- Performance Indexes for audit trail searches & filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow read and insert for audit logs)
DROP POLICY IF EXISTS "Allow public anon access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public anon access on audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 3. SYSTEM ANNOUNCEMENTS TABLE
-- Broadcast notifications displayed in the administrative and user dashboards
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  priority TEXT NOT NULL DEFAULT 'LOW' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow read and write access on announcements)
DROP POLICY IF EXISTS "Allow public anon access on system_announcements" ON public.system_announcements;
CREATE POLICY "Allow public anon access on system_announcements"
  ON public.system_announcements
  FOR ALL
  USING (true)
  WITH CHECK (true);

