import { User, AuditLog, SystemAnnouncement } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_superadmin',
    fullName: 'Alexander Vance',
    email: 'admin@enterprise.corp',
    password: 'Admin@2026!',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    department: 'Executive Administration',
    jobTitle: 'Principal Super Administrator',
    phone: '+1 (555) 019-2834',
    createdAt: '2025-01-10T08:00:00Z',
    lastLoginAt: new Date().toISOString(),
    lastPasswordChange: '2025-01-10T08:00:00Z',
  },
  {
    id: 'usr_101',
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@enterprise.corp',
    password: 'User@12345',
    role: 'USER',
    status: 'ACTIVE',
    department: 'Engineering',
    jobTitle: 'Senior Systems Engineer',
    phone: '+1 (555) 342-8921',
    createdAt: '2025-02-14T11:20:00Z',
    lastLoginAt: '2026-09-12T14:32:00Z',
    lastPasswordChange: '2025-02-14T11:20:00Z',
  },
  {
    id: 'usr_102',
    fullName: 'Marcus Chen',
    email: 'marcus.c@enterprise.corp',
    password: 'User@12345',
    role: 'USER',
    status: 'ACTIVE',
    department: 'Finance & Compliance',
    jobTitle: 'Senior Financial Analyst',
    phone: '+1 (555) 902-1144',
    createdAt: '2025-03-01T09:15:00Z',
    lastLoginAt: '2026-09-10T16:05:00Z',
    lastPasswordChange: '2025-03-01T09:15:00Z',
  },
  {
    id: 'usr_103',
    fullName: 'Elena Rostova',
    email: 'elena.r@enterprise.corp',
    password: 'User@12345',
    role: 'USER',
    status: 'PENDING',
    department: 'Product Management',
    jobTitle: 'Product Operations Lead',
    phone: '+1 (555) 671-8890',
    createdAt: '2026-09-11T13:45:00Z',
    lastLoginAt: undefined,
    lastPasswordChange: '2026-09-11T13:45:00Z',
  },
  {
    id: 'usr_104',
    fullName: 'David Patel',
    email: 'david.p@enterprise.corp',
    password: 'User@12345',
    role: 'USER',
    status: 'INACTIVE',
    department: 'Operations',
    jobTitle: 'Supply Chain Coordinator',
    phone: '+1 (555) 438-7712',
    createdAt: '2025-04-18T10:00:00Z',
    lastLoginAt: '2026-07-22T08:12:00Z',
    lastPasswordChange: '2025-04-18T10:00:00Z',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-09-14T09:30:00Z',
    actorEmail: 'admin@enterprise.corp',
    actorRole: 'SUPER_ADMIN',
    action: 'LOGIN',
    targetUserEmail: 'admin@enterprise.corp',
    details: 'Super Administrator authenticated from verified enterprise gateway (10.0.4.12)',
  },
  {
    id: 'log_02',
    timestamp: '2026-09-11T13:45:00Z',
    actorEmail: 'admin@enterprise.corp',
    actorRole: 'SUPER_ADMIN',
    action: 'USER_CREATED',
    targetUserEmail: 'elena.r@enterprise.corp',
    details: 'Provisioned enterprise profile for Elena Rostova with role USER and department Product Management',
  },
  {
    id: 'log_03',
    timestamp: '2026-08-30T15:10:00Z',
    actorEmail: 'admin@enterprise.corp',
    actorRole: 'SUPER_ADMIN',
    action: 'STATUS_CHANGED',
    targetUserEmail: 'david.p@enterprise.corp',
    details: 'User status updated to INACTIVE upon scheduled leave',
  }
];

export const DEPARTMENTS = [
  'Engineering',
  'Product Management',
  'Finance & Compliance',
  'Operations',
  'Human Resources',
  'Information Security',
  'Legal Counsel',
  'Executive Administration'
];

export const SYSTEM_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ann_1',
    title: 'Enterprise Single Sign-On & Directory Synchronization',
    content: 'Scheduled maintenance for identity gateway completed with 99.99% uptime compliance.',
    date: '2026-09-12',
    priority: 'LOW',
  },
  {
    id: 'ann_2',
    title: 'Quarterly Security Access Review Notice',
    content: 'All departmental users are requested to verify their profile contact information and security questions.',
    date: '2026-09-08',
    priority: 'MEDIUM',
  },
];
