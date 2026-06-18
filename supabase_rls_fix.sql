-- SQL SCRIPT FOR SUPABASE SQL EDITOR
-- Run this script to secure permissions (RLS) on your Supabase database.

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_statistics ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to ensure idempotency
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

DROP POLICY IF EXISTS "Allow authenticated to view profiles" ON users;
DROP POLICY IF EXISTS "Allow users to manage their own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated to view game states" ON game_states;
DROP POLICY IF EXISTS "Allow users to manage their own game state" ON game_states;
DROP POLICY IF EXISTS "Allow authenticated read clans" ON clans;
DROP POLICY IF EXISTS "Allow authenticated create clans" ON clans;
DROP POLICY IF EXISTS "Allow leaders and admins to modify clans" ON clans;
DROP POLICY IF EXISTS "Allow leaders and admins to delete clans" ON clans;
DROP POLICY IF EXISTS "Allow authenticated to view pets" ON pets;
DROP POLICY IF EXISTS "Allow users to manage their own pets" ON pets;
DROP POLICY IF EXISTS "Allow users to manage their own statistics" ON math_statistics;

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
  USING (auth.uid()::text = id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid()::text = id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: game_states
-- Users can view all game states (necessary for leaderboards)
CREATE POLICY "Allow authenticated to view game states" ON game_states
  FOR SELECT TO authenticated USING (true);

-- Users can only modify their own game state
CREATE POLICY "Allow users to manage their own game state" ON game_states
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: clans
-- Clan details are public to all authenticated users
CREATE POLICY "Allow authenticated read clans" ON clans
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can create clans
CREATE POLICY "Allow authenticated create clans" ON clans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() is not null);

-- Only the leader of the clan or an admin can modify/delete the clan details
CREATE POLICY "Allow leaders and admins to modify clans" ON clans
  FOR UPDATE TO authenticated 
  USING (auth.uid()::text = leader_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid()::text = leader_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Allow leaders and admins to delete clans" ON clans
  FOR DELETE TO authenticated 
  USING (auth.uid()::text = leader_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: pets
-- Users can view all pets (for sanctums of other users)
CREATE POLICY "Allow authenticated to view pets" ON pets
  FOR SELECT TO authenticated USING (true);

-- Users can only modify their own pets
CREATE POLICY "Allow users to manage their own pets" ON pets
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Table: math_statistics
-- Users can only read/write their own statistics
CREATE POLICY "Allow users to manage their own statistics" ON math_statistics
  FOR ALL TO authenticated 
  USING (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (auth.uid()::text = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 4. Enable RLS enforcement
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE game_states FORCE ROW LEVEL SECURITY;
ALTER TABLE clans FORCE ROW LEVEL SECURITY;
ALTER TABLE pets FORCE ROW LEVEL SECURITY;
ALTER TABLE math_statistics FORCE ROW LEVEL SECURITY;

-- 5. Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
