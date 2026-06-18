# Turn2Law Intern Tracker — Implementation Plan

## Overview

Build a **production-grade internal team management web app** called "Turn2Law Intern Tracker" — a centralized system to manage 50+ interns across the company: people, tasks, standups, attendance, and performance in one place.

> [!IMPORTANT]
> **Deadline: v1 ships June 20, 2026** (3 days from now). This plan prioritizes functional completeness over perfection.

---

## Tech Stack Decision

Since you said "ignore the tech stacks mentioned, build it perfectly," here's what I'll use:

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 14 (App Router) | Industry standard, SSR, file-based routing |
| **Language** | TypeScript | Type safety across the full app |
| **Styling** | Vanilla CSS (custom design system) | Full control, matches brand exactly |
| **State/Data** | React Context + localStorage | Fast iteration, no backend dependency for v1 |
| **Drag & Drop** | Native HTML5 DnD API | Zero dependencies |
| **Icons** | Lucide React | Clean, consistent icon set |
| **Fonts** | Google Fonts (Inter) | Modern, professional typography |

> [!NOTE]
> **Why localStorage instead of Supabase for v1?** Given the 3-day deadline, shipping a fully functional frontend with realistic mock data is more valuable than wrestling with backend setup. The data layer is abstracted behind a service layer, making it trivial to swap to Supabase/PostgreSQL later. All CRUD operations go through `src/lib/data-service.ts` — one file to change.

---

## Design System

From the PDF specification:

| Token | Value |
|-------|-------|
| **Primary (Navy)** | `#0B1F3A` |
| **Accent (Gold)** | `#C9952A` |
| **Background** | `#F8F9FA` (light surfaces) |
| **Surface** | `#FFFFFF` |
| **Text Primary** | `#0B1F3A` |
| **Text Secondary** | `#6B7280` |
| **Status: Blocked/Overdue** | `#DC2626` (red) |
| **Status: In Progress/Upcoming** | `#F59E0B` (amber) |
| **Status: Done** | `#16A34A` (green) |
| **Status: Review** | `#3B82F6` (blue) |
| **Status: To Do** | `#6B7280` (grey) |
| **Border Radius** | `12px` (cards), `8px` (buttons/inputs) |
| **Font** | Inter (400, 500, 600, 700) |

### Layout Pattern
- **Left sidebar** (collapsible, 260px) with navigation
- **Top bar** with user menu, notifications
- **Main content area** with generous spacing
- Fully responsive: desktop → tablet → mobile

---

## Database Schema (In-Memory / localStorage)

```
users {
  id, name, email, password_hash, role[admin|lead|intern],
  team_id, avatar_url, join_date, status[active|inactive],
  must_reset_password
}

teams {
  id, name, lead_id, description
}

tasks {
  id, title, description, acceptance_criteria,
  assignee_id, team_id, created_by,
  status[todo|in_progress|review|done|blocked],
  priority[low|medium|high],
  due_date, created_at, completed_at
}

task_activity {
  id, task_id, user_id, action,
  from_status, to_status, note, created_at
}

standups {
  id, user_id, date, did_yesterday, doing_today,
  blockers, created_at
}

meetings {
  id, title, scheduled_at, team_id,
  agenda, notes_url, created_by
}

attendance {
  id, meeting_id, user_id,
  status[present|absent|late|excused],
  check_in_time
}

work_log {
  id, user_id, task_id, description,
  link, created_at
}
```

### Role-Based Access (RLS equivalent)
| Role | Access |
|------|--------|
| **Intern** | Own rows + own team view |
| **Lead** | Own team's full data |
| **Admin** | Everything |

---

## Page Structure & Routing

```
/login                    → Email + password login (NO signup link)
/reset-password           → Force password change on first login

/dashboard                → Role-aware home (greeting, my tasks, standup status, upcoming meetings)
/tasks                    → Kanban board (To Do | In Progress | Review | Done | Blocked)
/tasks/[id]               → Task detail (drawer/modal)
/standups                 → Daily standup form + team submission view
/people                   → People directory (cards grid)
/teams                    → Teams directory + management
/meetings                 → Meeting list + scheduling
/meetings/[id]            → Meeting detail + attendance
/performance              → Per-intern and per-team metrics
/admin                    → User management, team management, org overview
/admin/users/new          → Create new user form
```

---

## Proposed Changes

### Component 1: Project Foundation

#### [NEW] `package.json`, `next.config.js`, `tsconfig.json`
- Initialize Next.js 14 project with TypeScript
- Configure path aliases (`@/`)

#### [NEW] `src/styles/globals.css`
- Complete design system: CSS custom properties, reset, typography, layout utilities
- All color tokens, spacing scale, component base styles

#### [NEW] `src/styles/components.css`
- Reusable component styles: buttons, cards, inputs, badges, modals, tables

---

### Component 2: Data Layer

#### [NEW] `src/lib/types.ts`
- All TypeScript interfaces: User, Team, Task, TaskActivity, Standup, Meeting, Attendance

#### [NEW] `src/lib/seed-data.ts`
- Realistic seed data: Admin (Hanush Singh R), 2 Leads, 8 Interns across 3 squads
- Pre-populated tasks, standups, meetings

#### [NEW] `src/lib/data-service.ts`
- Complete CRUD service layer with localStorage persistence
- All business logic: task status transitions, standup submission, attendance marking
- Role-based filtering built in

#### [NEW] `src/lib/auth-context.tsx`
- React Context for auth state
- Login/logout, session persistence, role checks
- Force password reset flow

---

### Component 3: Layout Shell

#### [NEW] `src/app/layout.tsx`
- Root layout with font loading, auth provider

#### [NEW] `src/components/layout/Sidebar.tsx`
- Collapsible left sidebar with navigation items
- Role-aware menu items (Admin sees admin panel)
- Active route highlighting
- User avatar + role at bottom

#### [NEW] `src/components/layout/TopBar.tsx`
- Page title, breadcrumbs
- User menu dropdown (profile, logout)

#### [NEW] `src/components/layout/AppShell.tsx`
- Combines Sidebar + TopBar + main content area
- Responsive behavior

---

### Component 4: Auth System

#### [NEW] `src/app/login/page.tsx`
- Split-screen login: branding left, form right
- Email + password only (NO signup link/button)
- Error handling, loading states

#### [NEW] `src/app/reset-password/page.tsx`
- Force password change on first login
- Redirects to dashboard after reset

---

### Component 5: Dashboard

#### [NEW] `src/app/dashboard/page.tsx`
- Role-aware greeting
- Cards: My Open Tasks, Today's Standup Status, Upcoming Meetings
- Quick stats: tasks this week, completion rate

---

### Component 6: Task Board (⭐ CORE)

#### [NEW] `src/app/tasks/page.tsx`
- Full Kanban board with 5 columns
- Drag & drop between columns
- Filter by assignee, priority, team
- Create task button

#### [NEW] `src/components/tasks/TaskCard.tsx`
- Compact card: title, priority badge, assignee avatar, due date
- Color-coded priority and overdue indicators

#### [NEW] `src/components/tasks/TaskColumn.tsx`
- Column with header (count), drop zone

#### [NEW] `src/components/tasks/TaskDetailDrawer.tsx`
- Slide-over drawer with full task details
- Edit fields inline
- Activity history timeline
- Acceptance criteria display

#### [NEW] `src/components/tasks/CreateTaskModal.tsx`
- Modal form: title, description, acceptance criteria, priority, assignee, due date

---

### Component 7: Standup System (⭐ CORE)

#### [NEW] `src/app/standups/page.tsx`
- Two sections:
  1. **My Standup Form** (if not submitted today)
  2. **Team View** — who submitted, who didn't
- Daily submission: did yesterday, doing today, blockers

#### [NEW] `src/components/standups/StandupForm.tsx`
- Three text areas with labels
- Submit button, edit if already submitted today

#### [NEW] `src/components/standups/TeamStandupView.tsx`
- Grid of cards per team member
- ✅ submitted / ❌ missing indicator
- Expand to read standup content

---

### Component 8: People & Teams

#### [NEW] `src/app/people/page.tsx`
- Grid of user cards: avatar, name, role, team
- Search + filter by role/team

#### [NEW] `src/app/teams/page.tsx`
- Team cards with lead, member count
- Click to view team detail

---

### Component 9: Meetings & Attendance

#### [NEW] `src/app/meetings/page.tsx`
- List of meetings (upcoming + past)
- Create meeting button (Lead/Admin)

#### [NEW] `src/components/meetings/AttendanceMarker.tsx`
- For each meeting: mark members as Present/Absent/Late/Excused
- Shows attendance summary

---

### Component 10: Performance Dashboard

#### [NEW] `src/app/performance/page.tsx`
- Per-intern metrics: tasks completed, on-time rate, standup streak
- Per-team aggregate view
- Contribution feed (recent activity)

---

### Component 11: Admin Panel

#### [NEW] `src/app/admin/page.tsx`
- Org overview: total users, teams, active tasks
- Quick links to user management, team management

#### [NEW] `src/app/admin/users/page.tsx`
- User table with role, team, status
- Create/Edit/Deactivate users

#### [NEW] `src/app/admin/users/new/page.tsx`
- Create user form: name, email, role, team, temporary password
- Auto-sets `must_reset_password: true`

---

## User Review Required

> [!IMPORTANT]
> **Tech stack**: I'm using Next.js + TypeScript + Vanilla CSS with localStorage for data persistence. This gives us the fastest path to a working product by June 20. The data layer is abstracted so Supabase can be plugged in later. Is this acceptable?

> [!IMPORTANT]
> **Brand colors**: The PDF specifies deep navy `#0B1F3A` primary and gold `#C9952A` accent with white surfaces. Your notes mention black background + gold. **I'll follow the PDF spec** (navy + gold + white) since it's the official design doc. Please confirm.

---

## Open Questions

1. **Sample data**: Should I seed specific intern names/teams from your organization, or use realistic placeholder names?
2. **Deployment**: Should I set up Vercel deployment config, or just ensure `npm run dev` works locally?
3. **Mobile**: The PDF says "fully responsive." Should mobile be a priority for v1, or is desktop-first acceptable?

---

## Verification Plan

### Automated Tests
- `npm run build` — ensures zero TypeScript/build errors
- Manual walkthrough of all 7 core modules

### Manual Verification
1. Login with Admin account → verify full access
2. Login with Lead account → verify team-scoped access
3. Login with Intern account → verify own-data access
4. Create task → drag through all Kanban columns → verify activity log
5. Submit standup → verify team view shows submission
6. Create meeting → mark attendance → verify history
7. Check performance metrics update correctly
8. Admin: create new user → verify forced password reset
9. Responsive check at 1440px, 1024px, 768px, 375px
