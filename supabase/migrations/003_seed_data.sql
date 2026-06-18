-- ============================================================
-- Turn2Law Intern Tracker — Seed Data
-- Run AFTER 001_schema.sql and 002_rls_policies.sql
-- NOTE: Users must be created via Supabase Auth API first,
-- then profiles are inserted here with matching UUIDs.
-- This file seeds teams, tasks, activity, standups, meetings, attendance.
-- ============================================================

-- ============================================================
-- INSTRUCTIONS FOR SEEDING USERS:
-- ============================================================
-- Users must be created via the Admin API route POST /api/users
-- or via the Supabase dashboard Auth → Users → Add user.
-- After auth users exist, run this script to seed other data.
-- The API route at /api/seed handles the full seeding process.
-- ============================================================

-- ── Teams ──
-- These will be inserted first; tasks reference them
INSERT INTO teams (id, name, lead_id, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tracker Squad', NULL, 'Building the Intern Tracker system'),
  ('00000000-0000-0000-0000-000000000002', 'LawGPT Squad', NULL, 'Building the LawGPT AI assistant'),
  ('00000000-0000-0000-0000-000000000003', 'DocGen Squad', NULL, 'Document generation pipeline')
ON CONFLICT (id) DO NOTHING;

-- NOTE: After users are created via the auth API,
-- run the /api/seed endpoint to:
-- 1. Create auth users (admin, leads, interns)
-- 2. Insert profile rows
-- 3. Update team lead_id references
-- 4. Insert sample tasks, standups, meetings, attendance
