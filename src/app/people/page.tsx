'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUsers,
  getTeams,
  getUsersByTeam,
  getTeamById,
  getTasksByAssignee,
  getStandupStreak,
} from '@/lib/data-service';
import { User, Team } from '@/lib/types';
import {
  Users,
  Search,
  Filter,
  Mail,
  Calendar,
  ClipboardList,
  MessageSquareText,
  Shield,
  Star,
  UserCheck,
} from 'lucide-react';

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
function PersonCard({ person }: { person: User }) {
  const team = person.team_id ? getTeamById(person.team_id) : null;
  const tasks = getTasksByAssignee(person.id);
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const activeTasks = tasks.filter(t => t.status !== 'done').length;

  const roleBadgeClass = person.role === 'admin' ? 'badge-admin' : person.role === 'lead' ? 'badge-lead' : 'badge-intern';

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div
          className="avatar avatar-lg"
          style={{ background: getAvatarColor(person.name) }}
        >
          {getInitials(person.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{person.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: 4 }}>
            <span className={`badge ${roleBadgeClass}`}>{person.role}</span>
            {person.status === 'inactive' && <span className="badge badge-blocked">Inactive</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
          <Mail size={14} />
          <span>{person.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
          <Users size={14} />
          <span>{team?.name || 'No team'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
          <Calendar size={14} />
          <span>Joined {new Date(person.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
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
function TeamCard({ team }: { team: Team }) {
  const members = getUsersByTeam(team.id);
  const lead = team.lead_id ? getUsers().find(u => u.id === team.lead_id) : null;
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

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !user) return null;

  const allUsers = getUsers().filter(u => u.status === 'active');
  const teams = getTeams();

  // Filter users
  let filteredUsers = allUsers;
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
          People ({allUsers.length})
        </button>
        <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          Teams ({teams.length})
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
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* People Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
            {filteredUsers.map(person => (
              <PersonCard key={person.id} person={person} />
            ))}
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
          {teams.map(team => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
