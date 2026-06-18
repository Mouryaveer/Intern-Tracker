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
    error ? err(`team ${t.name}: ${error.message}`) : ok(`team: ${t.name}`);
  }

  // ── 2. Auth users ──
  const usersSpec = [
    { email: 'hanush@turn2law.in',  password: 'Admin@T2L2024!',  name: 'Hanush Singh R',  role: 'admin',  must_reset: false, team: null },
    { email: 'mouryasreesailam@gmail.com', password: 'Admin@T2L2024!', name: 'Mouryaveer',  role: 'admin',  must_reset: false, team: null },
    { email: 'priya@turn2law.in',   password: 'Lead@T2L2024!',   name: 'Priya Sharma',    role: 'lead',   must_reset: false, team: T1 },
    { email: 'arjun@turn2law.in',   password: 'Lead@T2L2024!',   name: 'Arjun Mehta',     role: 'lead',   must_reset: false, team: T2 },
    { email: 'kavya@turn2law.in',   password: 'Intern@2024!',    name: 'Kavya Reddy',     role: 'intern', must_reset: true,  team: T1 },
    { email: 'rahul@turn2law.in',   password: 'Intern@2024!',    name: 'Rahul Verma',     role: 'intern', must_reset: true,  team: T1 },
    { email: 'sneha@turn2law.in',   password: 'Intern@2024!',    name: 'Sneha Nair',      role: 'intern', must_reset: true,  team: T1 },
    { email: 'vikram@turn2law.in',  password: 'Intern@2024!',    name: 'Vikram Iyer',     role: 'intern', must_reset: true,  team: T2 },
    { email: 'ananya@turn2law.in',  password: 'Intern@2024!',    name: 'Ananya Pillai',   role: 'intern', must_reset: true,  team: T2 },
    { email: 'karan@turn2law.in',   password: 'Intern@2024!',    name: 'Karan Singhania', role: 'intern', must_reset: true,  team: T3 },
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
    pe ? err(`profile ${u.name}: ${pe.message}`) : ok(`profile: ${u.name} (${u.role})`);
  }

  // Assign team leads
  const priyaId = ids['priya@turn2law.in'];
  const arjunId = ids['arjun@turn2law.in'];
  if (priyaId) await admin.from('teams').update({ lead_id: priyaId }).eq('id', T1);
  if (arjunId) await admin.from('teams').update({ lead_id: arjunId }).eq('id', T2);
  ok('team leads assigned');

  // ── 3. Tasks ──
  const adminId  = ids['hanush@turn2law.in'];
  const kavyaId  = ids['kavya@turn2law.in'];
  const rahulId  = ids['rahul@turn2law.in'];
  const snehaId  = ids['sneha@turn2law.in'];
  const vikramId = ids['vikram@turn2law.in'];
  const ananyaId = ids['ananya@turn2law.in'];
  const karanId  = ids['karan@turn2law.in'];

  const tasks = [
    { title: 'Set up Next.js project structure',   status: 'done',        priority: 'high',   assignee_id: kavyaId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(-10) },
    { title: 'Build authentication flow',          status: 'done',        priority: 'high',   assignee_id: rahulId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(-8)  },
    { title: 'Design dashboard UI components',     status: 'in_progress', priority: 'medium', assignee_id: snehaId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(2)   },
    { title: 'Integrate Supabase realtime',        status: 'in_progress', priority: 'high',   assignee_id: kavyaId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(4)   },
    { title: 'Write unit tests for task module',   status: 'todo',        priority: 'medium', assignee_id: rahulId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(7)   },
    { title: 'Write onboarding documentation',     status: 'blocked',     priority: 'low',    assignee_id: snehaId,  team_id: T1, created_by: priyaId, due_date: daysFromNow(-1)  },
    { title: 'LawGPT prompt engineering v2',       status: 'in_progress', priority: 'high',   assignee_id: vikramId, team_id: T2, created_by: arjunId, due_date: daysFromNow(1)   },
    { title: 'API rate limiting implementation',   status: 'review',      priority: 'medium', assignee_id: vikramId, team_id: T2, created_by: arjunId, due_date: daysFromNow(-2)  },
    { title: 'Train classification model',         status: 'todo',        priority: 'high',   assignee_id: ananyaId, team_id: T2, created_by: arjunId, due_date: daysFromNow(10)  },
    { title: 'Deploy staging environment',         status: 'todo',        priority: 'low',    assignee_id: karanId,  team_id: T3, created_by: adminId, due_date: daysFromNow(12)  },
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
    { user_id: kavyaId,  date: yesterday, did_yesterday: 'Finished auth flow integration',   doing_today: 'Working on realtime sync',         blockers: '' },
    { user_id: rahulId,  date: yesterday, did_yesterday: 'Wrote login unit tests',            doing_today: 'Continuing task module tests',     blockers: 'Blocked on API docs' },
    { user_id: snehaId,  date: yesterday, did_yesterday: 'Completed dashboard mockups',       doing_today: 'Building sidebar component',       blockers: '' },
    { user_id: vikramId, date: yesterday, did_yesterday: 'LawGPT prompt v2 drafted',          doing_today: 'Testing prompt accuracy',          blockers: 'Need more test cases' },
    { user_id: ananyaId, date: yesterday, did_yesterday: 'Research on classification done',   doing_today: 'Starting training pipeline',       blockers: '' },
    { user_id: kavyaId,  date: today,     did_yesterday: 'Integrated Supabase client',         doing_today: 'Realtime subscriptions',           blockers: '' },
    { user_id: rahulId,  date: today,     did_yesterday: 'Fixed login edge cases',             doing_today: 'Task module tests',               blockers: '' },
    { user_id: vikramId, date: today,     did_yesterday: 'Prompt accuracy improved to 87%',    doing_today: 'Rate limiting implementation',     blockers: '' },
  ];

  for (const s of standups) {
    if (!s.user_id) continue;
    const { error } = await admin.from('standups').upsert(s, { onConflict: 'user_id,date' });
    error ? err(`standup ${s.date}: ${error.message}`) : ok(`standup: ${s.date}`);
  }

  // ── 5. Meetings + Attendance ──
  const meetingsData: { title: string; scheduled_at: string; team_id: string | null; agenda: string; created_by: string | undefined }[] = [
    { title: 'Weekly All-Hands',       scheduled_at: datetimeFromNow(-3), team_id: null, agenda: 'Sprint review and blockers',  created_by: adminId  },
    { title: 'Tracker Squad Standup',  scheduled_at: datetimeFromNow(-1), team_id: T1,   agenda: 'Daily sync',                 created_by: priyaId  },
    { title: 'LawGPT Sprint Planning', scheduled_at: datetimeFromNow(0),  team_id: T2,   agenda: 'Plan next sprint tasks',      created_by: arjunId  },
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
          { uid: adminId,  status: 'present' }, { uid: priyaId,  status: 'present' },
          { uid: arjunId,  status: 'present' }, { uid: kavyaId,  status: 'present' },
          { uid: rahulId,  status: 'present' }, { uid: snehaId,  status: 'late'    },
          { uid: vikramId, status: 'present' }, { uid: ananyaId, status: 'absent'  },
          { uid: karanId,  status: 'absent'  },
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
    message: 'Database seeded successfully!',
    credentials: {
      admin:  ['hanush@turn2law.in / Admin@T2L2024!', 'mouryasreesailam@gmail.com / Admin@T2L2024!'],
      leads:  ['priya@turn2law.in / Lead@T2L2024!', 'arjun@turn2law.in / Lead@T2L2024!'],
      interns: ['kavya@turn2law.in / Intern@2024!', 'rahul@turn2law.in / Intern@2024!',
                'sneha@turn2law.in / Intern@2024!', 'vikram@turn2law.in / Intern@2024!',
                'ananya@turn2law.in / Intern@2024!', 'karan@turn2law.in / Intern@2024!'],
    },
    log,
  });
}
