// GET /api/seed — Full dummy data seed (run AFTER /api/migrate confirms schema_ready)
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const T1 = '00000000-0000-0000-0000-000000000001';
const T2 = '00000000-0000-0000-0000-000000000002';
const T3 = '00000000-0000-0000-0000-000000000003';

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const datetimeFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export async function GET() {
  const admin = createAdminClient();
  const log: string[] = [];

  const ok = (msg: string) => { log.push(`[OK] ${msg}`); };
  const skip = (msg: string) => { log.push(`[--] ${msg}`); };
  const err = (msg: string) => { log.push(`[!!] ${msg}`); };

  // ── 1. Teams ──
  const teams = [
    { id: T1, name: 'Tracker Squad',  description: 'Building the Intern Tracker system' },
    { id: T2, name: 'LawGPT Squad',   description: 'Building the LawGPT AI assistant' },
    { id: T3, name: 'DocGen Squad',   description: 'Document generation pipeline' },
  ];
  for (const t of teams) {
    const { error } = await admin.from('teams').upsert(t, { onConflict: 'id' });
    if (error) {
      err(`team ${t.name}: ${error.message}`);
    } else {
      ok(`team: ${t.name}`);
    }
  }

  // ── 2. Auth users ──
  const usersSpec = [
    { email: 'admin@turn2law.in',  password: process.env.SEED_ADMIN_PASSWORD || 'admin123',  name: 'Admin',  role: 'admin',  must_reset: false, team: null },
    { email: 'lead@turn2law.in',   password: process.env.SEED_LEAD_PASSWORD  || 'lead123',   name: 'Lead',   role: 'lead',   must_reset: false, team: T1   },
    { email: 'intern@turn2law.in', password: process.env.SEED_INTERN_PASSWORD || 'intern123', name: 'Intern', role: 'intern', must_reset: false, team: T1   },
  ];

  const { data: { users: existingUsers } } = await admin.auth.admin.listUsers();
  const existingMap: Record<string, string> = {};
  for (const u of existingUsers) {
    if (u.email) existingMap[u.email] = u.id;
  }

  const ids: Record<string, string> = {};

  for (const u of usersSpec) {
    if (existingMap[u.email]) {
      ids[u.email] = existingMap[u.email];
      skip(`auth: ${u.email}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
      });
      if (error) { err(`auth ${u.email}: ${error.message}`); continue; }
      ids[u.email] = data.user.id;
      ok(`auth: ${u.email}`);
    }

    // Upsert profile
    const uid = ids[u.email];
    if (!uid) continue;
    const { error: pe } = await admin.from('profiles').upsert({
      id: uid, name: u.name, email: u.email, role: u.role,
      team_id: u.team, avatar_url: '', status: 'active',
      must_reset_password: u.must_reset,
    }, { onConflict: 'id' });
    if (pe) {
      err(`profile ${u.name}: ${pe.message}`);
    } else {
      ok(`profile: ${u.name} (${u.role})`);
    }
  }

  // Assign team lead
  const leadId   = ids['lead@turn2law.in'];
  const adminId  = ids['admin@turn2law.in'];
  const internId = ids['intern@turn2law.in'];
  if (leadId) await admin.from('teams').update({ lead_id: leadId }).eq('id', T1);
  ok('team lead assigned');

  // ── 3. Tasks ──
  const tasks = [
    { title: 'Set up Next.js project structure',  status: 'done',        priority: 'high',   assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(-10) },
    { title: 'Build authentication flow',         status: 'done',        priority: 'high',   assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(-8)  },
    { title: 'Design dashboard UI components',    status: 'in_progress', priority: 'medium', assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(2)   },
    { title: 'Integrate Supabase realtime',       status: 'in_progress', priority: 'high',   assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(4)   },
    { title: 'Write unit tests for task module',  status: 'todo',        priority: 'medium', assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(7)   },
    { title: 'Write onboarding documentation',    status: 'blocked',     priority: 'low',    assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(-1)  },
    { title: 'LawGPT prompt engineering v2',      status: 'in_progress', priority: 'high',   assignee_id: internId, team_id: T1, created_by: adminId, due_date: daysFromNow(1)   },
    { title: 'API rate limiting implementation',  status: 'review',      priority: 'medium', assignee_id: internId, team_id: T1, created_by: leadId,  due_date: daysFromNow(-2)  },
    { title: 'Train classification model',        status: 'todo',        priority: 'high',   assignee_id: internId, team_id: T1, created_by: adminId, due_date: daysFromNow(10)  },
    { title: 'Deploy staging environment',        status: 'todo',        priority: 'low',    assignee_id: internId, team_id: T1, created_by: adminId, due_date: daysFromNow(12)  },
  ];

  // Check if tasks already exist
  const { data: existingTasks } = await admin.from('tasks').select('title');
  const existingTitles = new Set((existingTasks || []).map((t: { title: string }) => t.title));

  for (const t of tasks) {
    if (existingTitles.has(t.title)) { skip(`task: ${t.title}`); continue; }
    const { data: inserted, error } = await admin.from('tasks').insert(t).select().single();
    if (error) { err(`task ${t.title}: ${error.message}`); continue; }
    ok(`task: ${t.title}`);
    if (inserted) {
      await admin.from('task_activity').insert({
        task_id: inserted.id, user_id: t.created_by,
        action: 'Task created', to_status: t.status,
      });
    }
  }

  // ── 4. Standups ──
  const yesterday = daysFromNow(-1);
  const today     = daysFromNow(0);

  const standups = [
    { user_id: internId, date: yesterday, did_yesterday: 'Finished auth flow integration',   doing_today: 'Working on realtime sync',      blockers: '' },
    { user_id: internId, date: today,     did_yesterday: 'Integrated Supabase client',        doing_today: 'Realtime subscriptions',        blockers: '' },
    { user_id: leadId,   date: yesterday, did_yesterday: 'Reviewed sprint tasks',             doing_today: 'Planning next milestone',       blockers: '' },
    { user_id: leadId,   date: today,     did_yesterday: 'Unblocked team on API docs',        doing_today: 'Code review session',           blockers: '' },
  ];

  for (const s of standups) {
    if (!s.user_id) continue;
    const { error } = await admin.from('standups').upsert(s, { onConflict: 'user_id,date' });
    if (error) {
      err(`standup ${s.date}: ${error.message}`);
    } else {
      ok(`standup: ${s.date}`);
    }
  }

  // ── 5. Meetings + Attendance ──
  const meetingsData: { title: string; scheduled_at: string; team_id: string | null; agenda: string; created_by: string | undefined }[] = [
    { title: 'Weekly All-Hands',       scheduled_at: datetimeFromNow(-3), team_id: null, agenda: 'Sprint review and blockers',  created_by: adminId  },
    { title: 'Tracker Squad Standup',  scheduled_at: datetimeFromNow(-1), team_id: T1,   agenda: 'Daily sync',                 created_by: leadId   },
    { title: 'Sprint Planning',        scheduled_at: datetimeFromNow(0),  team_id: T1,   agenda: 'Plan next sprint tasks',      created_by: leadId   },
    { title: 'Admin-Lead 1:1 Sync',    scheduled_at: datetimeFromNow(2),  team_id: null, agenda: 'Performance check-in',        created_by: adminId  },
  ];

  // Only insert if no meetings exist
  const { data: existingMeetings } = await admin.from('meetings').select('id').limit(1);
  if (!existingMeetings?.length) {
    for (const m of meetingsData) {
      const { data: inserted, error } = await admin.from('meetings').insert(m).select().single();
      if (error) { err(`meeting ${m.title}: ${error.message}`); continue; }
      ok(`meeting: ${m.title}`);

      // Seed attendance for all-hands
      if (m.title === 'Weekly All-Hands' && inserted) {
        const attendees = [
          { uid: adminId,  status: 'present' },
          { uid: leadId,   status: 'present' },
          { uid: internId, status: 'present' },
        ];
        for (const a of attendees) {
          if (!a.uid) continue;
          await admin.from('attendance').upsert(
            { meeting_id: inserted.id, user_id: a.uid, status: a.status },
            { onConflict: 'meeting_id,user_id' }
          );
        }
        ok('attendance: all-hands');
      }
    }
  } else {
    skip('meetings already exist');
  }

  return Response.json({
    success: true,
    message: 'Database seeded successfully! Use admin@turn2law.in, lead@turn2law.in, intern@turn2law.in with configured passwords.',
    log,
  });
}
