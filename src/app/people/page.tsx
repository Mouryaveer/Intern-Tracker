'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUsers,
  getTeams,
  getTasks,
} from '@/lib/data-service';
import { Profile, Team, Task } from '@/lib/types';
import Avatar from '@/components/Avatar';
import {
  Users,
  Search,
  Mail,
  Calendar,
  Star,
} from 'lucide-react';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#0B1F3A', '#C9952A', '#3B82F6', '#16A34A', '#DC2626',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

// ── User Card ──
interface PersonCardProps {
  person: Profile;
  team: Team | undefined;
  tasks: Task[];
}

function PersonCard({ person, team, tasks }: PersonCardProps) {
  const personTasks = tasks.filter(t => t.assignee_id === person.id);
  const completedTasks = personTasks.filter(t => t.status === 'done').length;
  const activeTasks = personTasks.filter(t => t.status !== 'done').length;

  const roleBadgeClass = person.role === 'admin' ? 'badge-admin' : person.role === 'lead' ? 'badge-lead' : 'badge-intern';

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <Avatar name={person.name} avatarUrl={person.avatar_url} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{person.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: 4 }}>
            <span className={`badge ${roleBadgeClass}`}>{person.role}</span>
            {person.status === 'inactive' && <span className="badge badge-blocked">Inactive</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }} className="truncate">
          <Mail size={14} style={{ flexShrink: 0 }} />
          <span className="truncate">{person.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
          <Users size={14} style={{ flexShrink: 0 }} />
          <span>{team?.name || 'No team'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
          <Calendar size={14} style={{ flexShrink: 0 }} />
          <span>Joined {new Date(person.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {person.role === 'intern' && (
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-base)',
          marginTop: 'var(--spacing-lg)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-border-light)',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{activeTasks}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Active</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-done)' }}>{completedTasks}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Done</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team Card ──
interface TeamCardProps {
  team: Team;
  members: Profile[];
  lead: Profile | undefined;
}

function TeamCard({ team, members, lead }: TeamCardProps) {
  const interns = members.filter(m => m.role === 'intern');

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent)',
          fontWeight: 800,
          fontSize: 'var(--font-size-lg)',
        }}>
          {team.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{team.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {team.description}
          </div>
        </div>
      </div>

      {lead && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-md)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--color-accent-bg)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <Star size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontWeight: 500 }}>Lead: {lead.name}</span>
        </div>
      )}

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        {members.length} members · {interns.length} interns
      </div>

      {/* Member Avatars */}
      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
        {members.slice(0, 8).map((member) => (
          <div
            key={member.id}
            className="avatar avatar-sm"
            style={{ background: getAvatarColor(member.name) }}
            title={member.name}
          >
            {getInitials(member.name)}
          </div>
        ))}
        {members.length > 8 && (
          <div className="avatar avatar-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontSize: '10px' }}>
            +{members.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main People Page ──
export default function PeoplePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'people' | 'teams'>('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [fetchedUsers, fetchedTeams, fetchedTasks] = await Promise.all([
        getUsers(),
        getTeams(),
        getTasks(),
      ]);
      setAllUsers(fetchedUsers);
      setAllTeams(fetchedTeams);
      setAllTasks(fetchedTasks);
    } catch (err) {
      console.error('Error loading people page:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();

    // Setup realtime subscriptions
    const profilesChannel = subscribeToTable({
      table: 'profiles',
      callback: () => loadData(),
    });
    const teamsChannel = subscribeToTable({
      table: 'teams',
      callback: () => loadData(),
    });
    const tasksChannel = subscribeToTable({
      table: 'tasks',
      callback: () => loadData(),
    });

    return () => {
      unsubscribe(profilesChannel);
      unsubscribe(teamsChannel);
      unsubscribe(tasksChannel);
    };
  }, [loadData]);

  if (!mounted || !user) return null;

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="skeleton-pulse" style={{ height: 40, width: 200, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton-pulse" style={{ height: 200, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  const activeUsers = allUsers.filter(u => u.status === 'active');

  // Filter users
  let filteredUsers = activeUsers;
  if (searchQuery) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (filterRole !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.role === filterRole);
  }
  if (filterTeam !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.team_id === filterTeam);
  }

  return (
    <div className="animate-slide-up">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}>
          People ({activeUsers.length})
        </button>
        <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          Teams ({allTeams.length})
        </button>
      </div>

      {activeTab === 'people' && (
        <>
          {/* Search & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input
                className="form-input"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 120 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="lead">Lead</option>
              <option value="intern">Intern</option>
            </select>
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="all">All Teams</option>
              {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* People Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
            {filteredUsers.map(person => {
              const team = allTeams.find(t => t.id === person.team_id);
              return (
                <PersonCard 
                  key={person.id} 
                  person={person} 
                  team={team} 
                  tasks={allTasks}
                />
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={28} /></div>
              <div className="empty-state-title">No people found</div>
              <div className="empty-state-text">Try adjusting your search or filters.</div>
            </div>
          )}
        </>
      )}

      {activeTab === 'teams' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {allTeams.map(team => {
            const members = activeUsers.filter(u => u.team_id === team.id);
            const lead = activeUsers.find(u => u.id === team.lead_id);
            return (
              <TeamCard 
                key={team.id} 
                team={team} 
                members={members}
                lead={lead}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
