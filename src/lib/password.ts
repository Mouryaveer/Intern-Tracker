// ============================================================
// Turn2Law Intern Tracker — Password Hashing Utility
// ============================================================
// Simple synchronous hash for localStorage-based auth.
// NOT production-grade — use Supabase Auth / bcrypt for production.
// This prevents plain-text password storage in localStorage.

const SALT = 'turn2law-intern-tracker-2026';

/**
 * Hash a password using a simple djb2-based hash with salt.
 * Returns a hex-like string that is NOT reversible.
 */
export function hashPassword(password: string): string {
  const salted = SALT + password + SALT;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return 'h$' + hash.toString(36) + '$' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

/**
 * Verify a password against a stored hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  // Support legacy plain-text passwords (for migration)
  if (!storedHash.startsWith('h$')) {
    return password === storedHash;
  }
  return hashPassword(password) === storedHash;
}
