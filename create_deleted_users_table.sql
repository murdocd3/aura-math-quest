-- SQL MIGRATION: CREATE DELETED_USERS TABLE
-- Execute this SQL query in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS deleted_users (
  user_id TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) so anybody can read it or admins can write it
ALTER TABLE deleted_users ENABLE ROW LEVEL SECURITY;

-- Create Policy to allow read access for authenticated users (or anon if needed)
CREATE POLICY "Allow public read access to deleted_users" ON deleted_users
  FOR SELECT USING (true);

-- Create Policy to allow write access for admin users
CREATE POLICY "Allow insert/update for admins" ON deleted_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
