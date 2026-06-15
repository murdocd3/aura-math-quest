-- SQL MIGRATION: ADD OLYMPIC MEDALS TO GAME_STATES
-- Execute this SQL query in your Supabase SQL Editor:

ALTER TABLE game_states ADD COLUMN IF NOT EXISTS olympic_medals JSONB DEFAULT '{}'::jsonb;
