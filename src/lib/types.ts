// ============================================================
// Turn2Law Intern Tracker — Type Definitions
// Updated for Supabase (no password field in profiles)
// ============================================================

export type UserRole = 'admin' | 'lead' | 'intern';
export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team_id: string | null;
  avatar_url: string;
  status: UserStatus;
  must_reset_password: boolean;
  created_at: string;
}

// Alias for backward compatibility
export type User = Profile;

export interface Team {
  id: string;
  name: string;
  lead_id: string | null;
  description: string;
  created_at?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  assignee_id: string | null;
  team_id: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  note: string;
  created_at: string;
}

export interface Standup {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  did_yesterday: string;
  doing_today: string;
  blockers: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;
  team_id: string | null; // null = org-wide
  agenda: string;
  notes_url: string;
  created_by: string;
  created_at?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  meeting_id: string;
  user_id: string;
  status: AttendanceStatus;
  check_in_time: string | null;
}

export interface WorkLog {
  id: string;
  user_id: string;
  task_id: string | null;
  description: string;
  link: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Derived / Computed Types
// ============================================================

export interface PerformanceMetrics {
  user_id: string;
  tasks_completed: number;
  tasks_total: number;
  on_time_rate: number; // 0–100
  standup_streak: number;
  standups_submitted: number;
  standups_expected: number;
  attendance_rate: number; // 0–100
}

export interface TeamMetrics {
  team_id: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  active_members: number;
  standup_compliance: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// UI Config Constants
// ============================================================

// Column config for Kanban
export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  todo: { label: 'To Do', color: '#6B7280', bgColor: '#F3F4F6' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bgColor: '#FEF3C7' },
  review: { label: 'Review', color: '#3B82F6', bgColor: '#DBEAFE' },
  done: { label: 'Done', color: '#16A34A', bgColor: '#DCFCE7' },
  blocked: { label: 'Blocked', color: '#DC2626', bgColor: '#FEE2E2' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: '#6B7280', bgColor: '#F3F4F6' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: '#FEF3C7' },
  high: { label: 'High', color: '#DC2626', bgColor: '#FEE2E2' },
};

export const ATTENDANCE_STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string }> = {
  present: { label: 'Present', color: '#16A34A' },
  absent: { label: 'Absent', color: '#DC2626' },
  late: { label: 'Late', color: '#F59E0B' },
  excused: { label: 'Excused', color: '#6B7280' },
};
