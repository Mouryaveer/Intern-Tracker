'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getTodayStandup,
  submitStandup,
  getStandupsByDate,
  getUsers,
  getUsersByTeam,
  getStandupsByUser,
  getUserById,
  getTeams,
} from '@/lib/data-service';
import { Standup, User } from '@/lib/types';
import {
  MessageSquareText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit3,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Users,
  Calendar,
} from 'lucide-react';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Standup Form ──
function StandupForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth();
  const [didYesterday, setDidYesterday] = useState('');
  const [doingToday, setDoingToday] = useState('');
  const [blockers, setBlockers] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const existingStandup = user ? getTodayStandup(user.id) : null;

  useEffect(() => {
    if (existingStandup) {
      setDidYesterday(existingStandup.did_yesterday);
      setDoingToday(existingStandup.doing_today);
      setBlockers(existingStandup.blockers);
      setSubmitted(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    submitStandup(user.id, didYesterday, doingToday, blockers);
    setSubmitted(true);
    setIsEditing(false);
    onSubmitted();
  };

  if (submitted && !isEditing) {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--color-done)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--color-done)' }} />
            <span style={{ fontWeight: 600, color: 'var(--color-done)' }}>Standup submitted for today</span>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => setIsEditing(true)}>
            <Edit3 size={14} /> Edit
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="standup-section">
            <div className="standup-section-label">✅ What I did yesterday</div>
            <div className="standup-section-text">{didYesterday}</div>
          </div>
          <div className="standup-section">
            <div className="standup-section-label">🔄 What I&apos;m doing today</div>
            <div className="standup-section-text">{doingToday}</div>
          </div>
          <div className="standup-section">
            <div className="standup-section-label">🚧 Blockers</div>
            <div className="standup-section-text">{blockers || 'None'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
        <MessageSquareText size={20} style={{ color: 'var(--color-accent)' }} />
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
          {isEditing ? 'Edit Your Standup' : 'Submit Your Daily Standup'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div className="form-group">
          <label className="form-label">✅ What did you do yesterday?</label>
          <textarea
            className="form-textarea"
            value={didYesterday}
            onChange={e => setDidYesterday(e.target.value)}
            required
            rows={3}
            placeholder="Describe what you accomplished..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">🔄 What are you doing today?</label>
          <textarea
            className="form-textarea"
            value={doingToday}
            onChange={e => setDoingToday(e.target.value)}
            required
            rows={3}
            placeholder="What's on your plate for today..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">🚧 Any blockers?</label>
          <textarea
            className="form-textarea"
            value={blockers}
            onChange={e => setBlockers(e.target.value)}
            rows={2}
            placeholder="Anything blocking your progress? Leave empty if none."
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          {isEditing && (
            <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
          )}
          <button type="submit" className="btn btn-accent">
            <Send size={16} /> {isEditing ? 'Update Standup' : 'Submit Standup'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Team Standup View ──
function TeamStandupView() {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const teams = getTeams();
  const [filterTeam, setFilterTeam] = useState<string>(user?.team_id || 'all');

  // Get team members
  let members: User[];
  if (isAdmin || filterTeam === 'all') {
    members = getUsers().filter(u => u.role === 'intern' && u.status === 'active');
  } else {
    members = getUsersByTeam(filterTeam).filter(u => u.role === 'intern');
  }

  const dateStandups = getStandupsByDate(selectedDate);
  const submittedCount = dateStandups.filter(s => members.some(m => m.id === s.user_id)).length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          {(isAdmin) && (
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span className="text-sm text-secondary">
            {submittedCount}/{members.length} submitted
          </span>
          <div className="progress-bar" style={{ width: 100 }}>
            <div
              className={`progress-bar-fill ${submittedCount === members.length ? 'success' : 'warning'}`}
              style={{ width: `${members.length > 0 ? (submittedCount / members.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="standup-grid">
        {members.map((member) => {
          const standup = dateStandups.find(s => s.user_id === member.id);
          const isExpanded = expandedUser === member.id;
          const team = member.team_id ? teams.find(t => t.id === member.team_id) : null;

          return (
            <div
              key={member.id}
              className={`standup-card ${standup ? 'submitted' : 'missing'}`}
              style={{ cursor: standup ? 'pointer' : 'default' }}
              onClick={() => standup && setExpandedUser(isExpanded ? null : member.id)}
            >
              <div className="standup-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <div className="avatar avatar-md">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{member.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                      {team?.name || 'No team'}
                    </div>
                  </div>
                </div>
                {standup ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-done)' }} />
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                ) : (
                  <XCircle size={18} style={{ color: 'var(--color-blocked)' }} />
                )}
              </div>

              {standup && isExpanded && (
                <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                  <div className="standup-section">
                    <div className="standup-section-label">What they did</div>
                    <div className="standup-section-text">{standup.did_yesterday}</div>
                  </div>
                  <div className="standup-section">
                    <div className="standup-section-label">Doing today</div>
                    <div className="standup-section-text">{standup.doing_today}</div>
                  </div>
                  {standup.blockers && (
                    <div className="standup-section">
                      <div className="standup-section-label" style={{ color: 'var(--color-blocked)' }}>
                        <AlertTriangle size={12} style={{ display: 'inline' }} /> Blockers
                      </div>
                      <div className="standup-section-text">{standup.blockers}</div>
                    </div>
                  )}
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-sm)' }}>
                    Submitted at {new Date(standup.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon"><Users size={28} /></div>
            <div className="empty-state-title">No team members</div>
            <div className="empty-state-text">No interns found for the selected team.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Standups Page ──
export default function StandupsPage() {
  const { user, isIntern } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'form' | 'team'>(isIntern ? 'form' : 'team');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  return (
    <div className="animate-slide-up">
      {/* Tabs */}
      <div className="tabs">
        {isIntern && (
          <button
            className={`tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            My Standup
          </button>
        )}
        <button
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team View
        </button>
      </div>

      {activeTab === 'form' && (
        <StandupForm key={refreshKey} onSubmitted={() => setRefreshKey(k => k + 1)} />
      )}

      {activeTab === 'team' && (
        <TeamStandupView key={refreshKey} />
      )}
    </div>
  );
}
