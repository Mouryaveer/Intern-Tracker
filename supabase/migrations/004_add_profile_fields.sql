-- ============================================================
-- Turn2Law Intern Tracker — Add Profile Fields
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;
