// ============================================================
// Turn2Law Intern Tracker — Error Handler
// ============================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Wrap API route handler errors into a structured JSON response
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    const status = (error as { status?: number }).status || 500;
    return Response.json(
      { error: error.message, code: 'INTERNAL_ERROR' },
      { status }
    );
  }

  return Response.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  );
}

/**
 * Parse Supabase error into user-friendly message
 */
export function parseSupabaseError(error: { message?: string; code?: string; details?: string }): string {
  const code = error.code || '';
  const message = error.message || 'Unknown error';

  // Auth errors
  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (code === 'user_not_found') {
    return 'No account found with this email';
  }
  if (code === 'email_not_confirmed') {
    return 'Please confirm your email address';
  }
  if (message.includes('User already registered')) {
    return 'A user with this email already exists';
  }

  // RLS errors
  if (code === '42501' || message.includes('policy')) {
    return 'You do not have permission to perform this action';
  }

  // Unique constraint
  if (code === '23505') {
    if (message.includes('standups')) {
      return 'You have already submitted a standup for today';
    }
    if (message.includes('attendance')) {
      return 'Attendance already marked for this meeting';
    }
    if (message.includes('email')) {
      return 'A user with this email already exists';
    }
    return 'This record already exists';
  }

  // Foreign key
  if (code === '23503') {
    return 'Referenced record not found';
  }

  // Generic
  if (process.env.NODE_ENV === 'production') {
    return 'Something went wrong. Please try again.';
  }

  return message;
}
