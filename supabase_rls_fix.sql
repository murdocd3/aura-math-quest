-- SQL SCRIPT FOR SUPABASE SQL EDITOR
-- Run this script to fix permissions (RLS) on your Supabase production database

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_statistics ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Allow anon read/write users" ON users;
DROP POLICY IF EXISTS "Allow anon read/write game_states" ON game_states;
DROP POLICY IF EXISTS "Allow anon read/write clans" ON clans;
DROP POLICY IF EXISTS "Allow anon read/write pets" ON pets;
DROP POLICY IF EXISTS "Allow anon read/write math_statistics" ON math_statistics;

-- 3. Create public/anonymous policies (using 'anon' role)
-- This allows the front-end game client to read and write without needing Supabase Auth registration.

-- Table: users
CREATE POLICY "Allow anon read/write users" ON users 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Table: game_states
CREATE POLICY "Allow anon read/write game_states" ON game_states 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Table: clans
CREATE POLICY "Allow anon read/write clans" ON clans 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Table: pets
CREATE POLICY "Allow anon read/write pets" ON pets 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Table: math_statistics
CREATE POLICY "Allow anon read/write math_statistics" ON math_statistics 
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Enable all operations for service role as well (just in case)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE game_states FORCE ROW LEVEL SECURITY;
ALTER TABLE clans FORCE ROW LEVEL SECURITY;
ALTER TABLE pets FORCE ROW LEVEL SECURITY;
ALTER TABLE math_statistics FORCE ROW LEVEL SECURITY;
