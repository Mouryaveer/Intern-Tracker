'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  getUsers,
  getTeams,
  getTasks,
  getStandupsByDate,
  createUser,
  updateUser,
  deactivateUser,
  createTeam,
  updateTeam,
  deleteTeam,
  resetAllData,
  getUsersByTeam,
} from '@/lib/data-service';
import { User, UserRole, Team } from '@/lib/types';
import {
  Shield,
  Users,
  ClipboardList,
  MessageSquareText,
  Plus,
  X,
  Edit3,
  Trash2,
  UserX,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Search,
  Download,
  KeyRound,
} from 'lucide-react';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Create/Edit User Modal ──
function UserFormModal({ editUser, onClose, onSaved }: {
  editUser?: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const teams = getTeams();
  const [name, setName] = useState(editUser?.name || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [role, setRole] = useState<UserRole>(editUser?.role || 'intern');
  const [teamId, setTeamId] = useState(editUser?.team_id || '');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editUser) {
      const updates: Partial<User> = { name, email, role, team_id: teamId || null };
      if (password) {
        updates.password = password;
        updates.must_reset_password = true;
      }
      updateUser(editUser.id, updates);
    } else {
      createUser({
        name,
        email,
        password: password || 'temp' + Math.random().toString(36).substring(2, 6),
        role,
        team_id: teamId || null,
        avatar_url: '',
        join_date: new Date().toISOString().split('T')[0],
        status: 'active',
        must_reset_password: true,
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editUser ? 'Edit User' : 'Create User'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Rahul Kumar" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@turn2law.in" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-base)' }}>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <option value="intern">Intern</option>
                  <option value="lead">Lead</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="form-select" value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                {editUser ? 'New Password (leave blank to keep)' : 'Temporary Password *'}
              </label>
              <input
                type="text"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={editUser ? 'Leave blank to keep current' : 'Set a temporary password'}
                required={!editUser}
              />
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                User will be forced to change this on first login
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Team Modal ──
function TeamFormModal({ editTeam, onClose, onSaved }: {
  editTeam?: Team | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const users = getUsers().filter(u => u.role === 'lead' && u.status === 'active');
  const [name, setName] = useState(editTeam?.name || '');
  const [description, setDescription] = useState(editTeam?.description || '');
  const [leadId, setLeadId] = useState(editTeam?.lead_id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTeam) {
      updateTeam(editTeam.id, { name, description, lead_id: leadId || null });
    } else {
      createTeam({ name, description, lead_id: leadId || null });
    }
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editTeam ? 'Edit Team' : 'Create Team'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="form-group">
              <label className="form-label">Team Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Tracker Squad" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this team do?" rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Team Lead</label>
              <select className="form-select" value={leadId} onChange={e => setLeadId(e.target.value)}>
                <option value="">No lead assigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">{editTeam ? 'Save' : 'Create Team'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Page ──
export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams'>('overview');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Shield size={28} /></div>
        <div className="empty-state-title">Access Denied</div>
        <div className="empty-state-text">Only administrators can access this panel.</div>
      </div>
    );
  }

  const allUsers = getUsers();
  const teams = getTeams();
  const allTasks = getTasks();
  const today = new Date().toISOString().split('T')[0];
  const todayStandups = getStandupsByDate(today);

  const activeUsers = allUsers.filter(u => u.status === 'active');
  const interns = activeUsers.filter(u => u.role === 'intern');

  // Filter users for user management tab
  let filteredUsers = allUsers;
  if (searchQuery) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const handleDeactivateUser = (userId: string) => {
    if (confirm('Deactivate this user? They will lose access.')) {
      deactivateUser(userId);
      setRefreshKey(k => k + 1);
    }
  };

  const handleActivateUser = (userId: string) => {
    updateUser(userId, { status: 'active' });
    setRefreshKey(k => k + 1);
  };

  const handleResetData = () => {
    if (confirm('⚠️ This will reset ALL data to the seed state. Continue?')) {
      resetAllData();
      setRefreshKey(k => k + 1);
    }
  };

  const handleForcePasswordReset = (userId: string, userName: string) => {
    if (confirm(`Force "${userName}" to reset their password on next login?`)) {
      updateUser(userId, { must_reset_password: true });
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="animate-slide-up" key={refreshKey}>
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Users ({allUsers.length})
        </button>
        <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          Teams ({teams.length})
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon primary"><Users size={22} /></div>
              <div>
                <div className="stat-value">{activeUsers.length}</div>
                <div className="stat-label">Active Users</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon accent"><ClipboardList size={22} /></div>
              <div>
                <div className="stat-value">{allTasks.length}</div>
                <div className="stat-label">Total Tasks</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success"><MessageSquareText size={22} /></div>
              <div>
                <div className="stat-value">{todayStandups.length}/{interns.length}</div>
                <div className="stat-label">Standups Today</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning"><Shield size={22} /></div>
              <div>
                <div className="stat-value">{teams.length}</div>
                <div className="stat-label">Active Teams</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              <button className="btn btn-accent" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                <Plus size={16} /> Create User
              </button>
              <button className="btn btn-outline" onClick={() => { setEditingTeam(null); setShowTeamModal(true); }}>
                <Plus size={16} /> Create Team
              </button>
              <button className="btn btn-outline" onClick={handleResetData} style={{ color: 'var(--color-blocked)' }}>
                <RotateCcw size={16} /> Reset All Data
              </button>
            </div>
          </div>

          {/* Role Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)' }}>
            {teams.map(team => {
              const members = getUsersByTeam(team.id);
              return (
                <div className="card" key={team.id}>
                  <div className="card-header">
                    <div className="card-title">{team.name}</div>
                    <span className="badge badge-lead">{members.length} members</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                        <div className="avatar avatar-sm" style={{ fontSize: '9px' }}>{getInitials(m.name)}</div>
                        <span style={{ flex: 1 }}>{m.name}</span>
                        <span className={`badge badge-${m.role}`}>{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input
                className="form-input"
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
            <button className="btn btn-accent" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
              <Plus size={16} /> Create User
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Reset Pwd</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const team = u.team_id ? teams.find(t => t.id === u.team_id) : null;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          <div className="avatar avatar-sm" style={{ fontSize: '9px' }}>{getInitials(u.name)}</div>
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                      <td>{team?.name || '—'}</td>
                      <td>
                        <span style={{
                          color: u.status === 'active' ? 'var(--color-done)' : 'var(--color-blocked)',
                          fontWeight: 600,
                          fontSize: 'var(--font-size-sm)',
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        {u.must_reset_password ? (
                          <span style={{ color: 'var(--color-in-progress)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Pending</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Done</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => { setEditingUser(u); setShowUserModal(true); }}
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          {!u.must_reset_password && u.id !== user.id && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleForcePasswordReset(u.id, u.name)}
                              title="Force Password Reset"
                              style={{ color: 'var(--color-in-progress)' }}
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          {u.status === 'active' ? (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleDeactivateUser(u.id)}
                              title="Deactivate"
                              style={{ color: 'var(--color-blocked)' }}
                            >
                              <UserX size={14} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleActivateUser(u.id)}
                              title="Activate"
                              style={{ color: 'var(--color-done)' }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TEAMS TAB */}
      {activeTab === 'teams' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-xl)' }}>
            <button className="btn btn-accent" onClick={() => { setEditingTeam(null); setShowTeamModal(true); }}>
              <Plus size={16} /> Create Team
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Lead</th>
                  <th>Members</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => {
                  const lead = team.lead_id ? allUsers.find(u => u.id === team.lead_id) : null;
                  const members = getUsersByTeam(team.id);
                  return (
                    <tr key={team.id}>
                      <td style={{ fontWeight: 600 }}>{team.name}</td>
                      <td>{lead?.name || '—'}</td>
                      <td>{members.length}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{team.description || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => { setEditingTeam(team); setShowTeamModal(true); }}
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => {
                              if (confirm(`Delete team "${team.name}"?`)) {
                                deleteTeam(team.id);
                                setRefreshKey(k => k + 1);
                              }
                            }}
                            title="Delete"
                            style={{ color: 'var(--color-blocked)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      {showUserModal && (
        <UserFormModal
          editUser={editingUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}

      {showTeamModal && (
        <TeamFormModal
          editTeam={editingTeam}
          onClose={() => { setShowTeamModal(false); setEditingTeam(null); }}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
