-- SQL SCRIPT FOR SUPABASE SQL EDITOR
-- Run this script to secure permissions (RLS) on your Supabase database.

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_statistics ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing open policies if any
DROP POLICY IF EXISTS "Allow anon read/write users" ON users;
DROP POLICY IF EXISTS "Allow anon read/write game_states" ON game_states;
DROP POLICY IF EXISTS "Allow anon read/write clans" ON clans;
DROP POLICY IF EXISTS "Allow anon read/write pets" ON pets;
DROP POLICY IF EXISTS "Allow anon read/write math_statistics" ON math_statistics;

DROP POLICY IF EXISTS "Allow authenticated read/write users" ON users;
DROP POLICY IF EXISTS "Allow authenticated read/write game_states" ON game_states;
DROP POLICY IF EXISTS "Allow authenticated read/write clans" ON clans;
DROP POLICY IF EXISTS "Allow authenticated read/write pets" ON pets;
DROP POLICY IF EXISTS "Allow authenticated read/write math_statistics" ON math_statistics;

-- 3. Create secure policies for Authenticated Users

-- Helper: Check if current JWT contains admin role metadata
-- (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')

-- Table: users (profile records)
-- Users can view all profiles (necessary for leaderboards/clans lists)
CREATE POLICY "Allow authenticated to view profiles" ON users
  FOR SELECT TO authenticated USING (true);

-- Users can only modify their own profile
CREATE POLICY "Allow users to manage their own profile" ON users
  FOR ALL TO authenticated 
  USING (auth.uid() = id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid() = id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: game_states
-- Users can view all game states (necessary for leaderboards)
CREATE POLICY "Allow authenticated to view game states" ON game_states
  FOR SELECT TO authenticated USING (true);

-- Users can only modify their own game state
CREATE POLICY "Allow users to manage their own game state" ON game_states
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: clans
-- Clan details are public to all authenticated users
CREATE POLICY "Allow authenticated read clans" ON clans
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can modify clans (creation/edits)
CREATE POLICY "Allow authenticated write clans" ON clans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table: pets
-- Users can view all pets (for sanctums of other users)
CREATE POLICY "Allow authenticated to view pets" ON pets
  FOR SELECT TO authenticated USING (true);

-- Users can only modify their own pets
CREATE POLICY "Allow users to manage their own pets" ON pets
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: math_statistics
-- Users can only read/write their own statistics
CREATE POLICY "Allow users to manage their own statistics" ON math_statistics
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 4. Enable RLS enforcement
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE game_states FORCE ROW LEVEL SECURITY;
ALTER TABLE clans FORCE ROW LEVEL SECURITY;
ALTER TABLE pets FORCE ROW LEVEL SECURITY;
ALTER TABLE math_statistics FORCE ROW LEVEL SECURITY;
