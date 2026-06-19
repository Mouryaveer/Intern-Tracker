'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getUsers,
  getTeams,
  getTaskActivity,
} from '@/lib/data-service';
import { Task, TaskStatus, TaskPriority, TaskActivity, TASK_STATUS_CONFIG, Profile, Team } from '@/lib/types';
import {
  Plus,
  X,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Filter,
  Trash2,
  Edit3,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];

// ── Task Card Component ──
interface TaskCardProps {
  task: Task;
  allUsers: Profile[];
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onAssign?: (e: React.MouseEvent) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  isMobile?: boolean;
  canAssign?: boolean;
}

function TaskCard({ task, allUsers, onClick, onDragStart, onDragEnd, onAssign, onStatusChange, isMobile = false, canAssign = false }: TaskCardProps) {
  const assignee = task.assignee_id ? allUsers.find(u => u.id === task.assignee_id) : null;
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date(today) && task.status !== 'done';

  if (isMobile) {
    return (
      <div
        className="task-card"
        onClick={onClick}
        style={{ cursor: 'pointer', padding: 'var(--spacing-md)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <span className={`badge badge-${task.priority}`}>
              {task.priority}
            </span>
            {isOverdue && (
              <span className="badge badge-blocked" style={{ fontSize: '10px' }}>
                <AlertTriangle size={10} /> Overdue
              </span>
            )}
          </div>
          {assignee && (
            <div className="avatar avatar-sm" style={{ width: 20, height: 20, fontSize: '8px' }} title={assignee.name}>
              {getInitials(assignee.name)}
            </div>
          )}
        </div>
        <div className="task-card-title" style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>{task.title}</div>
        
        {/* Mobile Status Dropdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <select 
            className="form-select" 
            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', width: 'auto' }}
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              if (onStatusChange) onStatusChange(task.id, e.target.value as TaskStatus);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {COLUMNS.map(s => (
              <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div
      className="task-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
        <span className={`badge badge-${task.priority}`}>
          {task.priority}
        </span>
        {isOverdue && (
          <span className="badge badge-blocked" style={{ fontSize: '10px' }}>
            <AlertTriangle size={10} /> Overdue
          </span>
        )}
      </div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <div className="task-card-assignee">
          {assignee && (
            <>
              <div className="avatar avatar-sm" style={{ width: 20, height: 20, fontSize: '8px' }}>
                {getInitials(assignee.name)}
              </div>
              <span>{assignee.name.split(' ')[0]}</span>
            </>
          )}
        </div>
        {task.due_date && (
          <div className={`task-card-due ${isOverdue ? 'overdue' : ''}`}>
            <Calendar size={12} />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
      {canAssign && (
        <button
          onClick={onAssign}
          style={{
            marginTop: 'var(--spacing-sm)',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '11px', color: 'var(--color-accent)',
            background: 'var(--color-accent-bg)', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '3px 8px',
            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <UserPlus size={12} /> {assignee ? 'Reassign' : 'Assign'}
        </button>
      )}
    </div>
  );
}

// ── Assign Task Modal ──
interface AssignTaskModalProps {
  task: Task;
  allUsers: Profile[];
  allTeams: Team[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignTaskModal({ task, allUsers, allTeams, onClose, onAssigned }: AssignTaskModalProps) {
  const { user, isAdmin, isLead } = useAuth();

  const activeUsers = allUsers.filter(u => u.status === 'active');

  // Role hierarchy
  const assignableUsers = isAdmin
    ? activeUsers.filter(u => u.role === 'lead')
    : isLead
      ? activeUsers.filter(u => u.role === 'intern' && u.team_id === user?.team_id)
      : [];

  const currentAssignee = task.assignee_id ? allUsers.find(u => u.id === task.assignee_id) : null;

  const handleAssign = async (userId: string) => {
    if (!user) return;
    try {
      await updateTask(task.id, { assignee_id: userId || null });
      onAssigned();
      onClose();
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Assign Task</h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {task.title}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Currently assigned to:</span>
            <strong>{currentAssignee?.name || 'Nobody'}</strong>
          </div>

          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {isAdmin ? 'Assign to a Lead:' : 'Assign to an Intern in your team:'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', maxHeight: 320, overflowY: 'auto' }}>
            {/* Unassign option */}
            <button
              onClick={() => handleAssign('')}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)',
                border: `2px solid ${!task.assignee_id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: !task.assignee_id ? 'var(--color-accent-bg)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--color-border)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-secondary)', flexShrink: 0,
              }}>
                <UserIcon size={16} />
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Unassigned</span>
            </button>

            {assignableUsers.length === 0 && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                No {isAdmin ? 'leads' : 'interns'} available to assign.
              </p>
            )}

            {assignableUsers.map(u => {
              const isSelected = task.assignee_id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleAssign(u.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: isSelected ? 'var(--color-accent-bg)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--color-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '12px', flexShrink: 0,
                  }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {u.role}{u.team_id ? ` · ${allTeams.find(t => t.id === u.team_id)?.name || ''}` : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Task Modal ──
interface CreateTaskModalProps {
  allUsers: Profile[];
  allTeams: Team[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ allUsers, allTeams, onClose, onCreated }: CreateTaskModalProps) {
  const { user, isAdmin, isLead } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [teamId, setTeamId] = useState(user?.team_id || '');
  const [dueDate, setDueDate] = useState('');

  const activeUsers = allUsers.filter(u => u.status === 'active');

  // Role hierarchy
  const assignableUsers = isAdmin
    ? activeUsers.filter(u => u.role === 'lead')
    : isLead
      ? activeUsers.filter(u => u.role === 'intern' && u.team_id === user?.team_id)
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await createTask({
        title,
        description,
        acceptance_criteria: acceptanceCriteria,
        priority,
        assignee_id: assigneeId || null,
        team_id: teamId || null,
        created_by: user.id,
        status: 'todo',
        due_date: dueDate || null,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create Task</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="What needs to be done?" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details..." rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Acceptance Criteria *</label>
              <textarea className="form-textarea" value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} required placeholder="What does 'done' look like? List the criteria..." rows={3} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="form-select" value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">No team</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task Detail Drawer ──
interface TaskDetailDrawerProps {
  task: Task;
  allUsers: Profile[];
  onClose: () => void;
  onUpdated: () => void;
}

function TaskDetailDrawer({ task, allUsers, onClose, onUpdated }: TaskDetailDrawerProps) {
  const { user, isAdmin, isLead } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editCriteria, setEditCriteria] = useState(task.acceptance_criteria);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editAssignee, setEditAssignee] = useState(task.assignee_id || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editStatus, setEditStatus] = useState(task.status);
  
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [comments, setComments] = useState<{ id: string; user_id: string; content: string; created_at: string }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const assignee = task.assignee_id ? allUsers.find(u => u.id === task.assignee_id) : null;
  const creator = allUsers.find(u => u.id === task.created_by);
  const activeUsers = allUsers.filter(u => u.status === 'active');

  // Role hierarchy for assignee dropdown
  const assignableUsers = isAdmin
    ? activeUsers.filter(u => u.role === 'lead')
    : isLead
      ? activeUsers.filter(u => u.role === 'intern' && u.team_id === user?.team_id)
      : [];

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoadingActivities(true);
        const data = await getTaskActivity(task.id);
        setActivities(data);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchActivities();

    // Fetch comments
    fetch(`/api/tasks/comments?task_id=${task.id}`)
      .then(r => r.json())
      .then(r => setComments(r.data || []))
      .catch(console.error);
  }, [task.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, content: newComment }),
      });
      const data = await res.json();
      if (data.data) setComments(prev => [...prev, data.data]);
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateTask(task.id, {
        title: editTitle,
        description: editDescription,
        acceptance_criteria: editCriteria,
        priority: editPriority,
        assignee_id: editAssignee || null,
        due_date: editDueDate || null,
        status: editStatus,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
        onClose();
        onUpdated();
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const statusConfig = TASK_STATUS_CONFIG[task.status];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-content">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <span className={`badge badge-${task.status.replace('_', '-')}`}>
              {statusConfig.label}
            </span>
            <span className={`badge badge-${task.priority}`}>
              {task.priority} priority
            </span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {(isAdmin || isLead) && (
              <>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditing(!editing)} title="Edit">
                  <Edit3 size={16} />
                </button>
                <button className="btn btn-ghost btn-icon" onClick={handleDelete} title="Delete" style={{ color: 'var(--color-blocked)' }}>
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editStatus} onChange={e => setEditStatus(e.target.value as TaskStatus)}>
                  {COLUMNS.map(s => (
                    <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} />
              </div>
              <div className="form-group">
                <label className="form-label">Acceptance Criteria</label>
                <textarea className="form-textarea" value={editCriteria} onChange={e => setEditCriteria(e.target.value)} rows={4} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={editPriority} onChange={e => setEditPriority(e.target.value as TaskPriority)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={editAssignee} onChange={e => setEditAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-accent" onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-xl)' }}>{task.title}</h2>

              {/* Meta Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-2xl)', fontSize: 'var(--font-size-sm)' }}>
                <div className="text-secondary font-medium">Assignee</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  {assignee ? (
                    <>
                      <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: '9px' }}>
                        {getInitials(assignee.name)}
                      </div>
                      {assignee.name}
                    </>
                  ) : (
                    <span className="text-tertiary">Unassigned</span>
                  )}
                </div>

                <div className="text-secondary font-medium">Created by</div>
                <div>{creator?.name || 'Unknown'}</div>

                <div className="text-secondary font-medium">Due date</div>
                <div>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'}</div>

                <div className="text-secondary font-medium">Created</div>
                <div>{new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>

                {task.completed_at && (
                  <>
                    <div className="text-secondary font-medium">Completed</div>
                    <div>{new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                    Description
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
                </div>
              )}

              {/* Acceptance Criteria */}
              {task.acceptance_criteria && (
                <div style={{
                  marginBottom: 'var(--spacing-2xl)',
                  padding: 'var(--spacing-base)',
                  background: 'var(--color-accent-bg)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--color-accent)',
                }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--color-accent)' }}>
                    ✅ Acceptance Criteria
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.acceptance_criteria}</p>
                </div>
              )}

              {/* Comments Section */}
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-base)', color: 'var(--color-text-secondary)' }}>
                  Comments ({comments.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                  {comments.length === 0 && (
                    <p className="text-sm text-tertiary">No comments yet.</p>
                  )}
                  {comments.map(c => {
                    const commenter = allUsers.find(u => u.id === c.user_id);
                    return (
                      <div key={c.id} style={{
                        display: 'flex', gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-light)',
                      }}>
                        <div className="avatar avatar-sm" style={{ width: 28, height: 28, fontSize: '10px', flexShrink: 0 }}>
                          {getInitials(commenter?.name || '?')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 4 }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{commenter?.name || 'Unknown'}</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                              {new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{c.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                  <textarea
                    className="form-textarea"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={2}
                    style={{ flex: 1, resize: 'none' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment(); } }}
                  />
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => void handleAddComment()}
                    disabled={submittingComment || !newComment.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {submittingComment ? '...' : 'Post'}
                  </button>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>Enter to post · Shift+Enter for new line</p>
              </div>

              {/* Activity History */}
              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-base)', color: 'var(--color-text-secondary)' }}>
                  Activity History
                </h4>
                {loadingActivities ? (
                  <p className="text-sm text-tertiary">Loading activity history...</p>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-tertiary">No activity yet</p>
                ) : (
                  <div className="timeline">
                    {activities.map((activity) => {
                      const actUser = allUsers.find(u => u.id === activity.user_id);
                      return (
                        <div className="timeline-item" key={activity.id}>
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <div className="timeline-action">
                              {actUser?.name || 'Unknown'} — {activity.action}
                            </div>
                            {activity.from_status && activity.to_status && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 4 }}>
                                <span className={`badge badge-${activity.from_status.replace('_', '-')}`} style={{ fontSize: '10px' }}>
                                  {TASK_STATUS_CONFIG[activity.from_status]?.label || activity.from_status}
                                </span>
                                <ArrowRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                                <span className={`badge badge-${activity.to_status.replace('_', '-')}`} style={{ fontSize: '10px' }}>
                                  {TASK_STATUS_CONFIG[activity.to_status]?.label || activity.to_status}
                                </span>
                              </div>
                            )}
                            {activity.note && (
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2, fontStyle: 'italic' }}>
                                &quot;{activity.note}&quot;
                              </div>
                            )}
                            <div className="timeline-meta">
                              {new Date(activity.created_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Task Board Page ──
export default function TaskBoardPage() {
  const { user, isAdmin, isLead } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const { isMobile } = useIsMobile();
  const [expandedColumns, setExpandedColumns] = useState<Record<TaskStatus, boolean>>({
    todo: true,
    in_progress: true,
    review: false,
    done: false,
    blocked: false,
  });

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedUsers, fetchedTeams] = await Promise.all([
        getTasks(),
        getUsers(),
        getTeams(),
      ]);
      setTasks(fetchedTasks);
      setAllUsers(fetchedUsers);
      setAllTeams(fetchedTeams);
    } catch (err) {
      console.error('Error loading tasks board data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);

    // Setup realtime subscriptions
    const tasksChannel = subscribeToTable({
      table: 'tasks',
      callback: () => loadData(),
    });
    const profilesChannel = subscribeToTable({
      table: 'profiles',
      callback: () => loadData(),
    });

    return () => {
      unsubscribe(tasksChannel);
      unsubscribe(profilesChannel);
    };
  }, [loadData]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="skeleton-pulse" style={{ height: 40, width: 300, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }} />
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <div key={col} className="kanban-column skeleton-pulse" style={{ height: 500, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Filter tasks
  let filteredTasks = tasks;
  if (filterTeam !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.team_id === filterTeam);
  }
  if (filterAssignee !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === filterAssignee);
  }
  // Role-based filtering for interns
  if (!isAdmin && !isLead) {
    filteredTasks = filteredTasks.filter(t => t.assignee_id === user.id || t.team_id === user.team_id);
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    (e.target as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      try {
        await updateTask(taskId, { status: newStatus });
        await loadData();
      } catch (err) {
        console.error('Error moving task:', err);
      }
    }
    setDragOverColumn(null);
  };

  return (
    <div className="animate-slide-up">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="all">All Teams</option>
            {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="all">All Members</option>
            {allUsers.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        {(isAdmin || isLead) && (
          <button className="btn btn-accent" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Task
          </button>
        )}
      </div>

      {/* Kanban Board */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {COLUMNS.map((status) => {
            const columnTasks = filteredTasks.filter(t => t.status === status);
            const config = TASK_STATUS_CONFIG[status];
            const isExpanded = expandedColumns[status];
            return (
              <div 
                key={status} 
                style={{ 
                  background: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setExpandedColumns(prev => ({ ...prev, [status]: !prev[status] }))}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <div className="kanban-column-dot" style={{ background: config.color, width: 8, height: 8, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>
                      {config.label}
                    </span>
                    <span className="kanban-column-count" style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-bg)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      marginLeft: 'var(--spacing-sm)'
                    }}>{columnTasks.length}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />}
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg) var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        allUsers={allUsers}
                        onClick={() => setSelectedTask(task)}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        isMobile={true}
                        onStatusChange={async (taskId, newStatus) => {
                          try {
                            await updateTask(taskId, { status: newStatus });
                            await loadData();
                          } catch (err) {
                            console.error('Error updating status:', err);
                          }
                        }}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div style={{
                        padding: 'var(--spacing-lg)',
                        textAlign: 'center',
                        color: 'var(--color-text-tertiary)',
                        fontSize: 'var(--font-size-sm)',
                        border: '1px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        No tasks in this stage
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((status) => {
            const columnTasks = filteredTasks.filter(t => t.status === status);
            const config = TASK_STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={`kanban-column ${dragOverColumn === status ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <div className="kanban-column-dot" style={{ background: config.color }} />
                    {config.label}
                  </div>
                  <div className="kanban-column-count">{columnTasks.length}</div>
                </div>
                <div className="kanban-cards">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      allUsers={allUsers}
                      onClick={() => setSelectedTask(task)}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onAssign={(e) => { e.stopPropagation(); setAssignTask(task); }}
                      canAssign={isAdmin || isLead}
                      isMobile={false}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div style={{
                      padding: 'var(--spacing-2xl) var(--spacing-base)',
                      textAlign: 'center',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-sm)',
                      border: '2px dashed var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      {assignTask && (
        <AssignTaskModal
          task={assignTask}
          allUsers={allUsers}
          allTeams={allTeams}
          onClose={() => setAssignTask(null)}
          onAssigned={loadData}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          allUsers={allUsers}
          allTeams={allTeams}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          allUsers={allUsers}
          onClose={() => setSelectedTask(null)}
          onUpdated={async () => {
            await loadData();
            // Refresh the selected task
            const updated = tasks.find(t => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
            else setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
