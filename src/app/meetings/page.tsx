'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUpcomingMeetings,
  getPastMeetings,
  createMeeting,
  getAttendanceByMeeting,
  markAttendance,
  getUsers,
  getTeams,
} from '@/lib/data-service';
import { Meeting, Attendance, AttendanceStatus, ATTENDANCE_STATUS_CONFIG, Profile, Team } from '@/lib/types';
import {
  Calendar,
  Plus,
  X,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Create Meeting Modal ──
interface CreateMeetingModalProps {
  allTeams: Team[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateMeetingModal({ allTeams, onClose, onCreated }: CreateMeetingModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [teamId, setTeamId] = useState('');
  const [agenda, setAgenda] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await createMeeting({
        title,
        scheduled_at: new Date(scheduledAt).toISOString(),
        team_id: teamId || null,
        agenda,
        notes_url: '',
        created_by: user.id,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating meeting:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Schedule Meeting</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="form-group">
              <label className="form-label">Meeting Title *</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Weekly Squad Sync" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-base)' }}>
              <div className="form-group">
                <label className="form-label">Date & Time *</label>
                <input type="datetime-local" className="form-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="form-select" value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">All Teams (Org-wide)</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Agenda</label>
              <textarea className="form-textarea" value={agenda} onChange={e => setAgenda(e.target.value)} rows={4} placeholder="Meeting agenda items..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Schedule Meeting</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Meeting Card ──
interface MeetingCardProps {
  meeting: Meeting;
  isPast: boolean;
  allUsers: Profile[];
  allTeams: Team[];
}

function MeetingCard({ meeting, isPast, allUsers, allTeams }: MeetingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const { isAdmin, isLead } = useAuth();
  const { isMobile } = useIsMobile();
  const date = new Date(meeting.scheduled_at);
  const team = meeting.team_id ? allTeams.find(t => t.id === meeting.team_id) : null;

  // Expected attendees based on team scoping
  const attendees = meeting.team_id
    ? allUsers.filter(u => u.team_id === meeting.team_id && u.role === 'intern' && u.status === 'active')
    : allUsers.filter(u => u.role === 'intern' && u.status === 'active');

  const fetchAttendance = useCallback(async () => {
    try {
      const data = await getAttendanceByMeeting(meeting.id);
      setAttendance(data);
    } catch (err) {
      console.error('Error fetching attendance for meeting:', err);
    }
  }, [meeting.id]);

  useEffect(() => {
    if (expanded) {
      void Promise.resolve().then(fetchAttendance);

      // Subscribe to realtime attendance changes for this specific meeting
      const channel = subscribeToTable({
        table: 'attendance',
        filter: `meeting_id=eq.${meeting.id}`,
        callback: () => fetchAttendance(),
      });

      return () => unsubscribe(channel);
    }
  }, [expanded, fetchAttendance, meeting.id]);

  const handleMarkAttendance = async (userId: string, status: AttendanceStatus) => {
    try {
      await markAttendance(meeting.id, userId, status);
      await fetchAttendance();
    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Date Block */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-md)',
          background: isPast ? 'var(--color-bg)' : 'var(--color-accent-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 800,
            color: isPast ? 'var(--color-text-secondary)' : 'var(--color-accent)',
            lineHeight: 1,
          }}>
            {date.getDate()}
          </div>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
          }}>
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', marginBottom: 4 }}>
            {meeting.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} />
              {team?.name || 'All Teams'}
            </span>
          </div>

          {/* Attendance summary for past meetings */}
          {isPast && attendance.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
              <span style={{ color: 'var(--color-done)' }}>✓ {presentCount} present</span>
              {lateCount > 0 && <span style={{ color: 'var(--color-in-progress)' }}>⏰ {lateCount} late</span>}
              {absentCount > 0 && <span style={{ color: 'var(--color-blocked)' }}>✗ {absentCount} absent</span>}
            </div>
          )}
        </div>

        <div style={{ color: 'var(--color-text-tertiary)' }}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {/* Expanded: Agenda + Attendance */}
      {expanded && (
        <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
          {meeting.agenda && (
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Agenda
              </h4>
              <p style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {meeting.agenda}
              </p>
            </div>
          )}

          {/* Attendance Marking (for leads/admins on past meetings) */}
          {(isAdmin || isLead) && (
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Attendance ({attendees.length} expected)
              </h4>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {attendees.map((attendee) => {
                    const record = attendance.find(a => a.user_id === attendee.id);
                    return (
                      <div 
                        key={attendee.id} 
                        style={{ 
                          padding: 'var(--spacing-md)', 
                          border: '1px solid var(--color-border)', 
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-sm)',
                          background: 'var(--color-bg)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div className="avatar avatar-sm" style={{ fontSize: '9px' }}>{getInitials(attendee.name)}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{attendee.name}</div>
                              <span className={`badge badge-${attendee.role}`} style={{ marginTop: 2 }}>{attendee.role}</span>
                            </div>
                          </div>
                          <div>
                            {record ? (
                              <span style={{ color: ATTENDANCE_STATUS_CONFIG[record.status].color, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                {ATTENDANCE_STATUS_CONFIG[record.status].label}
                              </span>
                            ) : (
                              <span className="text-tertiary text-sm">Not marked</span>
                            )}
                          </div>
                        </div>
                        {isPast && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map(status => (
                              <button
                                key={status}
                                className="btn btn-sm btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  flex: '1 1 auto',
                                  textAlign: 'center',
                                  color: ATTENDANCE_STATUS_CONFIG[status].color,
                                  background: record?.status === status ? `${ATTENDANCE_STATUS_CONFIG[status].color}15` : undefined,
                                  border: record?.status === status ? `1px solid ${ATTENDANCE_STATUS_CONFIG[status].color}40` : undefined,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAttendance(attendee.id, status);
                                }}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        {isPast && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((attendee) => {
                        const record = attendance.find(a => a.user_id === attendee.id);
                        return (
                          <tr key={attendee.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <div className="avatar avatar-sm" style={{ fontSize: '9px' }}>{getInitials(attendee.name)}</div>
                                {attendee.name}
                              </div>
                            </td>
                            <td><span className={`badge badge-${attendee.role}`}>{attendee.role}</span></td>
                            <td>
                              {record ? (
                                <span style={{ color: ATTENDANCE_STATUS_CONFIG[record.status].color, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                  {ATTENDANCE_STATUS_CONFIG[record.status].label}
                                </span>
                              ) : (
                                <span className="text-tertiary text-sm">Not marked</span>
                              )}
                            </td>
                            {isPast && (
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map(status => (
                                    <button
                                      key={status}
                                      className="btn btn-sm btn-ghost"
                                      style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        color: ATTENDANCE_STATUS_CONFIG[status].color,
                                        background: record?.status === status ? `${ATTENDANCE_STATUS_CONFIG[status].color}15` : undefined,
                                        border: record?.status === status ? `1px solid ${ATTENDANCE_STATUS_CONFIG[status].color}40` : undefined,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAttendance(attendee.id, status);
                                      }}
                                    >
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Meetings Page ──
export default function MeetingsPage() {
  const { user, isAdmin, isLead } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [fetchedUpcoming, fetchedPast, fetchedUsers, fetchedTeams] = await Promise.all([
        getUpcomingMeetings(),
        getPastMeetings(),
        getUsers(),
        getTeams(),
      ]);
      setUpcomingMeetings(fetchedUpcoming);
      setPastMeetings(fetchedPast);
      setAllUsers(fetchedUsers);
      setAllTeams(fetchedTeams);
    } catch (err) {
      console.error('Error loading meetings data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);

    // Subscribe to meetings updates
    const meetingsChannel = subscribeToTable({
      table: 'meetings',
      callback: () => loadData(),
    });

    return () => unsubscribe(meetingsChannel);
  }, [loadData]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
          <div className="skeleton-pulse" style={{ height: 40, width: 250, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton-pulse" style={{ height: 40, width: 150, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-pulse" style={{ height: 100, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            Upcoming ({upcomingMeetings.length})
          </button>
          <button className={`tab ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
            Past ({pastMeetings.length})
          </button>
        </div>
        {(isAdmin || isLead) && (
          <button className="btn btn-accent" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Meetings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}>
        {activeTab === 'upcoming' && (
          upcomingMeetings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={28} /></div>
              <div className="empty-state-title">No upcoming meetings</div>
              <div className="empty-state-text">Schedule a meeting to get started.</div>
            </div>
          ) : (
            upcomingMeetings.map(m => (
              <MeetingCard 
                key={m.id} 
                meeting={m} 
                isPast={false} 
                allUsers={allUsers}
                allTeams={allTeams}
              />
            ))
          )
        )}
        {activeTab === 'past' && (
          pastMeetings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={28} /></div>
              <div className="empty-state-title">No past meetings</div>
            </div>
          ) : (
            pastMeetings.map(m => (
              <MeetingCard 
                key={m.id} 
                meeting={m} 
                isPast={true} 
                allUsers={allUsers}
                allTeams={allTeams}
              />
            ))
          )
        )}
      </div>

      {showCreateModal && (
        <CreateMeetingModal
          allTeams={allTeams}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}
