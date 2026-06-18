// ============================================================
// Turn2Law Intern Tracker — Data Service (localStorage CRUD)
// ============================================================
// All data operations go through this file.
// To migrate to Supabase/PostgreSQL, only this file needs to change.

import {
  User, Team, Task, TaskActivity, Standup, Meeting, Attendance,
  TaskStatus, PerformanceMetrics, TeamMetrics, UserRole,
} from './types';
import { initializeSeedData } from './seed-data';
import { hashPassword, verifyPassword } from './password';

// ── Initialization ──
export function initDataLayer() {
  initializeSeedData();
}

// ── Generic localStorage helpers ──
function getCollection<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function setCollection<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

// ============================================================
// USERS
// ============================================================

export function getUsers(): User[] {
  return getCollection<User>('users');
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function getUsersByTeam(teamId: string): User[] {
  return getUsers().filter(u => u.team_id === teamId && u.status === 'active');
}

export function getUsersByRole(role: UserRole): User[] {
  return getUsers().filter(u => u.role === role && u.status === 'active');
}

export function createUser(data: Omit<User, 'id'>): User {
  const users = getUsers();
  // Hash password before storing
  const hashedData = { ...data };
  if (hashedData.password && !hashedData.password.startsWith('h$')) {
    hashedData.password = hashPassword(hashedData.password);
  }
  const newUser: User = { ...hashedData, id: 'user-' + generateId() };
  users.push(newUser);
  setCollection('users', users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<User>): User | undefined {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return undefined;
  // Hash password if being updated
  const processedUpdates = { ...updates };
  if (processedUpdates.password && !processedUpdates.password.startsWith('h$')) {
    processedUpdates.password = hashPassword(processedUpdates.password);
  }
  users[idx] = { ...users[idx], ...processedUpdates };
  setCollection('users', users);
  return users[idx];
}

export function deactivateUser(id: string): void {
  updateUser(id, { status: 'inactive' });
}

export function authenticateUser(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.status === 'active');
  if (!user) return null;
  // Use verifyPassword for hash comparison (also supports legacy plain-text)
  if (!verifyPassword(password, user.password)) return null;
  return user;
}

// ============================================================
// TEAMS
// ============================================================

export function getTeams(): Team[] {
  return getCollection<Team>('teams');
}

export function getTeamById(id: string): Team | undefined {
  return getTeams().find(t => t.id === id);
}

export function createTeam(data: Omit<Team, 'id'>): Team {
  const teams = getTeams();
  const newTeam: Team = { ...data, id: 'team-' + generateId() };
  teams.push(newTeam);
  setCollection('teams', teams);
  return newTeam;
}

export function updateTeam(id: string, updates: Partial<Team>): Team | undefined {
  const teams = getTeams();
  const idx = teams.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  teams[idx] = { ...teams[idx], ...updates };
  setCollection('teams', teams);
  return teams[idx];
}

export function deleteTeam(id: string): void {
  const teams = getTeams().filter(t => t.id !== id);
  setCollection('teams', teams);
}

// ============================================================
// TASKS
// ============================================================

export function getTasks(): Task[] {
  return getCollection<Task>('tasks');
}

export function getTaskById(id: string): Task | undefined {
  return getTasks().find(t => t.id === id);
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  return getTasks().filter(t => t.status === status);
}

export function getTasksByAssignee(userId: string): Task[] {
  return getTasks().filter(t => t.assignee_id === userId);
}

export function getTasksByTeam(teamId: string): Task[] {
  return getTasks().filter(t => t.team_id === teamId);
}

export function createTask(data: Omit<Task, 'id' | 'created_at' | 'completed_at'>, userId: string): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...data,
    id: 'task-' + generateId(),
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  tasks.push(newTask);
  setCollection('tasks', tasks);

  // Log creation activity
  logTaskActivity(newTask.id, userId, 'Created task', null, newTask.status, '');

  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>, userId: string): Task | undefined {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return undefined;

  const oldTask = { ...tasks[idx] };

  // Handle completion timestamp
  if (updates.status === 'done' && oldTask.status !== 'done') {
    updates.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== 'done') {
    updates.completed_at = null;
  }

  tasks[idx] = { ...tasks[idx], ...updates };
  setCollection('tasks', tasks);

  // Log status change
  if (updates.status && updates.status !== oldTask.status) {
    logTaskActivity(id, userId, 'Status changed', oldTask.status, updates.status, '');
  }

  return tasks[idx];
}

export function moveTask(taskId: string, newStatus: TaskStatus, userId: string): Task | undefined {
  return updateTask(taskId, { status: newStatus }, userId);
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter(t => t.id !== id);
  setCollection('tasks', tasks);
}

// ============================================================
// TASK ACTIVITY
// ============================================================

export function getTaskActivities(): TaskActivity[] {
  return getCollection<TaskActivity>('task_activity');
}

export function getActivitiesByTask(taskId: string): TaskActivity[] {
  return getTaskActivities()
    .filter(a => a.task_id === taskId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getRecentActivities(limit: number = 20): TaskActivity[] {
  return getTaskActivities()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function logTaskActivity(
  taskId: string,
  userId: string,
  action: string,
  fromStatus: TaskStatus | null,
  toStatus: TaskStatus | null,
  note: string
): TaskActivity {
  const activities = getTaskActivities();
  const activity: TaskActivity = {
    id: 'activity-' + generateId(),
    task_id: taskId,
    user_id: userId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    note,
    created_at: new Date().toISOString(),
  };
  activities.push(activity);
  setCollection('task_activity', activities);
  return activity;
}

// ============================================================
// STANDUPS
// ============================================================

export function getStandups(): Standup[] {
  return getCollection<Standup>('standups');
}

export function getStandupsByDate(date: string): Standup[] {
  return getStandups().filter(s => s.date === date);
}

export function getStandupsByUser(userId: string): Standup[] {
  return getStandups()
    .filter(s => s.user_id === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getTodayStandup(userId: string): Standup | undefined {
  const today = new Date().toISOString().split('T')[0];
  return getStandups().find(s => s.user_id === userId && s.date === today);
}

export function submitStandup(
  userId: string,
  didYesterday: string,
  doingToday: string,
  blockers: string
): Standup {
  const standups = getStandups();
  const today = new Date().toISOString().split('T')[0];

  // Check if already submitted today — update if so
  const existingIdx = standups.findIndex(s => s.user_id === userId && s.date === today);

  if (existingIdx !== -1) {
    standups[existingIdx] = {
      ...standups[existingIdx],
      did_yesterday: didYesterday,
      doing_today: doingToday,
      blockers,
    };
    setCollection('standups', standups);
    return standups[existingIdx];
  }

  const standup: Standup = {
    id: 'standup-' + generateId(),
    user_id: userId,
    date: today,
    did_yesterday: didYesterday,
    doing_today: doingToday,
    blockers,
    created_at: new Date().toISOString(),
  };
  standups.push(standup);
  setCollection('standups', standups);
  return standup;
}

export function getStandupStreak(userId: string): number {
  const standups = getStandupsByUser(userId);
  if (standups.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    // Skip weekends
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) continue;

    if (standups.some(s => s.date === dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ============================================================
// MEETINGS
// ============================================================

export function getMeetings(): Meeting[] {
  return getCollection<Meeting>('meetings');
}

export function getMeetingById(id: string): Meeting | undefined {
  return getMeetings().find(m => m.id === id);
}

export function getUpcomingMeetings(): Meeting[] {
  const now = new Date().toISOString();
  return getMeetings()
    .filter(m => m.scheduled_at > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
}

export function getPastMeetings(): Meeting[] {
  const now = new Date().toISOString();
  return getMeetings()
    .filter(m => m.scheduled_at <= now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
}

export function getMeetingsByTeam(teamId: string | null): Meeting[] {
  return getMeetings().filter(m => m.team_id === teamId || m.team_id === null);
}

export function createMeeting(data: Omit<Meeting, 'id'>): Meeting {
  const meetings = getMeetings();
  const meeting: Meeting = { ...data, id: 'meeting-' + generateId() };
  meetings.push(meeting);
  setCollection('meetings', meetings);
  return meeting;
}

export function updateMeeting(id: string, updates: Partial<Meeting>): Meeting | undefined {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.id === id);
  if (idx === -1) return undefined;
  meetings[idx] = { ...meetings[idx], ...updates };
  setCollection('meetings', meetings);
  return meetings[idx];
}

export function deleteMeeting(id: string): void {
  const meetings = getMeetings().filter(m => m.id !== id);
  setCollection('meetings', meetings);
}

// ============================================================
// ATTENDANCE
// ============================================================

export function getAttendance(): Attendance[] {
  return getCollection<Attendance>('attendance');
}

export function getAttendanceByMeeting(meetingId: string): Attendance[] {
  return getAttendance().filter(a => a.meeting_id === meetingId);
}

export function getAttendanceByUser(userId: string): Attendance[] {
  return getAttendance().filter(a => a.user_id === userId);
}

export function markAttendance(meetingId: string, userId: string, status: Attendance['status']): Attendance {
  const records = getAttendance();
  const existingIdx = records.findIndex(a => a.meeting_id === meetingId && a.user_id === userId);

  if (existingIdx !== -1) {
    records[existingIdx] = {
      ...records[existingIdx],
      status,
      check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
    };
    setCollection('attendance', records);
    return records[existingIdx];
  }

  const record: Attendance = {
    id: 'att-' + generateId(),
    meeting_id: meetingId,
    user_id: userId,
    status,
    check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
  };
  records.push(record);
  setCollection('attendance', records);
  return record;
}

// ============================================================
// PERFORMANCE METRICS (Computed)
// ============================================================

export function getUserPerformance(userId: string): PerformanceMetrics {
  const userTasks = getTasksByAssignee(userId);
  const completed = userTasks.filter(t => t.status === 'done');
  const onTime = completed.filter(t => {
    if (!t.completed_at || !t.due_date) return false;
    return new Date(t.completed_at) <= new Date(t.due_date + 'T23:59:59Z');
  });

  const userStandups = getStandupsByUser(userId);
  const streak = getStandupStreak(userId);

  const userAttendance = getAttendanceByUser(userId);
  const presentOrLate = userAttendance.filter(a => a.status === 'present' || a.status === 'late');

  // Calculate business days since join
  const user = getUserById(userId);
  const joinDate = user ? new Date(user.join_date) : new Date();
  const now = new Date();
  let businessDays = 0;
  const cursor = new Date(joinDate);
  while (cursor <= now) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) businessDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    user_id: userId,
    tasks_completed: completed.length,
    tasks_total: userTasks.length,
    on_time_rate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
    standup_streak: streak,
    standups_submitted: userStandups.length,
    standups_expected: Math.min(businessDays, 30), // Cap at 30 days
    attendance_rate: userAttendance.length > 0
      ? Math.round((presentOrLate.length / userAttendance.length) * 100)
      : 100,
  };
}

export function getTeamMetrics(teamId: string): TeamMetrics {
  const teamTasks = getTasksByTeam(teamId);
  const completed = teamTasks.filter(t => t.status === 'done');
  const members = getUsersByTeam(teamId);

  const today = new Date().toISOString().split('T')[0];
  const todayStandups = getStandupsByDate(today);
  const teamStandups = todayStandups.filter(s =>
    members.some(m => m.id === s.user_id)
  );
  const interns = members.filter(m => m.role === 'intern');

  return {
    team_id: teamId,
    total_tasks: teamTasks.length,
    completed_tasks: completed.length,
    completion_rate: teamTasks.length > 0 ? Math.round((completed.length / teamTasks.length) * 100) : 0,
    active_members: members.length,
    standup_compliance: interns.length > 0
      ? Math.round((teamStandups.filter(s => interns.some(i => i.id === s.user_id)).length / interns.length) * 100)
      : 100,
  };
}

// ============================================================
// DATA RESET (for development)
// ============================================================

export function resetAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('users');
  localStorage.removeItem('teams');
  localStorage.removeItem('tasks');
  localStorage.removeItem('task_activity');
  localStorage.removeItem('standups');
  localStorage.removeItem('meetings');
  localStorage.removeItem('attendance');
  localStorage.removeItem('intern_tracker_initialized');
  localStorage.removeItem('intern_tracker_data_version');
  localStorage.removeItem('current_user');
  localStorage.removeItem('reset_user_id');
  initializeSeedData();
}
