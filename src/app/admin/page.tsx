'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';
import {
  getUsers,
  getTeams,
  getTasks,
  getStandupsByDate,
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/lib/data-service';
import { Profile, UserRole, Team, Task, Standup } from '@/lib/types';
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
  KeyRound,
  Search,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';
import { debounce } from '@/lib/debounce';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `temp${Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 6)}`;
}

// ── Danger Confirm Modal (Permanent Delete) ──
interface DangerConfirmModalProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DangerConfirmModal({ userName, onConfirm, onCancel, loading }: DangerConfirmModalProps) {
  const [typed, setTyped] = React.useState('');
  const match = typed.trim() === userName.trim();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 460, border: '1.5px solid rgba(239,68,68,0.35)' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={18} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 'var(--font-size-md)' }}>
                Permanently Delete User
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                This action is irreversible
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Warning banner */}
          <div style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text)',
            lineHeight: 1.6,
          }}>
            You are about to <strong>permanently delete</strong> the account for{' '}
            <strong style={{ color: '#EF4444' }}>{userName}</strong>.
            <br /><br />
            This will remove:
            <ul style={{ paddingLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>
              <li>Their login credentials</li>
              <li>Their profile &amp; settings</li>
              <li>All their tasks and standups</li>
            </ul>
            <strong style={{ color: '#EF4444' }}>This cannot be undone.</strong>
          </div>

          {/* Type-to-confirm */}
          <div className="form-group">
            <label className="form-label">
              Type <strong>{userName}</strong> to confirm
            </label>
            <input
              className="form-input"
              placeholder={userName}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              style={{
                borderColor: typed.length > 0 ? (match ? 'var(--color-done)' : '#EF4444') : undefined,
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!match || loading}
            onClick={onConfirm}
            style={{
              background: match ? '#DC2626' : 'rgba(239,68,68,0.3)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              cursor: match && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={14} />
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create/Edit User Modal ──
interface UserFormModalProps {
  editUser?: Profile | null;
  allTeams: Team[];
  onClose: () => void;
  onSaved: () => void;
}

function UserFormModal({ editUser, allTeams, onClose, onSaved }: UserFormModalProps) {
  const [name, setName] = useState(editUser?.name || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [role, setRole] = useState<UserRole>(editUser?.role || 'intern');
  const [teamId, setTeamId] = useState(editUser?.team_id || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(editUser?.phone || '');
  const [domain, setDomain] = useState(editUser?.domain || '');
  const [endDate, setEndDate] = useState(editUser?.end_date ? editUser.end_date.substring(0, 10) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editUser) {
        const body: Partial<Pick<Profile, 'name' | 'email' | 'role' | 'team_id' | 'phone' | 'domain' | 'end_date'>> & { password?: string } = {
          name,
          email,
          role,
          team_id: teamId || null,
          phone,
          domain,
          end_date: endDate || null,
        };
        if (password) {
          body.password = password;
        }
        const res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update user');
        }
      } else {
        const body = {
          name,
          email,
          role,
          team_id: teamId || null,
          password: password || undefined,
          phone,
          domain,
          end_date: endDate || null,
        };
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create user');
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'An error occurred'));
    } finally {
      setLoading(false);
    }
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
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Rahul Kumar" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@turn2law.in" />
            </div>
            <div className="grid-2">
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
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Domain of Work</label>
                <input
                  type="text"
                  className="form-input"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="e.g., Legal Research"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ending Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
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
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Team Modal ──
interface TeamFormModalProps {
  editTeam?: Team | null;
  allUsers: Profile[];
  onClose: () => void;
  onSaved: () => void;
}

function TeamFormModal({ editTeam, allUsers, onClose, onSaved }: TeamFormModalProps) {
  const activeLeads = allUsers.filter(u => u.role === 'lead' && u.status === 'active');
  const [name, setName] = useState(editTeam?.name || '');
  const [description, setDescription] = useState(editTeam?.description || '');
  const [leadId, setLeadId] = useState(editTeam?.lead_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editTeam) {
        await updateTeam(editTeam.id, { name, description, lead_id: leadId || null });
      } else {
        await createTeam({ name, description, lead_id: leadId || null });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save team'));
    } finally {
      setLoading(false);
    }
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
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}
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
                {activeLeads.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? 'Saving...' : editTeam ? 'Save' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Page ──
export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams'>('overview');
  
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [todayStandups, setTodayStandups] = useState<Standup[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [fetchedUsers, fetchedTeams, fetchedTasks, fetchedStandups] = await Promise.all([
        getUsers(),
        getTeams(),
        getTasks(),
        getStandupsByDate(today),
      ]);
      setAllUsers(fetchedUsers);
      setTeams(fetchedTeams);
      setAllTasks(fetchedTasks);
      setTodayStandups(fetchedStandups);
    } catch (err) {
      console.error('Error loading admin panel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void Promise.resolve().then(loadData);

      const debouncedLoad = debounce(() => {
        void loadData();
      }, 200);

      // Subscribe to updates
      const profilesChannel = subscribeToTable({
        table: 'profiles',
        callback: debouncedLoad,
      });
      const teamsChannel = subscribeToTable({
        table: 'teams',
        callback: debouncedLoad,
      });
      const tasksChannel = subscribeToTable({
        table: 'tasks',
        callback: debouncedLoad,
      });
      const standupsChannel = subscribeToTable({
        table: 'standups',
        callback: debouncedLoad,
      });

      return () => {
        unsubscribe(profilesChannel);
        unsubscribe(teamsChannel);
        unsubscribe(tasksChannel);
        unsubscribe(standupsChannel);
      };
    }
  }, [isAdmin, loadData]);

  if (!user) return null;

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <div className="empty-state animate-slide-up">
        <div className="empty-state-icon"><Shield size={28} /></div>
        <div className="empty-state-title">Access Denied</div>
        <div className="empty-state-text">Only administrators can access this panel.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card skeleton-pulse" style={{ height: 100, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
        <div className="skeleton-pulse" style={{ height: 40, width: 300, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }} />
        <div className="table-container skeleton-pulse" style={{ height: 300, background: 'var(--color-surface)' }} />
      </div>
    );
  }

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

  const handleDeactivateUser = async (userId: string) => {
    if (confirm('Deactivate this user? They will lose access.')) {
      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
        await loadData();
      } catch (err) { alert(getErrorMessage(err, 'Error deactivating user')); }
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}/permanent`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Failed to delete user');
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err, 'Error permanently deleting user'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to activate user');
      }
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err, 'Error activating user'));
    }
  };

  const handleForcePasswordReset = async (userId: string, userName: string) => {
    const tempPassword = generateTempPassword();
    if (confirm(`Force "${userName}" to reset their password on next login? A temporary password "${tempPassword}" will be set.`)) {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: tempPassword }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to force reset');
        }
        alert(`Temporary password set to: ${tempPassword}\n\nPlease share this with the user.`);
        await loadData();
      } catch (err) {
        alert(getErrorMessage(err, 'Error forcing password reset'));
      }
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (confirm(`Delete team "${teamName}"?`)) {
      try {
        await deleteTeam(teamId);
        await loadData();
      } catch (err) {
        alert(getErrorMessage(err, 'Failed to delete team'));
      }
    }
  };

  const handleExportExcel = () => {
    const targets = allUsers.filter(u => u.role === 'intern' || u.role === 'lead');
    
    const rowsData = targets.map(u => {
      const team = u.team_id ? teams.find(t => t.id === u.team_id) : null;
      const teamName = team ? team.name : 'No team';
      const roleName = u.role.charAt(0).toUpperCase() + u.role.slice(1);
      const joiningDate = u.created_at ? u.created_at.substring(0, 10) : '';
      const endingDate = u.end_date ? u.end_date.substring(0, 10) : '—';
      const statusName = u.status.charAt(0).toUpperCase() + u.status.slice(1);
      
      return {
        'Name': u.name,
        'Email': u.email,
        'Phone Number': u.phone || '—',
        'Role': roleName,
        'Team': teamName,
        'Domain of Work': u.domain || '—',
        'Joining Date': joiningDate,
        'Ending Date': endingDate,
        'Status': statusName,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rowsData);
    
    const max_widths = [
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 18 }, // Phone Number
      { wch: 12 }, // Role
      { wch: 20 }, // Team
      { wch: 25 }, // Domain of Work
      { wch: 15 }, // Joining Date
      { wch: 15 }, // Ending Date
      { wch: 12 }  // Status
    ];
    worksheet['!cols'] = max_widths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Interns & Leads');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `interns_leads_directory_${timestamp}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-up">
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
                <div className="stat-value">{todayStandups.filter(s => interns.some(i => i.id === s.user_id)).length}/{interns.length}</div>
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
              <button className="btn btn-outline" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={16} /> Export Directory
              </button>
            </div>
          </div>

          {/* Role Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)' }}>
            {teams.map(team => {
              const members = allUsers.filter(u => u.team_id === team.id && u.status === 'active');
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
                        <span style={{ flex: 1 }} className="truncate">{m.name}</span>
                        <span className={`badge badge-${m.role}`}>{m.role}</span>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--spacing-sm) 0' }}>
                        No members assigned
                      </div>
                    )}
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
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button className="btn btn-outline" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={16} /> Export Directory
              </button>
              <button className="btn btn-accent" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                <Plus size={16} /> Create User
              </button>
            </div>
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
                          {u.id !== user.id && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleForcePasswordReset(u.id, u.name)}
                              title="Force Password Reset"
                              style={{ color: 'var(--color-in-progress)' }}
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          {u.id !== user.id && (
                            u.status === 'active' ? (
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
                            )
                          )}
                          {u.id !== user.id && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                              title="Permanently Delete"
                              style={{ color: '#EF4444' }}
                            >
                              <Trash2 size={14} />
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
                  const members = allUsers.filter(u => u.team_id === team.id && u.status === 'active');
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
                            onClick={() => handleDeleteTeam(team.id, team.name)}
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
          allTeams={teams}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSaved={loadData}
        />
      )}

      {showTeamModal && (
        <TeamFormModal
          editTeam={editingTeam}
          allUsers={allUsers}
          onClose={() => { setShowTeamModal(false); setEditingTeam(null); }}
          onSaved={loadData}
        />
      )}

      {deleteTarget && (
        <DangerConfirmModal
          userName={deleteTarget.name}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
