// ============================================================
// Turn2Law Intern Tracker — Input Validation
// Server-side validation for all data operations
// ============================================================

// ── Sanitization ──

/**
 * Strip dangerous content from text inputs.
 * Removes script tags, event handlers, and trims whitespace.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|select|textarea)\b[^>]*>/gi, '')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  if (!date) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validate ISO datetime string
 */
export function isValidDateTime(dt: string): boolean {
  if (!dt) return false;
  const parsed = new Date(dt);
  return !isNaN(parsed.getTime());
}

// ── Task Validation ──

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTaskInput(data: Record<string, unknown>): TaskValidationResult {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 500) {
    errors.push('Title must be less than 500 characters');
  }

  if (data.status && !['todo', 'in_progress', 'review', 'done', 'blocked'].includes(data.status as string)) {
    errors.push('Invalid task status');
  }

  if (data.priority && !['low', 'medium', 'high'].includes(data.priority as string)) {
    errors.push('Invalid priority');
  }

  if (data.due_date && typeof data.due_date === 'string' && data.due_date.length > 0) {
    if (!isValidDate(data.due_date)) {
      errors.push('Invalid due date format (expected YYYY-MM-DD)');
    }
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
    errors.push('Description must be less than 10,000 characters');
  }

  return { valid: errors.length === 0, errors };
}

// ── Standup Validation ──

export function validateStandupInput(data: Record<string, unknown>): TaskValidationResult {
  const errors: string[] = [];

  if (!data.did_yesterday || typeof data.did_yesterday !== 'string' || data.did_yesterday.trim().length === 0) {
    errors.push('\"What did you do yesterday\" is required');
  }

  if (!data.doing_today || typeof data.doing_today !== 'string' || data.doing_today.trim().length === 0) {
    errors.push('\"What are you doing today\" is required');
  }

  if (data.did_yesterday && typeof data.did_yesterday === 'string' && data.did_yesterday.length > 5000) {
    errors.push('Yesterday field must be less than 5,000 characters');
  }

  if (data.doing_today && typeof data.doing_today === 'string' && data.doing_today.length > 5000) {
    errors.push('Today field must be less than 5,000 characters');
  }

  return { valid: errors.length === 0, errors };
}

// ── User Validation ──

export function validateUserInput(data: Record<string, unknown>, isUpdate = false): TaskValidationResult {
  const errors: string[] = [];

  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.role || !['admin', 'lead', 'intern'].includes(data.role as string)) {
      errors.push('Valid role is required (admin, lead, intern)');
    }
  } else {
    if (data.email && typeof data.email === 'string' && !isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.role && !['admin', 'lead', 'intern'].includes(data.role as string)) {
      errors.push('Invalid role');
    }
  }

  if (data.name && typeof data.name === 'string' && data.name.length > 200) {
    errors.push('Name must be less than 200 characters');
  }

  return { valid: errors.length === 0, errors };
}

// ── Meeting Validation ──

export function validateMeetingInput(data: Record<string, unknown>): TaskValidationResult {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Meeting title is required');
  }

  if (!data.scheduled_at || typeof data.scheduled_at !== 'string') {
    errors.push('Scheduled date/time is required');
  } else if (!isValidDateTime(data.scheduled_at)) {
    errors.push('Invalid date/time format');
  }

  return { valid: errors.length === 0, errors };
}

// ── Attendance Validation ──

export function validateAttendanceStatus(status: string): boolean {
  return ['present', 'absent', 'late', 'excused'].includes(status);
}
