// ============================================================
// Turn2Law Intern Tracker — Seed Data
// ============================================================
// Realistic data: Admin (Hanush), 2 Leads, 8 Interns across 3 squads

import { User, Team, Task, TaskActivity, Standup, Meeting, Attendance } from './types';
import { hashPassword } from './password';

// ── Helpers ──
const uuid = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
const today = new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ── Teams ──
export const SEED_TEAMS: Team[] = [
  { id: 'team-tracker', name: 'Tracker Squad', lead_id: 'user-lead-1', description: 'Building the Intern Tracker system' },
  { id: 'team-lawgpt', name: 'LawGPT Squad', lead_id: 'user-lead-2', description: 'Building the LawGPT AI assistant' },
  { id: 'team-docgen', name: 'DocGen Squad', lead_id: 'user-lead-1', description: 'Document generation pipeline' },
];

// ── Users ──
export const SEED_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Hanush Singh R',
    email: 'hanush@turn2law.in',
    password: hashPassword('admin123'),
    role: 'admin',
    team_id: null,
    avatar_url: '',
    join_date: '2025-01-15',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-lead-1',
    name: 'Priya Sharma',
    email: 'priya@turn2law.in',
    password: hashPassword('lead123'),
    role: 'lead',
    team_id: 'team-tracker',
    avatar_url: '',
    join_date: '2025-03-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-lead-2',
    name: 'Arjun Patel',
    email: 'arjun@turn2law.in',
    password: hashPassword('lead123'),
    role: 'lead',
    team_id: 'team-lawgpt',
    avatar_url: '',
    join_date: '2025-03-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-1',
    name: 'Ananya Reddy',
    email: 'ananya@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-tracker',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: true,
  },
  {
    id: 'user-intern-2',
    name: 'Rahul Nair',
    email: 'rahul@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-tracker',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: true,
  },
  {
    id: 'user-intern-3',
    name: 'Kavya Iyer',
    email: 'kavya@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-tracker',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-4',
    name: 'Vikram Das',
    email: 'vikram@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-lawgpt',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-5',
    name: 'Meera Joshi',
    email: 'meera@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-lawgpt',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-6',
    name: 'Siddharth Roy',
    email: 'siddharth@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-lawgpt',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-7',
    name: 'Nisha Gupta',
    email: 'nisha@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-docgen',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
  {
    id: 'user-intern-8',
    name: 'Aditya Kumar',
    email: 'aditya@turn2law.in',
    password: hashPassword('temp123'),
    role: 'intern',
    team_id: 'team-docgen',
    avatar_url: '',
    join_date: '2026-06-01',
    status: 'active',
    must_reset_password: false,
  },
];

// ── Tasks ──
export const SEED_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Build login page',
    description: 'Create the credential login page with email and password fields. No signup button.',
    acceptance_criteria: '1. Email + password form\n2. Error messages for invalid credentials\n3. Redirects to dashboard on success\n4. No signup link visible',
    assignee_id: 'user-intern-1',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'done',
    priority: 'high',
    due_date: daysAgo(2),
    created_at: daysAgo(5) + 'T09:00:00Z',
    completed_at: daysAgo(2) + 'T16:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Design sidebar navigation',
    description: 'Build the left sidebar with all navigation items, role-based visibility, and collapse functionality.',
    acceptance_criteria: '1. All nav items present\n2. Active state highlighting\n3. Admin-only items hidden for non-admins\n4. Collapse/expand toggle',
    assignee_id: 'user-intern-2',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'done',
    priority: 'high',
    due_date: daysAgo(1),
    created_at: daysAgo(4) + 'T09:00:00Z',
    completed_at: daysAgo(1) + 'T14:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Implement Kanban task board',
    description: 'Build the full Kanban board with 5 columns: To Do, In Progress, Review, Done, Blocked. Support drag and drop.',
    acceptance_criteria: '1. Five columns rendered\n2. Tasks display as cards\n3. Drag between columns works\n4. Status change logged to history',
    assignee_id: 'user-intern-1',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'in_progress',
    priority: 'high',
    due_date: daysFromNow(1),
    created_at: daysAgo(3) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-4',
    title: 'Build standup submission form',
    description: 'Create the daily standup form with three fields: what I did, what I\'m doing, blockers.',
    acceptance_criteria: '1. Three text areas\n2. Submit saves to database\n3. Edit allowed same day\n4. Shows success confirmation',
    assignee_id: 'user-intern-3',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'review',
    priority: 'high',
    due_date: today,
    created_at: daysAgo(2) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-5',
    title: 'Task detail drawer with activity log',
    description: 'Build a slide-over drawer showing full task details with inline editing and activity history timeline.',
    acceptance_criteria: '1. Shows all task fields\n2. Edit inline\n3. Activity timeline shows all changes\n4. Slide animation',
    assignee_id: 'user-intern-2',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'todo',
    priority: 'medium',
    due_date: daysFromNow(2),
    created_at: daysAgo(1) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-6',
    title: 'Setup LawGPT API endpoints',
    description: 'Create the FastAPI backend endpoints for LawGPT chat, document analysis, and legal research.',
    acceptance_criteria: '1. /chat endpoint working\n2. /analyze-document endpoint\n3. /search endpoint\n4. Auth middleware applied',
    assignee_id: 'user-intern-4',
    team_id: 'team-lawgpt',
    created_by: 'user-lead-2',
    status: 'in_progress',
    priority: 'high',
    due_date: daysFromNow(3),
    created_at: daysAgo(3) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-7',
    title: 'Train legal NER model',
    description: 'Fine-tune the NER model on Indian legal documents to extract entities like case numbers, dates, parties.',
    acceptance_criteria: '1. F1 score > 0.85\n2. Works on Supreme Court judgments\n3. Exported as ONNX model',
    assignee_id: 'user-intern-5',
    team_id: 'team-lawgpt',
    created_by: 'user-lead-2',
    status: 'in_progress',
    priority: 'medium',
    due_date: daysFromNow(5),
    created_at: daysAgo(5) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-8',
    title: 'Build chat UI component',
    description: 'Build the chat interface for LawGPT with message bubbles, typing indicator, and file upload.',
    acceptance_criteria: '1. User/AI message bubbles\n2. Typing indicator\n3. File upload button\n4. Scroll to bottom on new message',
    assignee_id: 'user-intern-6',
    team_id: 'team-lawgpt',
    created_by: 'user-lead-2',
    status: 'blocked',
    priority: 'medium',
    due_date: daysFromNow(2),
    created_at: daysAgo(2) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-9',
    title: 'Document template system',
    description: 'Build the LaTeX template system for generating legal documents from structured data.',
    acceptance_criteria: '1. Template engine renders PDFs\n2. Supports variables\n3. At least 3 templates\n4. Preview before download',
    assignee_id: 'user-intern-7',
    team_id: 'team-docgen',
    created_by: 'user-lead-1',
    status: 'in_progress',
    priority: 'high',
    due_date: daysFromNow(4),
    created_at: daysAgo(4) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-10',
    title: 'PDF parsing pipeline',
    description: 'Create the pipeline to parse uploaded PDFs, extract text, classify document type, and store metadata.',
    acceptance_criteria: '1. PDF text extraction works\n2. Document classification\n3. Metadata stored in DB\n4. Handles scanned PDFs (OCR)',
    assignee_id: 'user-intern-8',
    team_id: 'team-docgen',
    created_by: 'user-lead-1',
    status: 'todo',
    priority: 'medium',
    due_date: daysFromNow(6),
    created_at: daysAgo(1) + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-11',
    title: 'People directory page',
    description: 'Build the people directory showing all users with avatar, name, role, and team in a grid layout.',
    acceptance_criteria: '1. Grid of user cards\n2. Search by name\n3. Filter by role and team\n4. Click to view profile',
    assignee_id: 'user-intern-3',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'todo',
    priority: 'low',
    due_date: daysFromNow(3),
    created_at: today + 'T09:00:00Z',
    completed_at: null,
  },
  {
    id: 'task-12',
    title: 'Meeting scheduler',
    description: 'Build the meeting scheduling feature with date/time picker, team selection, and agenda field.',
    acceptance_criteria: '1. Create meeting form\n2. Shows in meeting list\n3. Team filter works\n4. Agenda editable',
    assignee_id: 'user-intern-1',
    team_id: 'team-tracker',
    created_by: 'user-lead-1',
    status: 'todo',
    priority: 'low',
    due_date: daysFromNow(4),
    created_at: today + 'T09:00:00Z',
    completed_at: null,
  },
];

// ── Task Activity ──
export const SEED_TASK_ACTIVITY: TaskActivity[] = [
  {
    id: 'activity-1',
    task_id: 'task-1',
    user_id: 'user-lead-1',
    action: 'Created task',
    from_status: null,
    to_status: 'todo',
    note: '',
    created_at: daysAgo(5) + 'T09:00:00Z',
  },
  {
    id: 'activity-2',
    task_id: 'task-1',
    user_id: 'user-intern-1',
    action: 'Status changed',
    from_status: 'todo',
    to_status: 'in_progress',
    note: 'Starting work on login page',
    created_at: daysAgo(4) + 'T10:00:00Z',
  },
  {
    id: 'activity-3',
    task_id: 'task-1',
    user_id: 'user-intern-1',
    action: 'Status changed',
    from_status: 'in_progress',
    to_status: 'review',
    note: 'Ready for review',
    created_at: daysAgo(3) + 'T15:00:00Z',
  },
  {
    id: 'activity-4',
    task_id: 'task-1',
    user_id: 'user-lead-1',
    action: 'Status changed',
    from_status: 'review',
    to_status: 'done',
    note: 'Approved. Looks great!',
    created_at: daysAgo(2) + 'T16:00:00Z',
  },
  {
    id: 'activity-5',
    task_id: 'task-3',
    user_id: 'user-lead-1',
    action: 'Created task',
    from_status: null,
    to_status: 'todo',
    note: '',
    created_at: daysAgo(3) + 'T09:00:00Z',
  },
  {
    id: 'activity-6',
    task_id: 'task-3',
    user_id: 'user-intern-1',
    action: 'Status changed',
    from_status: 'todo',
    to_status: 'in_progress',
    note: 'Starting Kanban implementation',
    created_at: daysAgo(1) + 'T09:30:00Z',
  },
];

// ── Standups ──
export const SEED_STANDUPS: Standup[] = [
  {
    id: 'standup-1',
    user_id: 'user-intern-1',
    date: today,
    did_yesterday: 'Completed login page design and connected auth flow. Fixed edge case with empty password validation.',
    doing_today: 'Starting the Kanban board implementation. Setting up drag and drop columns.',
    blockers: 'None',
    created_at: today + 'T09:15:00Z',
  },
  {
    id: 'standup-2',
    user_id: 'user-intern-3',
    date: today,
    did_yesterday: 'Finished standup form UI and submission logic. Added success toast notification.',
    doing_today: 'Working on team standup view — showing who has submitted and who hasn\'t.',
    blockers: 'Need API endpoint for team standup data — checking with Priya.',
    created_at: today + 'T09:30:00Z',
  },
  {
    id: 'standup-3',
    user_id: 'user-intern-4',
    date: today,
    did_yesterday: 'Set up FastAPI project structure. Created base router and middleware.',
    doing_today: 'Implementing the /chat endpoint with streaming response.',
    blockers: 'None',
    created_at: today + 'T09:45:00Z',
  },
  {
    id: 'standup-4',
    user_id: 'user-intern-7',
    date: today,
    did_yesterday: 'Created two LaTeX templates — NDA and Employment Agreement.',
    doing_today: 'Building the template rendering pipeline with variable substitution.',
    blockers: 'LaTeX compiler not working on Windows — need to switch to Docker.',
    created_at: today + 'T10:00:00Z',
  },
  // Yesterday standups
  {
    id: 'standup-5',
    user_id: 'user-intern-1',
    date: daysAgo(1),
    did_yesterday: 'Fixed auth redirect flow. Added loading spinner to login button.',
    doing_today: 'Completing login page — responsive design pass.',
    blockers: 'None',
    created_at: daysAgo(1) + 'T09:20:00Z',
  },
  {
    id: 'standup-6',
    user_id: 'user-intern-2',
    date: daysAgo(1),
    did_yesterday: 'Built sidebar component with all navigation items.',
    doing_today: 'Adding collapse functionality and active state styling.',
    blockers: 'None',
    created_at: daysAgo(1) + 'T09:10:00Z',
  },
];

// ── Meetings ──
export const SEED_MEETINGS: Meeting[] = [
  {
    id: 'meeting-1',
    title: 'Weekly All-Tech Sync',
    scheduled_at: daysFromNow(2) + 'T15:00:00Z',
    team_id: null,
    agenda: '1. Squad updates\n2. Blockers review\n3. Next week priorities\n4. Demo prep',
    notes_url: '',
    created_by: 'user-admin',
  },
  {
    id: 'meeting-2',
    title: 'Tracker Squad Standup',
    scheduled_at: daysFromNow(1) + 'T10:00:00Z',
    team_id: 'team-tracker',
    agenda: '1. Sprint progress\n2. Kanban board review\n3. Blockers',
    notes_url: '',
    created_by: 'user-lead-1',
  },
  {
    id: 'meeting-3',
    title: 'LawGPT Architecture Review',
    scheduled_at: daysAgo(1) + 'T14:00:00Z',
    team_id: 'team-lawgpt',
    agenda: '1. API design review\n2. Model pipeline discussion\n3. Timeline check',
    notes_url: '',
    created_by: 'user-lead-2',
  },
  {
    id: 'meeting-4',
    title: 'Biweekly Demo — Sprint 1',
    scheduled_at: daysFromNow(5) + 'T16:00:00Z',
    team_id: null,
    agenda: '1. Each squad demos working software\n2. Feedback collection\n3. Sprint 2 planning overview',
    notes_url: '',
    created_by: 'user-admin',
  },
];

// ── Attendance ──
export const SEED_ATTENDANCE: Attendance[] = [
  // Past meeting attendance
  { id: 'att-1', meeting_id: 'meeting-3', user_id: 'user-lead-2', status: 'present', check_in_time: daysAgo(1) + 'T14:00:00Z' },
  { id: 'att-2', meeting_id: 'meeting-3', user_id: 'user-intern-4', status: 'present', check_in_time: daysAgo(1) + 'T14:02:00Z' },
  { id: 'att-3', meeting_id: 'meeting-3', user_id: 'user-intern-5', status: 'late', check_in_time: daysAgo(1) + 'T14:15:00Z' },
  { id: 'att-4', meeting_id: 'meeting-3', user_id: 'user-intern-6', status: 'absent', check_in_time: null },
];

// Data version — increment to force re-seed (e.g., after adding password hashing)
const DATA_VERSION = '2'; // v2: hashed passwords

export function initializeSeedData() {
  if (typeof window === 'undefined') return;
  
  const currentVersion = localStorage.getItem('intern_tracker_data_version');
  
  // Force re-seed if version mismatch or never initialized
  if (!localStorage.getItem('intern_tracker_initialized') || currentVersion !== DATA_VERSION) {
    // Clear old data
    localStorage.removeItem('users');
    localStorage.removeItem('teams');
    localStorage.removeItem('tasks');
    localStorage.removeItem('task_activity');
    localStorage.removeItem('standups');
    localStorage.removeItem('meetings');
    localStorage.removeItem('attendance');
    localStorage.removeItem('current_user');
    localStorage.removeItem('reset_user_id');
    
    // Seed fresh data (with hashed passwords)
    localStorage.setItem('users', JSON.stringify(SEED_USERS));
    localStorage.setItem('teams', JSON.stringify(SEED_TEAMS));
    localStorage.setItem('tasks', JSON.stringify(SEED_TASKS));
    localStorage.setItem('task_activity', JSON.stringify(SEED_TASK_ACTIVITY));
    localStorage.setItem('standups', JSON.stringify(SEED_STANDUPS));
    localStorage.setItem('meetings', JSON.stringify(SEED_MEETINGS));
    localStorage.setItem('attendance', JSON.stringify(SEED_ATTENDANCE));
    localStorage.setItem('intern_tracker_initialized', 'true');
    localStorage.setItem('intern_tracker_data_version', DATA_VERSION);
  }
}

