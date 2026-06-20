// ============================================================
// Turn2Law Intern Tracker — Structured Logger
// Logs to console with severity levels
// ============================================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  action: string;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

function sanitize(value: string): string {
  return value.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.level.toUpperCase()}]`,
    `[${entry.timestamp}]`,
    sanitize(entry.action),
  ];

  if (entry.userId) parts.push(`user=${sanitize(entry.userId)}`);
  if (entry.entityType) parts.push(`${sanitize(entry.entityType)}=${entry.entityId ? sanitize(entry.entityId) : 'unknown'}`);
  if (entry.metadata) parts.push(JSON.stringify(entry.metadata));

  return parts.join(' ');
}

class Logger {
  private log(level: LogLevel, action: string, details?: {
    userId?: string | null;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const entry: LogEntry = {
      level,
      action,
      userId: details?.userId,
      entityType: details?.entityType,
      entityId: details?.entityId,
      metadata: details?.metadata,
      timestamp: new Date().toISOString(),
    };

    const message = formatLog(entry);

    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(message);
        }
        break;
      default:
        console.log(message);
    }

    return entry;
  }

  // ── Auth Events ──
  loginAttempt(email: string, success: boolean, userId?: string) {
    this.log(success ? 'info' : 'warn', `Login ${success ? 'successful' : 'failed'}`, {
      userId,
      metadata: { email: sanitize(email), success },
    });
  }

  logout(userId: string) {
    this.log('info', 'User logged out', { userId });
  }

  passwordReset(userId: string) {
    this.log('info', 'Password reset completed', { userId });
  }

  // ── Task Events ──
  taskCreated(taskId: string, userId: string, title: string) {
    this.log('info', 'Task created', {
      userId,
      entityType: 'task',
      entityId: taskId,
      metadata: { title },
    });
  }

  taskUpdated(taskId: string, userId: string, changes: Record<string, unknown>) {
    this.log('info', 'Task updated', {
      userId,
      entityType: 'task',
      entityId: taskId,
      metadata: changes,
    });
  }

  taskDeleted(taskId: string, userId: string) {
    this.log('info', 'Task deleted', {
      userId,
      entityType: 'task',
      entityId: taskId,
    });
  }

  taskStatusChanged(taskId: string, userId: string, from: string, to: string) {
    this.log('info', 'Task status changed', {
      userId,
      entityType: 'task',
      entityId: taskId,
      metadata: { from, to },
    });
  }

  // ── Admin Events ──
  userCreated(newUserId: string, adminId: string, email: string, role: string) {
    this.log('info', 'User created by admin', {
      userId: adminId,
      entityType: 'user',
      entityId: newUserId,
      metadata: { email, role },
    });
  }

  userDeactivated(targetUserId: string, adminId: string) {
    this.log('warn', 'User deactivated by admin', {
      userId: adminId,
      entityType: 'user',
      entityId: targetUserId,
    });
  }

  userPermanentlyDeleted(targetUserId: string, adminId: string, email: string, name: string) {
    this.log('warn', 'User permanently deleted by admin', {
      userId: adminId,
      entityType: 'user',
      entityId: targetUserId,
      metadata: { email, name },
    });
  }

  forcePasswordReset(targetUserId: string, adminId: string) {
    this.log('info', 'Force password reset by admin', {
      userId: adminId,
      entityType: 'user',
      entityId: targetUserId,
    });
  }

  // ── Standup Events ──
  standupSubmitted(standupId: string, userId: string) {
    this.log('info', 'Standup submitted', {
      userId,
      entityType: 'standup',
      entityId: standupId,
    });
  }

  // ── Error Events ──
  apiError(route: string, error: unknown, userId?: string) {
    this.log('error', `API error in ${route}`, {
      userId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
      },
    });
  }

  // ── Generic ──
  info(action: string, details?: { userId?: string | null; metadata?: Record<string, unknown> }) {
    this.log('info', action, details);
  }

  warn(action: string, details?: { userId?: string | null; metadata?: Record<string, unknown> }) {
    this.log('warn', action, details);
  }

  error(action: string, details?: { userId?: string | null; metadata?: Record<string, unknown> }) {
    this.log('error', action, details);
  }
}

export const logger = new Logger();
